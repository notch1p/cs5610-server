import { v4 as uuidv4 } from "uuid";
import model from "./model";
export default function AssignmentsDao() {
  function findAssignmentsForCourse(courseId) {
    return model.find({ course: courseId });
  }
  function createAssignment(assignment) {
    const newAssignment = { ...assignment, _id: uuidv4() };
    return model.create(newAssignment);
  }
  function deleteAssignment(assignmentId) {
    return model.deleteOne({ _id: assignmentId });
  }
  // Resolves to the updated assignment, or null if there is no such assignment.
  function updateAssignment(assignmentId, assignmentUpdates) {
    return model.findByIdAndUpdate(
      assignmentId,
      { $set: assignmentUpdates },
      { returnDocument: "after" },
    );
  }
  return {
    findAssignmentsForCourse,
    createAssignment,
    deleteAssignment,
    updateAssignment,
  };
}
