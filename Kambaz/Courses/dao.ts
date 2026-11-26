import { v4 as uuidv4 } from "uuid";
import model from "./model";
import enrollmentModel from "../Enrollments/model";
import quizModel from "../Quizzes/model";
import quizAttemptModel from "../QuizAttempts/model";
export default function CoursesDao() {
  function findAllCourses() {
    return model.find();
  }
  async function findCoursesForEnrolledUser(userId) {
    const courseIds = await enrollmentModel.distinct("course", {
      user: userId,
    });
    return model.find({ _id: { $in: courseIds } });
  }
  function createCourse(course) {
    const newCourse = { ...course, _id: uuidv4() };
    return model.create(newCourse);
  }
  async function deleteCourse(courseId) {
    await model.deleteOne({ _id: courseId });
    const quizIds = await quizModel.distinct("_id", { course: courseId });
    await quizAttemptModel.deleteMany({ quiz: { $in: quizIds } });
    await quizModel.deleteMany({ course: courseId });
    return enrollmentModel.deleteMany({ course: courseId });
  }
  // Resolves to the updated course, or null if there is no such course.
  function updateCourse(courseId, courseUpdates) {
    return model.findByIdAndUpdate(
      courseId,
      { $set: courseUpdates },
      { returnDocument: "after" },
    );
  }
  return {
    findAllCourses,
    findCoursesForEnrolledUser,
    createCourse,
    deleteCourse,
    updateCourse,
  };
}
