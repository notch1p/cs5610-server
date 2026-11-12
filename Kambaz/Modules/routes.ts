import type { Database } from "../Database";
import ModulesDao from "./dao";

export default function ModuleRoutes(app, db: Database) {
  const dao = ModulesDao(db);
  const findModulesForCourse = (req, res) => {
    res.json(dao.findModulesForCourse(req.params.courseId));
  };
  const createModuleForCourse = (req, res) => {
    const module = { ...req.body, course: req.params.courseId };
    res.json(dao.createModule(module));
  };
  const deleteModule = (req, res) => {
    dao.deleteModule(req.params.moduleId);
    res.sendStatus(200);
  };
  const updateModule = (req, res) => {
    res.json(dao.updateModule(req.params.moduleId, req.body));
  };
  app.get("/api/courses/:courseId/modules", findModulesForCourse);
  app.post("/api/courses/:courseId/modules", createModuleForCourse);
  app.delete("/api/modules/:moduleId", deleteModule);
  app.put("/api/modules/:moduleId", updateModule);
}
