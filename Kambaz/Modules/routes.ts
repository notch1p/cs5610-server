import ModulesDao from "./dao";

export default function ModuleRoutes(app) {
  const dao = ModulesDao();
  const findModulesForCourse = async (req, res) => {
    res.json(await dao.findModulesForCourse(req.params.courseId));
  };
  const createModuleForCourse = async (req, res) => {
    const module = { ...req.body, course: req.params.courseId };
    res.json(await dao.createModule(module));
  };
  const deleteModule = async (req, res) => {
    await dao.deleteModule(req.params.moduleId);
    res.sendStatus(200);
  };
  const updateModule = async (req, res) => {
    const module = await dao.updateModule(req.params.moduleId, req.body);
    if (!module) {
      res.sendStatus(404);
      return;
    }
    res.json(module);
  };
  app.get("/api/courses/:courseId/modules", findModulesForCourse);
  app.post("/api/courses/:courseId/modules", createModuleForCourse);
  app.delete("/api/modules/:moduleId", deleteModule);
  app.put("/api/modules/:moduleId", updateModule);
}
