import QuizzesDao from "./dao";
import { courseRole, denyAccess, loadQuiz } from "./access";
import { questionForReview, quizForStudent } from "./rules";
import { grade, mergeAnswers } from "./grading";

export default function QuizRoutes(app) {
  const dao = QuizzesDao();

  // Faculty get every quiz in full; students get published quizzes, without
  // questions or access codes.
  const findQuizzesForCourse = async (req, res) => {
    const { courseId } = req.params;
    const role = await courseRole(req, courseId);
    if (!role) {
      denyAccess(req, res);
      return;
    }
    const quizzes = await dao.findQuizzesForCourse(courseId);
    res.json(
      role === "FACULTY"
        ? quizzes
        : quizzes
            .filter((quiz) => quiz.published)
            .map((quiz) => quizForStudent(quiz.toJSON())),
    );
  };
  const createQuiz = async (req, res) => {
    const { courseId } = req.params;
    if ((await courseRole(req, courseId)) !== "FACULTY") {
      denyAccess(req, res);
      return;
    }
    res.json(await dao.createQuiz(courseId, req.body ?? {}));
  };
  const findQuizById = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return;
    const { quiz, role } = found;
    res.json(role === "FACULTY" ? quiz : quizForStudent(quiz.toJSON()));
  };
  // Saves the editor's whole draft: details and questions together.
  const updateQuiz = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return;
    if (found.role !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    try {
      res.json(await dao.updateQuiz(found.quiz, req.body ?? {}));
    } catch (e) {
      if (e.name !== "ValidationError") throw e;
      res.status(400).json({ message: e.message });
    }
  };
  const deleteQuiz = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return;
    if (found.role !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    await dao.deleteQuiz(found.quiz._id);
    res.sendStatus(200);
  };
  // Faculty preview: grades answers like a real attempt, but saves nothing.
  const previewQuiz = async (req, res) => {
    const found = await loadQuiz(req, res);
    if (!found) return;
    if (found.role !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    const quiz = found.quiz.toJSON();
    const answers = mergeAnswers(
      { ...quiz, lockQuestionsAfterAnswering: false },
      [],
      req.body?.answers,
    );
    res.json({
      ...grade(quiz, answers),
      questions: quiz.questions.map((q) => questionForReview(q, true)),
    });
  };
  app.get("/api/courses/:courseId/quizzes", findQuizzesForCourse);
  app.post("/api/courses/:courseId/quizzes", createQuiz);
  app.get("/api/quizzes/:quizId", findQuizById);
  app.put("/api/quizzes/:quizId", updateQuiz);
  app.delete("/api/quizzes/:quizId", deleteQuiz);
  app.post("/api/quizzes/:quizId/preview", previewQuiz);
}
