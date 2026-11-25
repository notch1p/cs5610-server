import { v4 as uuidv4 } from "uuid";
import model from "./model";

export default function EnrollmentsDao() {
  function enrollUserInCourse(userId, courseId) {
    return model.create({ _id: uuidv4(), user: userId, course: courseId });
  }
  function unenrollUserFromCourse(userId, courseId) {
    return model.deleteMany({ user: userId, course: courseId });
  }
  return { enrollUserInCourse, unenrollUserFromCourse };
}
