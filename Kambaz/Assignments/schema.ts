import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    _id: String,
    title: String,
    course: { type: String, ref: "CourseModel" },
    description: String,
    points: Number,
    // Strings, not Dates: the editor binds these to <input type="date">.
    due: String,
    available: String,
  },
  { collection: "assignments" },
);
export default assignmentSchema;
