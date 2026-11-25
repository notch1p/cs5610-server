import EnrollmentsDao from "./dao";

export default function EnrollmentRoutes(app) {
  const dao = EnrollmentsDao();
  const enrollInCourse = async (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    await dao.enrollUserInCourse(currentUser._id, req.params.courseId);
    res.sendStatus(200);
  };
  const unenrollFromCourse = async (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    await dao.unenrollUserFromCourse(currentUser._id, req.params.courseId);
    res.sendStatus(200);
  };
  app.post("/api/users/current/courses/:courseId", enrollInCourse);
  app.delete("/api/users/current/courses/:courseId", unenrollFromCourse);
}
