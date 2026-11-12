import type { Database } from "../Database";
import AssignmentsDao from "./dao";

export default function AssignmentRoutes(app, db: Database) {
  const dao = AssignmentsDao(db);
  const findAssignmentsForCourse = (req, res) => {
    res.json(dao.findAssignmentsForCourse(req.params.courseId));
  };
  const createAssignmentForCourse = (req, res) => {
    const assignment = { ...req.body, course: req.params.courseId };
    res.json(dao.createAssignment(assignment));
  };
  const deleteAssignment = (req, res) => {
    dao.deleteAssignment(req.params.assignmentId);
    res.sendStatus(200);
  };
  const updateAssignment = (req, res) => {
    res.json(dao.updateAssignment(req.params.assignmentId, req.body));
  };
  app.get("/api/courses/:courseId/assignments", findAssignmentsForCourse);
  app.post("/api/courses/:courseId/assignments", createAssignmentForCourse);
  app.delete("/api/assignments/:assignmentId", deleteAssignment);
  app.put("/api/assignments/:assignmentId", updateAssignment);
}
