import EnrollmentsDao from "../Enrollments/dao";
import CoursesDao from "./dao";
export default function CourseRoutes(app) {
  const dao = CoursesDao();
  const enrollDao = EnrollmentsDao();
  const findAllCourses = async (req, res) => {
    res.json(await dao.findAllCourses());
  };
  const findCoursesForEnrolledUser = async (req, res) => {
    let { userId } = req.params;
    if (userId === "current") {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }
      userId = currentUser._id;
    }
    res.json(await dao.findCoursesForEnrolledUser(userId));
  };
  const createCourse = async (req, res) => {
    const currentUser = req.session["currentUser"];
    // Check before creating, so a signed-out request can't leave behind a
    // course that nobody is enrolled in.
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    const newCourse = await dao.createCourse(req.body);
    await enrollDao.enrollUserInCourse(currentUser._id, newCourse._id);
    res.json(newCourse);
  };
  const deleteCourse = async (req, res) => {
    await dao.deleteCourse(req.params.courseId);
    res.sendStatus(200);
  };
  const updateCourse = async (req, res) => {
    const course = await dao.updateCourse(req.params.courseId, req.body);
    if (!course) {
      res.sendStatus(404);
      return;
    }
    res.json(course);
  };
  app.post("/api/users/current/courses", createCourse);
  app.get("/api/courses", findAllCourses);
  app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);
  app.delete("/api/courses/:courseId", deleteCourse);
  app.put("/api/courses/:courseId", updateCourse);
}
