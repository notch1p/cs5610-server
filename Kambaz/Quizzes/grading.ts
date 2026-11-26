// Checking and grading students' answers. Pure functions of plain quiz
// objects (`doc.toJSON()`), so they can be tested without a database.
import { isSurvey } from "./rules";

const MAX_TEXT = 1000;

// The answer if it fits the question, otherwise undefined: an existing choice
// for multiple choice, a boolean for true/false, non-blank text for a blank.
export function validAnswer(question, answer) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      return question.choices.some((c) => c._id === answer)
        ? answer
        : undefined;
    case "TRUE_FALSE":
      return typeof answer === "boolean" ? answer : undefined;
    case "FILL_IN_BLANK":
      return typeof answer === "string" && answer.trim()
        ? answer.slice(0, MAX_TEXT)
        : undefined;
    default:
      return undefined;
  }
}

// Applies a student's new answers ({ question, answer }[]) on top of the saved
// ones. Unknown questions are ignored, and an invalid or blank answer clears
// that question's answer. With lockQuestionsAfterAnswering, a question that
// already has an answer keeps it.
export function mergeAnswers(quiz, saved, incoming) {
  const answers = new Map(saved.map((a) => [a.question, a.answer]));
  for (const { question: id, answer } of incoming ?? []) {
    const question = quiz.questions.find((q) => q._id === id);
    if (!question) continue;
    if (quiz.lockQuestionsAfterAnswering && answers.has(id)) continue;
    const valid = validAnswer(question, answer);
    if (valid === undefined) answers.delete(id);
    else answers.set(id, valid);
  }
  return [...answers].map(([question, answer]) => ({ question, answer }));
}

export function isCorrect(question, answer) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      return question.choices.some((c) => c.correct && c._id === answer);
    case "TRUE_FALSE":
      return (
        typeof question.correctAnswer === "boolean" &&
        answer === question.correctAnswer
      );
    case "FILL_IN_BLANK": {
      if (typeof answer !== "string") return false;
      const normalize = (s: string) =>
        question.caseSensitive ? s.trim() : s.trim().toLowerCase();
      return question.possibleAnswers.some(
        (p) => normalize(p) === normalize(answer),
      );
    }
    default:
      return false;
  }
}

// Grades valid answers (see mergeAnswers) against the quiz's current
// questions. There's one entry per question, unanswered ones included.
// - Quizzes: a question earns its points when answered correctly.
// - Graded surveys: a question earns its points when answered at all.
// - Ungraded surveys: no points and no score.
export function grade(quiz, answers) {
  const given = new Map(answers.map((a) => [a.question, a.answer]));
  const survey = isSurvey(quiz);
  const ungraded = quiz.quizType === "UNGRADED_SURVEY";
  const graded = quiz.questions.map((q) => {
    const answer = given.get(q._id);
    if (ungraded) return { question: q._id, answer };
    const answered = answer !== undefined;
    const correct = survey ? undefined : answered && isCorrect(q, answer);
    const earned = (survey ? answered : correct) ? (q.points ?? 0) : 0;
    return { question: q._id, answer, correct, points: earned };
  });
  if (ungraded) return { answers: graded, score: undefined, maxScore: undefined };
  return {
    answers: graded,
    score: graded.reduce((sum, a) => sum + a.points, 0),
    maxScore: quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0),
  };
}
