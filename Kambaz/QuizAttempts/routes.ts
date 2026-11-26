import QuizAttemptsDao from "./dao";
import { loadQuiz } from "../Quizzes/access";
import {
  attemptsAllowed,
  availability,
  canSeeCorrectAnswers,
  deadline,
  isDropped,
  isExpired,
  questionForReview,
  questionForStudent,
} from "../Quizzes/rules";

const unavailable = {
  NOT_YET: "This quiz isn't available yet.",
  CLOSED: "This quiz is closed.",
};

export default function QuizAttemptRoutes(app) {
  const dao = QuizAttemptsDao();
  const userId = (req) => req.session["currentUser"]._id;

  // The quiz in :quizId, if the user is a student in its course. Faculty use
  // Preview rather than taking quizzes.
  const loadQuizForStudent = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return null;
    if (found.role !== "STUDENT") {
      res.status(403).json({ message: "Faculty preview quizzes instead." });
      return null;
    }
    return found.quiz;
  };
  // The student's attempts at the quiz, oldest first, after submitting any
  // whose time ran out.
  const myAttempts = async (req, quiz, at) => {
    const attempts = await dao.findAttemptsForUser(quiz._id, userId(req));
    for (const attempt of attempts) await dao.finishIfExpired(attempt, quiz, at);
    return attempts;
  };
  const attemptsUsed = (attempts, quiz) =>
    attempts.filter((attempt) => !isDropped(attempt, quiz)).length;
  // :attemptId, if it's this student's in-progress attempt at this quiz.
  const loadOpenAttempt = async (req, res, quiz) => {
    const attempt = await dao.findAttemptById(req.params.attemptId);
    if (!attempt || attempt.quiz !== quiz._id || attempt.user !== userId(req)) {
      res.sendStatus(404);
      return null;
    }
    if (attempt.submittedAt) {
      res.status(409).json({ message: "This attempt was already submitted." });
      return null;
    }
    return attempt;
  };

  // An attempt being taken, with its questions minus their answers. Choices
  // are shuffled when the quiz asks for it, freshly on each load.
  const takingView = (attempt, quiz) => ({
    _id: attempt._id,
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt,
    deadline: deadline(attempt, quiz),
    answers: attempt.answers.map(({ question, answer }) => ({ question, answer })),
    questions: quiz
      .toJSON()
      .questions.map((q) => questionForStudent(q, quiz.shuffleAnswers)),
  });
  const summary = (attempt, quiz) => ({
    _id: attempt._id,
    attemptNumber: attempt.attemptNumber,
    score: attempt.score,
    maxScore: attempt.maxScore,
    submittedAt: attempt.submittedAt,
    dropped: isDropped(attempt, quiz),
  });
  // A submitted attempt for review. A dropped attempt shows only its score.
  // Whether each answer was right is always included; the right answers
  // themselves only when showCorrectAnswers allows it.
  const reviewView = (attempt, quiz, used, at) => {
    const base = summary(attempt, quiz);
    if (base.dropped) return base;
    const showAnswers = canSeeCorrectAnswers(quiz, used, at);
    return {
      ...base,
      correctAnswersShown: showAnswers,
      answers: attempt.answers.map(({ question, answer, correct, points }) => ({
        question,
        answer,
        correct,
        points,
      })),
      questions: quiz
        .toJSON()
        .questions.map((q) => questionForReview(q, showAnswers)),
    };
  };

  // What the student's quiz details screen needs.
  const getStatus = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const at = new Date();
    const attempts = await myAttempts(req, quiz, at);
    const inProgress = attempts.find((attempt) => !attempt.submittedAt);
    const last = attempts.filter((attempt) => attempt.submittedAt).at(-1);
    const used = attemptsUsed(attempts, quiz);
    const allowed = attemptsAllowed(quiz);
    const open = availability(quiz, at);
    res.json({
      availability: open,
      attemptsAllowed: allowed,
      attemptsUsed: used,
      canStart: !inProgress && open === "AVAILABLE" && used < allowed,
      inProgress: inProgress
        ? { _id: inProgress._id, deadline: deadline(inProgress, quiz) }
        : null,
      lastAttempt: last ? summary(last, quiz) : null,
    });
  };
  // Starts an attempt, or resumes the one in progress.
  const startAttempt = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const at = new Date();
    const attempts = await myAttempts(req, quiz, at);
    const inProgress = attempts.find((attempt) => !attempt.submittedAt);
    if (inProgress) {
      res.json(takingView(inProgress, quiz));
      return;
    }
    const open = availability(quiz, at);
    if (open !== "AVAILABLE") {
      res.status(403).json({ message: unavailable[open] });
      return;
    }
    if (attemptsUsed(attempts, quiz) >= attemptsAllowed(quiz)) {
      res.status(403).json({ message: "No attempts left." });
      return;
    }
    if (quiz.accessCode && req.body?.accessCode !== quiz.accessCode) {
      res.status(403).json({ message: "Wrong access code." });
      return;
    }
    const attemptNumber = (attempts.at(-1)?.attemptNumber ?? 0) + 1;
    try {
      const attempt = await dao.createAttempt(quiz, userId(req), attemptNumber);
      res.json(takingView(attempt, quiz));
    } catch (e) {
      // Two starts at once: the unique index lets only one through.
      if (e.code !== 11000) throw e;
      res.status(409).json({ message: "An attempt was just started. Reload." });
    }
  };
  // The attempt in progress, e.g. after a reload. 404 when there's none.
  const getCurrentAttempt = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const attempts = await myAttempts(req, quiz, new Date());
    const inProgress = attempts.find((attempt) => !attempt.submittedAt);
    if (!inProgress) {
      res.sendStatus(404);
      return;
    }
    res.json(takingView(inProgress, quiz));
  };
  // Saves answers as the student goes. Body: { answers: [{ question, answer }] }.
  const saveAnswers = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const attempt = await loadOpenAttempt(req, res, quiz);
    if (!attempt) return;
    if (isExpired(attempt, quiz, new Date())) {
      await dao.submitAttempt(attempt, quiz, deadline(attempt, quiz));
      res.status(409).json({ message: "Time's up. The attempt was submitted." });
      return;
    }
    await dao.saveAnswers(attempt, quiz, req.body?.answers);
    res.json({
      answers: attempt.answers.map(({ question, answer }) => ({
        question,
        answer,
      })),
      deadline: deadline(attempt, quiz),
    });
  };
  // Submits and grades. Answers sent along still count within the grace
  // period after the deadline; after that only the saved ones do.
  const submitAttempt = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const attempt = await loadOpenAttempt(req, res, quiz);
    if (!attempt) return;
    const at = new Date();
    if (isExpired(attempt, quiz, at)) {
      await dao.submitAttempt(attempt, quiz, deadline(attempt, quiz));
    } else {
      await dao.submitAttempt(attempt, quiz, at, req.body?.answers);
    }
    const attempts = await dao.findAttemptsForUser(quiz._id, userId(req));
    res.json(reviewView(attempt, quiz, attemptsUsed(attempts, quiz), at));
  };
  // The student's last submitted attempt, for review; null when there's none.
  const getLastAttempt = async (req, res) => {
    const quiz = await loadQuizForStudent(req, res);
    if (!quiz) return;
    const at = new Date();
    const attempts = await myAttempts(req, quiz, at);
    const last = attempts.filter((attempt) => attempt.submittedAt).at(-1);
    res.json(
      last ? reviewView(last, quiz, attemptsUsed(attempts, quiz), at) : null,
    );
  };
  // Faculty: every student's attempts at the quiz, for grading.
  const findAttemptsForQuiz = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return;
    if (found.role !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    const attempts = await dao.findAttemptsForQuiz(found.quiz._id);
    const at = new Date();
    for (const attempt of attempts) {
      await dao.finishIfExpired(attempt, found.quiz, at);
    }
    res.json(attempts);
  };

  app.get("/api/quizzes/:quizId/attempts", findAttemptsForQuiz);
  app.post("/api/quizzes/:quizId/attempts", startAttempt);
  app.get("/api/quizzes/:quizId/attempts/status", getStatus);
  app.get("/api/quizzes/:quizId/attempts/current", getCurrentAttempt);
  app.get("/api/quizzes/:quizId/attempts/last", getLastAttempt);
  app.put("/api/quizzes/:quizId/attempts/:attemptId/answers", saveAnswers);
  app.post("/api/quizzes/:quizId/attempts/:attemptId/submit", submitAttempt);
}
