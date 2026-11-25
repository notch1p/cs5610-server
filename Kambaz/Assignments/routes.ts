import AssignmentsDao from "./dao";

export default function AssignmentRoutes(app) {
  const dao = AssignmentsDao();
  const findAssignmentsForCourse = async (req, res) => {
    res.json(await dao.findAssignmentsForCourse(req.params.courseId));
  };
  const createAssignmentForCourse = async (req, res) => {
    const assignment = { ...req.body, course: req.params.courseId };
    res.json(await dao.createAssignment(assignment));
  };
  const deleteAssignment = async (req, res) => {
    await dao.deleteAssignment(req.params.assignmentId);
    res.sendStatus(200);
  };
  const updateAssignment = async (req, res) => {
    const assignment = await dao.updateAssignment(
      req.params.assignmentId,
      req.body,
    );
    if (!assignment) {
      res.sendStatus(404);
      return;
    }
    res.json(assignment);
  };
  app.get("/api/courses/:courseId/assignments", findAssignmentsForCourse);
  app.post("/api/courses/:courseId/assignments", createAssignmentForCourse);
  app.delete("/api/assignments/:assignmentId", deleteAssignment);
  app.put("/api/assignments/:assignmentId", updateAssignment);
}
