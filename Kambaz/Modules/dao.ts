import { v4 as uuidv4 } from "uuid";
import model from "./model";
export default function ModulesDao() {
  function findModulesForCourse(courseId) {
    return model.find({ course: courseId });
  }
  function createModule(module) {
    const newModule = { ...module, _id: uuidv4() };
    return model.create(newModule);
  }
  function deleteModule(moduleId) {
    return model.deleteOne({ _id: moduleId });
  }
  // Resolves to the updated module, or null if there is no such module.
  function updateModule(moduleId, moduleUpdates) {
    return model.findByIdAndUpdate(
      moduleId,
      { $set: moduleUpdates },
      { returnDocument: "after" },
    );
  }
  return { findModulesForCourse, createModule, deleteModule, updateModule };
}
