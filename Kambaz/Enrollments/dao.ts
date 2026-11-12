import type { Database } from "../Database";
import { v4 as uuidv4 } from "uuid";

export default function EnrollmentsDao(db: Database) {
  function enrollUserInCourse(userId, courseId) {
    const { enrollments } = db;
    enrollments.push({ _id: uuidv4(), user: userId, course: courseId });
  }
  function unenrollUserFromCourse(userId, courseId) {
    db.enrollments = db.enrollments.filter(
      (enrollment) =>
        !(enrollment.user === userId && enrollment.course === courseId),
    );
  }
  return { enrollUserInCourse, unenrollUserFromCourse };
}
