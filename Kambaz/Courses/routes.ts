import type { Database } from "../Database";
import EnrollmentsDao from "../Enrollments/dao";
import CoursesDao from "./dao";
export default function CourseRoutes(app, db: Database) {
  const dao = CoursesDao(db);
  const enrollDao = EnrollmentsDao(db);
  const findAllCourses = (req, res) => {
    res.json(dao.findAllCourses());
  };
  const findCoursesForEnrolledUser = (req, res) => {
    let { userId } = req.params;
    if (userId === "current") {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }
      userId = currentUser._id;
    }
    res.json(dao.findCoursesForEnrolledUser(userId));
  };
  const createCourse = (req, res) => {
    const currentUser = req.session["currentUser"];
    const newCourse = dao.createCourse(req.body);
    enrollDao.enrollUserInCourse(currentUser._id, newCourse._id);
    res.json(newCourse);
  };
  const deleteCourse = (req, res) => {
    dao.deleteCourse(req.params.courseId);
    res.sendStatus(200);
  };
  const updateCourse = (req, res) => {
    res.json(dao.updateCourse(req.params.courseId, req.body));
  };
  app.post("/api/users/current/courses", createCourse);
  app.get("/api/courses", findAllCourses);
  app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);
  app.delete("/api/courses/:courseId", deleteCourse);
  app.put("/api/courses/:courseId", updateCourse);
}
