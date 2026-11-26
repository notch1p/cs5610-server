// When a quiz can be taken and what students may see of it. Pure functions of
// plain quiz/attempt objects (`doc.toJSON()`, or the documents themselves)
// and a time, so they can be tested without a database.

// A submit still counts if it arrives this long after the deadline, so an
// auto-submit sent at the deadline isn't lost in transit.
export const GRACE_MS = 30_000;

export function availability(quiz, at: Date) {
  if (quiz.availableDate && at < quiz.availableDate) return "NOT_YET";
  if (quiz.untilDate && at > quiz.untilDate) return "CLOSED";
  return "AVAILABLE";
}

export const attemptsAllowed = (quiz) =>
  quiz.multipleAttempts ? Math.max(1, quiz.howManyAttempts ?? 1) : 1;

// Started before the quiz's questions last changed.
export const isDropped = (attempt, quiz) => attempt.quizVersion < quiz.version;

// When the attempt must be in: the time limit or the quiz closing, whichever
// comes first. Null when neither applies.
export function deadline(attempt, quiz): Date | null {
  const ends: number[] = [];
  if (quiz.timeLimit) {
    ends.push(new Date(attempt.startedAt).getTime() + quiz.timeLimit * 60_000);
  }
  if (quiz.untilDate) ends.push(new Date(quiz.untilDate).getTime());
  return ends.length ? new Date(Math.min(...ends)) : null;
}

export function isExpired(attempt, quiz, at: Date) {
  const end = deadline(attempt, quiz);
  return end !== null && at.getTime() > end.getTime() + GRACE_MS;
}

export const isSurvey = (quiz) =>
  quiz.quizType === "GRADED_SURVEY" || quiz.quizType === "UNGRADED_SURVEY";

// Whether a student who has used `attemptsUsed` attempts at the quiz's current
// version may see the right answers. Surveys have none to show.
export function canSeeCorrectAnswers(quiz, attemptsUsed: number, at: Date) {
  if (isSurvey(quiz)) return false;
  switch (quiz.showCorrectAnswers) {
    case "IMMEDIATELY":
      return true;
    case "AFTER_LAST_ATTEMPT":
      return attemptsUsed >= attemptsAllowed(quiz);
    case "AFTER_DUE_DATE":
      return !quiz.dueDate || at > quiz.dueDate;
    default:
      return false;
  }
}

// The quiz as students see it outside an attempt: no access code and no
// questions, only how many there are and what they're worth.
export function quizForStudent(quiz) {
  const { accessCode, questions, ...rest } = quiz;
  return {
    ...rest,
    hasAccessCode: !!accessCode,
    questionCount: questions.length,
  };
}

// A question with nothing that gives its answer away. It's built from an
// allowlist, so answer fields, including ones left over from another question
// type, can't leak.
export function questionForStudent(question, shuffle = false) {
  const { _id, type, title, points } = question;
  const view: Record<string, unknown> = {
    _id,
    type,
    title,
    points,
    question: question.question,
  };
  if (type === "MULTIPLE_CHOICE") {
    const choices = question.choices.map(({ _id, text }) => ({ _id, text }));
    view.choices = shuffle ? shuffled(choices) : choices;
  }
  return view;
}

// A question for reviewing an attempt: the student view, plus the right
// answer when the student may see it.
export function questionForReview(question, showAnswer: boolean) {
  const view = questionForStudent(question);
  if (!showAnswer) return view;
  if (question.type === "MULTIPLE_CHOICE") {
    view.choices = question.choices.map(({ _id, text, correct }) => ({
      _id,
      text,
      correct,
    }));
  } else if (question.type === "TRUE_FALSE") {
    view.correctAnswer = question.correctAnswer;
  } else if (question.type === "FILL_IN_BLANK") {
    view.possibleAnswers = question.possibleAnswers;
  }
  return view;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// The questions in a fixed shape and key order, for telling whether a save
// really changed them. Raw JSON can differ in key order alone.
export function questionsKey(questions) {
  return JSON.stringify(
    questions.map((q) => ({
      _id: q._id,
      type: q.type,
      title: q.title ?? null,
      points: q.points ?? null,
      question: q.question ?? null,
      choices: (q.choices ?? []).map((c) => ({
        _id: c._id,
        text: c.text ?? null,
        correct: !!c.correct,
      })),
      correctAnswer: q.correctAnswer ?? null,
      possibleAnswers: q.possibleAnswers ?? [],
      caseSensitive: !!q.caseSensitive,
    })),
  );
}
