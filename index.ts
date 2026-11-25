import express from "express";
import Hello from "./Hello";
import Lab5 from "./Lab5/index";
import cors from "cors";
import UserRoutes from "./Kambaz/Users/routes";
import "dotenv/config";
import session from "express-session";
import CourseRoutes from "./Kambaz/Courses/routes";
import EnrollmentRoutes from "./Kambaz/Enrollments/routes";
import ModuleRoutes from "./Kambaz/Modules/routes";
import AssignmentRoutes from "./Kambaz/Assignments/routes";
import mongoose from "mongoose";

const CLIENT_URL = process.env.CLIENT_URL?.split(/\s*,\s*/);
const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI, { dbName: "kambaz" });

const app = express();
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
UserRoutes(app);
CourseRoutes(app);
EnrollmentRoutes(app);
ModuleRoutes(app);
AssignmentRoutes(app);
app.listen(process.env.PORT || 4000);
