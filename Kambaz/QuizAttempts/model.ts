import mongoose from "mongoose";
import schema from "./schema";
const model = mongoose.model("QuizAttemptModel", schema);
export default model;
