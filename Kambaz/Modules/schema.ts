import mongoose from "mongoose";

// Lessons live inside their module. Their ids are strings like "L101", so
// _id is declared here; otherwise Mongoose would expect ObjectIds.
const lessonSchema = new mongoose.Schema({
  _id: String,
  name: String,
  description: String,
  module: String,
});
const moduleSchema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    description: String,
    course: { type: String, ref: "CourseModel" },
    lessons: [lessonSchema],
  },
  { collection: "modules" },
);
export default moduleSchema;
