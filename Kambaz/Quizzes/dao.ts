import { v4 as uuidv4 } from "uuid";
import model from "./model";
import attemptModel from "../QuizAttempts/model";
import { questionsKey } from "./rules";

export default function QuizzesDao() {
  const findQuizzesForCourse = (courseId) => model.find({ course: courseId });
  const findQuizById = (quizId) => model.findById(quizId);
  const createQuiz = (courseId, quiz) =>
    model.create({ ...quiz, _id: uuidv4(), course: courseId, version: 1 });
  // Saves the editor's draft into the quiz document. `version` goes up, which
  // drops earlier attempts, only when the questions actually changed.
  const updateQuiz = (quiz, updates) => {
    const { _id, course, version, __v, ...draft } = updates;
    const before = questionsKey(quiz.toJSON().questions);
    quiz.set(draft);
    if (questionsKey(quiz.toJSON().questions) !== before) quiz.version += 1;
    return quiz.save();
  };
  const deleteQuiz = async (quizId) => {
    await attemptModel.deleteMany({ quiz: quizId });
    return model.deleteOne({ _id: quizId });
  };
  return {
    findQuizzesForCourse,
    findQuizById,
    createQuiz,
    updateQuiz,
    deleteQuiz,
  };
}
