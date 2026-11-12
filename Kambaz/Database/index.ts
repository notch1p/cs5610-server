import courses from "./courses.json";
import modules from "./modules.json";
import assignments from "./assignments.json";
import users from "./users.json";
import enrollments from "./enrollments.json";

export type Database = {
  courses: typeof courses;
  modules: typeof modules;
  assignments: typeof assignments;
  users: typeof users;
  enrollments: typeof enrollments;
};

export default { courses, modules, assignments, users, enrollments };
