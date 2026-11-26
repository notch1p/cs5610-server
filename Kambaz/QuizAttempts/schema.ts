import mongoose from "mongoose";

// One entry per answered question. `correct` and `points` are filled in on
// submit, so later edits to the quiz don't change past scores; `answer` keeps
// the raw response in case a regrade is ever needed.
const answerSchema = new mongoose.Schema(
  {
    question: String, // the question's _id within the quiz
    // MULTIPLE_CHOICE: the chosen choice's _id. TRUE_FALSE: true or false.
    // FILL_IN_BLANK: the text typed into the blank.
    answer: mongoose.Schema.Types.Mixed,
    correct: Boolean,
    points: Number,
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema(
  {
    _id: String,
    quiz: { type: String, ref: "QuizModel", required: true },
    user: { type: String, ref: "UserModel", required: true },
    attemptNumber: { type: Number, required: true }, // 1, 2, ...
    // The quiz's `version` when the attempt started. Once the questions
    // change, the attempt is dropped: it keeps its score, but can't be replayed
    // and no longer counts toward the attempt limit.
    quizVersion: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date, // unset while the attempt is in progress
    answers: [answerSchema],
    score: Number, // set on submit
    maxScore: Number, // the quiz's points when it was submitted
  },
  { collection: "quiz-attempts" },
);
// Also stops a double "start" from creating two attempts with the same number.
attemptSchema.index({ quiz: 1, user: 1, attemptNumber: 1 }, { unique: true });
export default attemptSchema;
