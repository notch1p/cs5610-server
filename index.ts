import express from "express";
import Hello from "./Hello";
import Lab5 from "./Lab5/index";
import cors from "cors";
import UserRoutes from "./Kambaz/Users/routes";
import db from "./Kambaz/Database/index";
import "dotenv/config";
import session from "express-session";
import CourseRoutes from "./Kambaz/Courses/routes";
import EnrollmentRoutes from "./Kambaz/Enrollments/routes";
import ModuleRoutes from "./Kambaz/Modules/routes";
import AssignmentRoutes from "./Kambaz/Assignments/routes";
const app = express();
const CLIENT_URL = process.env.CLIENT_URL?.split(/\s*,\s*/);
app.use(
  cors({
    credentials: true,
    origin: CLIENT_URL || "http://localhost:3000",
  }),
);
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "kambaz",
  resave: false,
  saveUninitialized: false,
};
if (process.env.SERVER_ENV !== "development") {
  sessionOptions.proxy = true;
  sessionOptions.cookie = {
    sameSite: "none",
    secure: true,
    domain: process.env.SERVER_URL,
  };
}
app.use(session(sessionOptions));
app.use(express.json());
Lab5(app);
Hello(app);
UserRoutes(app, db);
CourseRoutes(app, db);
EnrollmentRoutes(app, db);
ModuleRoutes(app, db);
AssignmentRoutes(app, db);
app.listen(process.env.PORT || 4000);
