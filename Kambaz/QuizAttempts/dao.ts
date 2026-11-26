import { v4 as uuidv4 } from "uuid";
import model from "./model";
import { deadline, isExpired } from "../Quizzes/rules";
import { grade, mergeAnswers } from "../Quizzes/grading";

// The answers saved on an attempt document, as plain objects.
const savedAnswers = (attempt) =>
  attempt.answers
    .map(({ question, answer }) => ({ question, answer }))
    .filter((a) => a.answer !== undefined);

export default function QuizAttemptsDao() {
  const findAttemptById = (attemptId) => model.findById(attemptId);
  // Oldest first, so the last one is the latest attempt.
  const findAttemptsForUser = (quizId, userId) =>
    model.find({ quiz: quizId, user: userId }).sort({ attemptNumber: 1 });
  const findAttemptsForQuiz = (quizId) =>
    model
      .find({ quiz: quizId })
      .sort({ user: 1, attemptNumber: 1 })
      .populate("user", "firstName lastName username");
  const createAttempt = (quiz, userId, attemptNumber) =>
    model.create({
      _id: uuidv4(),
      quiz: quiz._id,
      user: userId,
      attemptNumber,
      quizVersion: quiz.version,
    });
  // Saves answers while the attempt is in progress (see mergeAnswers).
  const saveAnswers = (attempt, quiz, answers) => {
    attempt.set(
      "answers",
      mergeAnswers(quiz.toJSON(), savedAnswers(attempt), answers),
    );
    return attempt.save();
  };
  // Grades the attempt against the quiz's current questions and marks it
  // submitted. `answers`, when given, are applied first.
  const submitAttempt = (attempt, quiz, submittedAt, answers?) => {
    const plainQuiz = quiz.toJSON();
    const saved = savedAnswers(attempt);
    const final = answers ? mergeAnswers(plainQuiz, saved, answers) : saved;
    attempt.set({ ...grade(plainQuiz, final), submittedAt });
    return attempt.save();
  };
  // Submits an in-progress attempt whose time ran out, as of its deadline and
  // with the answers saved by then.
  const finishIfExpired = async (attempt, quiz, at) => {
    if (!attempt.submittedAt && isExpired(attempt, quiz, at)) {
      await submitAttempt(attempt, quiz, deadline(attempt, quiz));
    }
    return attempt;
  };
  return {
    findAttemptById,
    findAttemptsForUser,
    findAttemptsForQuiz,
    createAttempt,
    saveAnswers,
    submitAttempt,
    finishIfExpired,
  };
}
