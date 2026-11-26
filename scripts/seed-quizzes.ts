// Adds sample quizzes with random questions, for trying out the quiz feature.
// Each run picks new questions and replaces the samples an earlier run added:
// quizzes whose title starts with "Sample: ", together with their attempts.
//
//   bun scripts/seed-quizzes.ts              courses with faculty and students
//   bun scripts/seed-quizzes.ts RS101 RS102  just these courses
//
// Run it from kambaz-server, so Bun loads MONGODB_URI from .env.
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QuizModel from "../Kambaz/Quizzes/model";
import QuizAttemptModel from "../Kambaz/QuizAttempts/model";
import EnrollmentModel from "../Kambaz/Enrollments/model";
import UserModel from "../Kambaz/Users/model";

const PREFIX = "Sample: ";
const DAY = 24 * 60 * 60 * 1000;

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));
const p = (text: string) => `<p>${text}</p>`;

// The pool. For multiple choice, the first choice is the right one.
const MULTIPLE_CHOICE = [
  ["Planets", "Which planet is known as the Red Planet?", ["Mars", "Venus", "Jupiter", "Mercury"]],
  ["Chemistry", "What is the chemical symbol for gold?", ["Au", "Ag", "Gd", "Go"]],
  ["Shapes", "How many sides does a hexagon have?", ["6", "5", "7", "8"]],
  ["Runtimes", "Which of these is a JavaScript runtime?", ["Node.js", "Django", "Rails", "Laravel"]],
  ["Arithmetic", "What is 7 × 8?", ["56", "54", "64", "49"]],
  ["Oceans", "Which is the largest ocean?", ["Pacific", "Atlantic", "Indian", "Arctic"]],
  ["Novels", "Who wrote <em>Pride and Prejudice</em>?", ["Jane Austen", "Charlotte Brontë", "Mary Shelley", "George Eliot"]],
  ["Boiling point", "At sea level, water boils at how many °C?", ["100", "90", "110", "212"]],
  ["Data structures", "Which data structure is first in, first out?", ["Queue", "Stack", "Tree", "Heap"]],
  ["HTTP", "What does the HTTP status code 404 mean?", ["Not Found", "Forbidden", "Internal Server Error", "Moved Permanently"]],
  ["Photosynthesis", "Which gas do plants take in for photosynthesis?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"]],
  ["Capitals", "What is the capital of Australia?", ["Canberra", "Sydney", "Melbourne", "Perth"]],
] as const;
const TRUE_FALSE = [
  ["The Moon", "The Great Wall of China is visible from the Moon with the naked eye.", false],
  ["Sound", "Sound travels faster in water than in air.", true],
  ["Arrays", "JavaScript array indexes start at 1.", false],
  ["Sunlight", "Light from the Sun takes about eight minutes to reach Earth.", true],
  ["Bytes", "A byte has 8 bits.", true],
  ["Penguins", "Penguins live in the wild at the North Pole.", false],
  ["Square roots", "The square root of 144 is 12.", true],
  ["CSS", "CSS stands for Cascading Style Sheets.", true],
] as const;
const FILL_IN_BLANK = [
  ["Planets", "The largest planet in our solar system is ____.", ["Jupiter"]],
  ["Water", "Water is made of hydrogen and ____.", ["oxygen"]],
  ["Capitals", "The capital of France is ____.", ["Paris"]],
  ["Git", "The Git command that copies a remote repository is <code>git ____</code>.", ["clone"]],
  ["Powers of two", "2 to the power of 10 is ____.", ["1024", "1,024"]],
  ["Plays", "<em>Hamlet</em> was written by William ____.", ["Shakespeare"]],
  ["SQL", "The SQL keyword that filters rows is ____.", ["WHERE"]],
  ["Mountains", "The highest mountain above sea level is Mount ____.", ["Everest"]],
] as const;

const pool = () => [
  ...MULTIPLE_CHOICE.map(([title, text, choices]) => ({
    type: "MULTIPLE_CHOICE",
    title,
    points: randomInt(2, 5),
    question: p(text),
    choices: shuffled(choices.map((choice, i) => ({ text: choice, correct: i === 0 }))),
  })),
  ...TRUE_FALSE.map(([title, text, answer]) => ({
    type: "TRUE_FALSE",
    title,
    points: randomInt(1, 3),
    question: p(text),
    correctAnswer: answer,
  })),
  ...FILL_IN_BLANK.map(([title, text, answers]) => ({
    type: "FILL_IN_BLANK",
    title,
    points: randomInt(2, 4),
    question: p(text),
    possibleAnswers: [...answers],
  })),
];
// n random questions of mixed types.
const mixed = (n: number) => shuffled(pool()).slice(0, n);

