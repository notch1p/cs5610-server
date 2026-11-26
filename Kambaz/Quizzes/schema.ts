import mongoose from "mongoose";
import questionSchema from "./questionSchema";

const quizSchema = new mongoose.Schema(
  {
    _id: String,
    course: { type: String, ref: "CourseModel", required: true },
    title: { type: String, default: "Unnamed Quiz" },
    description: String, // HTML from the WYSIWYG editor
    quizType: {
      type: String,
      enum: ["GRADED_QUIZ", "PRACTICE_QUIZ", "GRADED_SURVEY", "UNGRADED_SURVEY"],
      default: "GRADED_QUIZ",
    },
    assignmentGroup: {
      type: String,
      enum: ["QUIZZES", "EXAMS", "ASSIGNMENTS", "PROJECT"],
      default: "QUIZZES",
    },
    shuffleAnswers: { type: Boolean, default: true },
    timeLimit: { type: Number, default: 20, min: 1 }, // minutes; null = none
    multipleAttempts: { type: Boolean, default: false },
    // Only used when multipleAttempts is true.
    howManyAttempts: { type: Number, default: 1, min: 1 },
    showCorrectAnswers: {
      type: String,
      enum: ["NEVER", "IMMEDIATELY", "AFTER_LAST_ATTEMPT", "AFTER_DUE_DATE"],
      default: "IMMEDIATELY",
    },
    accessCode: { type: String, default: "" }, // blank = no code needed
    oneQuestionAtATime: { type: Boolean, default: true },
    webcamRequired: { type: Boolean, default: false },
    lockQuestionsAfterAnswering: { type: Boolean, default: false },
    // Date and time. Unset means no restriction.
    dueDate: Date,
    availableDate: Date,
    untilDate: Date,
    published: { type: Boolean, default: false },
    // Goes up each time a save changes the questions. Attempts started at an
    // older version are "dropped" (see QuizAttempts/schema.ts).
    version: { type: Number, default: 1 },
    questions: [questionSchema],
  },
  { collection: "quizzes", id: false, toJSON: { virtuals: true } },
);

// Points is always the sum of the questions' points, so it can't go stale.
// It's left out, rather than shown as 0, when a query didn't load questions.
quizSchema.virtual("points").get(function () {
  if (!this.isSelected("questions")) return undefined;
  return this.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
});
export default quizSchema;
