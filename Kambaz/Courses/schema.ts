import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    number: String,
    // Strings, not Dates: the client binds these to <input type="date">,
    // which needs "YYYY-MM-DD".
    startDate: String,
    endDate: String,
    department: String,
    credits: Number,
    description: String,
    image: String,
    term: String,
  },
  { collection: "courses" },
);
export default courseSchema;
