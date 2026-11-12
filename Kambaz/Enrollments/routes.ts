import type { Database } from "../Database";
import EnrollmentsDao from "./dao";

export default function EnrollmentRoutes(app, db: Database) {
  const dao = EnrollmentsDao(db);
  const enrollInCourse = (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    dao.enrollUserInCourse(currentUser._id, req.params.courseId);
    res.sendStatus(200);
  };
  const unenrollFromCourse = (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    dao.unenrollUserFromCourse(currentUser._id, req.params.courseId);
    res.sendStatus(200);
  };
  app.post("/api/users/current/courses/:courseId", enrollInCourse);
  app.delete("/api/users/current/courses/:courseId", unenrollFromCourse);
}