// Opinion questions, with no right answers.
const SURVEY = [
  {
    type: "MULTIPLE_CHOICE",
    title: "Pace",
    points: 1,
    question: p("How is the pace of the course so far?"),
    choices: ["Too slow", "About right", "Too fast"].map((text) => ({ text, correct: false })),
  },
  {
    type: "TRUE_FALSE",
    title: "Recommend",
    points: 1,
    question: p("I'd recommend this course to a friend."),
  },
  {
    type: "FILL_IN_BLANK",
    title: "Topics",
    points: 1,
    question: p("One topic you'd like to spend more time on: ____"),
    possibleAnswers: [],
  },
];

// One of each situation worth trying.
function samples() {
  const now = Date.now();
  const inDays = (days: number) => new Date(now + days * DAY);
  return [
    {
      title: "General Knowledge",
      description: p("Ten mixed questions, all on one page."),
      oneQuestionAtATime: false,
      dueDate: inDays(7),
      questions: mixed(10),
    },
    {
      title: "One at a Time, Locked",
      description: p("Answers lock once you move on. Three attempts; the correct answers appear after the last one."),
      lockQuestionsAfterAnswering: true,
      multipleAttempts: true,
      howManyAttempts: 3,
      showCorrectAnswers: "AFTER_LAST_ATTEMPT",
      timeLimit: 10,
      dueDate: inDays(10),
      questions: mixed(6),
    },
    {
      title: "Practice with Access Code",
      description: p("A practice quiz that needs an access code."),
      quizType: "PRACTICE_QUIZ",
      accessCode: "1234",
      timeLimit: null,
      multipleAttempts: true,
      howManyAttempts: 5,
      questions: mixed(5),
    },
    {
      title: "One-Minute Sprint",
      description: p("A one-minute time limit, to see the auto-submit."),
      oneQuestionAtATime: false,
      timeLimit: 1,
      multipleAttempts: true,
      howManyAttempts: 2,
      questions: mixed(4),
    },
    {
      title: "Course Survey",
      description: p("A graded survey: every answered question earns its points."),
      quizType: "GRADED_SURVEY",
      assignmentGroup: "ASSIGNMENTS",
      showCorrectAnswers: "NEVER",
      oneQuestionAtATime: false,
      timeLimit: null,
      questions: SURVEY,
    },
    {
      title: "Midterm Exam",
      description: p("The correct answers show after the due date. Choices aren't shuffled."),
      assignmentGroup: "EXAMS",
      shuffleAnswers: false,
      showCorrectAnswers: "AFTER_DUE_DATE",
      timeLimit: 30,
      dueDate: inDays(3),
      questions: mixed(8),
    },
    {
      title: "Opens Next Week",
      description: p("Not available yet."),
      availableDate: inDays(7),
      dueDate: inDays(14),
      questions: mixed(5),
    },
    {
      title: "Already Closed",
      description: p("Its availability window has passed."),
      availableDate: inDays(-14),
      untilDate: inDays(-7),
      dueDate: inDays(-7),
      questions: mixed(5),
    },
    {
      title: "Unpublished Draft",
      description: p("Students can't see this one."),
      published: false,
      questions: mixed(4),
    },
  ].map((quiz) => ({ published: true, ...quiz, title: PREFIX + quiz.title }));
}

// Courses where both faculty (or admins) and students are enrolled.
async function coursesWithFacultyAndStudents() {
  const enrollments = await EnrollmentModel.find();
  const users = await UserModel.find({
    _id: { $in: enrollments.map((e) => e.user) },
  });
  const roleOf = new Map(users.map((u) => [u._id, u.role]));
  const roles = new Map<string, Set<string>>();
  for (const { user, course } of enrollments) {
    const role = roleOf.get(user);
    if (!role || !course) continue;
    if (!roles.has(course)) roles.set(course, new Set());
    roles.get(course)!.add(role === "ADMIN" ? "FACULTY" : role);
  }
  return [...roles]
    .filter(([, r]) => r.has("FACULTY") && r.has("STUDENT"))
    .map(([course]) => course)
    .sort();
}

await mongoose.connect(process.env.MONGODB_URI as string, { dbName: "kambaz" });
try {
  const args = process.argv.slice(2);
  const courses = args.length ? args : await coursesWithFacultyAndStudents();
  const earlier = await QuizModel.find(
    { course: { $in: courses }, title: new RegExp(`^${PREFIX}`) },
    { _id: 1 },
  );
  const earlierIds = earlier.map((q) => q._id);
  await QuizAttemptModel.deleteMany({ quiz: { $in: earlierIds } });
  await QuizModel.deleteMany({ _id: { $in: earlierIds } });
  console.log(`Removed ${earlierIds.length} earlier sample quizzes.`);
  for (const course of courses) {
    const created = await QuizModel.insertMany(
      samples().map((quiz) => ({ ...quiz, _id: uuidv4(), course, version: 1 })),
    );
    console.log(`\n${course}:`);
    for (const quiz of created) {
      console.log(
        `  ${quiz.published ? "published  " : "unpublished"}  ${quiz.title}: ${quiz.questions.length} questions, ${quiz.get("points")} pts`,
      );
    }
  }
} finally {
  await mongoose.disconnect();
}
