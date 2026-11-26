import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Questions and choices are stored inside their quiz. Like every other id in
// Kambaz their ids are strings, and Mongoose fills one in for anything the
// editor sends without an _id.
const stringId = () => ({ type: String, default: () => uuidv4() });

const choiceSchema = new mongoose.Schema(
  {
    _id: stringId(),
    text: String,
    correct: { type: Boolean, default: false },
  },
  { id: false },
);

const questionSchema = new mongoose.Schema(
  {
    _id: stringId(),
    type: {
      type: String,
      enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_IN_BLANK"],
      default: "MULTIPLE_CHOICE",
    },
    title: String,
    points: { type: Number, default: 1, min: 0 },
    question: String, // HTML from the WYSIWYG editor
    // MULTIPLE_CHOICE: exactly one choice should be marked correct.
    choices: [choiceSchema],
    // TRUE_FALSE: whether the statement is true.
    correctAnswer: Boolean,
    // FILL_IN_BLANK: typing any of these counts as correct.
    possibleAnswers: [String],
    caseSensitive: { type: Boolean, default: false },
  },
  { id: false },
);
export default questionSchema;
