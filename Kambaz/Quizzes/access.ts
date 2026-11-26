import quizModel from "./model";
import enrollmentModel from "../Enrollments/model";

// The signed-in user's role in a course, for quizzes:
// - "FACULTY": faculty and admins enrolled in it, meaning in charge of it.
// - "STUDENT": anyone else enrolled.
// - null: signed out, or not enrolled.
export async function courseRole(req, courseId) {
  const user = req.session["currentUser"];
  if (!user) return null;
  const enrolled = await enrollmentModel.exists({
    user: user._id,
    course: courseId,
  });
  if (!enrolled) return null;
  return user.role === "FACULTY" || user.role === "ADMIN"
    ? "FACULTY"
    : "STUDENT";
}

// 401 when signed out, 403 when signed in without access.
export const denyAccess = (req, res) =>
  res.sendStatus(req.session["currentUser"] ? 403 : 401);

// Loads the quiz in :quizId and the user's role in its course. Otherwise it
// answers the request itself and resolves to null. For students, an
// unpublished quiz is a 404, as if it didn't exist.
export async function loadQuiz(req, res) {
  const quiz = await quizModel.findById(req.params.quizId);
  const role = quiz ? await courseRole(req, quiz.course) : null;
  if (!quiz || (role === "STUDENT" && !quiz.published)) {
    res.sendStatus(404);
    return null;
  }
  if (!role) {
    denyAccess(req, res);
    return null;
  }
  return { quiz, role };
}
