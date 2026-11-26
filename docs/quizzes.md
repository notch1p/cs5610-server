# Quizzes: design notes

Working notes for the quiz feature, which is being built in steps. Update this
file as each step lands.

| Step                                                               | Status                                    |
| ------------------------------------------------------------------ | ----------------------------------------- |
| 1. Data model (schemas, models)                                    | Done 2026-11-25                           |
| 2. Behaviors and routes: permissions, attempt lifecycle, grading   | Done 2026-11-25, tested end to end against the cloud database (see API) |
| 3. Quiz list and details screens (client, styled like Assignments) | Done 2026-11-25. Edit, Preview, Start and View attempt stay disabled until their steps. |
| 4. Quiz editor: details tab and questions tab                      | Done 2026-11-25. Preview stays disabled until step 6. |
| 5. Taking a quiz (students)                                        | Done 2026-11-25                           |
| 6. Preview for faculty: same screen, answers not saved             | Done 2026-11-25. Sample quizzes seeded (see Sample data). |

## Files

Server (`kambaz-server`):

- `Kambaz/Quizzes/schema.ts`, `questionSchema.ts`, `model.ts`: `QuizModel`,
  collection `quizzes`, with the questions embedded.
- `Kambaz/Quizzes/rules.ts`: availability, deadlines, attempt limits, and what
  students may see. These are pure functions.
- `Kambaz/Quizzes/grading.ts`: checking and grading answers, also pure
  functions.
- `Kambaz/Quizzes/access.ts`: the user's role in a course, and loading a quiz
  with the right 401, 403 or 404.
- `Kambaz/Quizzes/dao.ts`, `routes.ts`: creating, editing and deleting
  quizzes, and the preview.
- `Kambaz/QuizAttempts/schema.ts`, `model.ts`: `QuizAttemptModel`, collection
  `quiz-attempts`.
- `Kambaz/QuizAttempts/dao.ts`, `routes.ts`: taking quizzes, and faculty's
  view of the attempts.

Both collections exist in the `kambaz` database. Mongoose builds the attempts'
unique index when the server starts.

Client (`kambaz`), under `app/(kambaz)/courses/[cid]/quizzes/`:

- `types.ts`, `client.ts`: the shapes of the API's responses, and the calls
  to it.
- `quizInfo.ts`: labels, availability, date formatting, conversion for
  date-and-time inputs, sorting, and error messages.
- `SafeHtml.tsx`: renders the editor's HTML through DOMPurify.
- `page.tsx`, `QuizItem.tsx`: the quiz list.
- `[qid]/page.tsx`: the details screen. It shows `FacultyQuizDetails` or
  `StudentQuizDetails`.
  - `FacultyQuizDetails` holds the editor's draft. Its two tabs are
    `QuizDetailsForm` (Details) and `QuestionList` (Questions).
  - `QuestionList` shows each question as a `QuestionPreview`, or, when it's
    open, as a `QuestionEditor`.
- `RichText.tsx`: the WYSIWYG editor, `react-quill-new` loaded on the client
  only.
- `[qid]/take/page.tsx`: a student's attempt in progress, shown with
  `QuizTaker`. `QuizTaker` gets its save and submit functions as props, so the
  faculty preview can reuse it.
- `[qid]/review/page.tsx`: the student's last attempt, shown with
  `AttemptReview`. A just-submitted attempt uses `AttemptReview` too.
- `[qid]/preview/page.tsx`: the faculty preview. It's `QuizTaker` with no
  save function, and the server's preview endpoint does the grading.

`kambaz-server/scripts/seed-quizzes.ts` adds sample quizzes; see Sample data.

`react-quill-new` 3.8.3 and `dompurify` 3.4.18 are installed, for the editor
and for rendering HTML safely. The hatched "frozen" style is `.wd-frozen` in
`app/(kambaz)/kambaz.css`.

## Decisions

### Settled with the user

Data model:

- **Show Correct Answers** is an enum: `NEVER`, `IMMEDIATELY` (the default),
  `AFTER_LAST_ATTEMPT` or `AFTER_DUE_DATE`. With `AFTER_DUE_DATE` and no due
  date set, answers are shown immediately.
- **How Many Attempts** is a number, default 1, used only when Multiple
  Attempts is on.
- **Published** is a flag, `false` by default. Students only see published
  quizzes.
- **Due, Available and Until** hold a date and a time (`Date`).

Behavior:

- **Roles:** FACULTY and STUDENT. ADMIN counts as FACULTY, and TAs are out of
  scope.
  - Faculty edit the quizzes of courses they're in charge of, meaning enrolled
    in, as on the Dashboard.
  - Students reach a course's quizzes only through that course's navigation,
    which already requires enrollment.
- **When time runs out,** the attempt is submitted automatically.
- **The latest attempt counts** toward the grade.
  - Students can only see the score and answers of their last attempt, on the
    quiz details screen. The quiz list shows the quiz's total points, not the
    student's score.
  - Faculty can see students' attempts, for grading.
- **Surveys:** a graded survey gives full points for answering, which we take
  to mean each answered question earns its points. An ungraded survey has no
  score.
- **Fill-in-the-blank answers are trimmed** before comparing. They're
  case-insensitive unless the question's `caseSensitive` is on.
- **Shuffled choice order isn't stored** in the attempt, so it may change if
  the student reloads.
- **Changing a quiz's questions drops the attempts taken before the change.**
  Only question changes count; saving details or dates, and publishing, don't.
  - A dropped attempt keeps its score, which still counts while it's the
    latest attempt.
  - It no longer counts toward How Many Attempts, so the student can take the
    quiz again.
  - It can't be replayed. Where its replay link would be, show "Quiz edited:
    attempts dropped."
  - How this works is under "How dropped attempts work", in Data model.
- **Editing uses one draft for both tabs.** A question's Save/Update and Cancel
  only accept or revert that question inside the draft. Nothing reaches the
  server until Save or Save & Publish, and Cancel throws away the whole draft.

### Design choices, with the reasons

- **Questions are embedded in the quiz**, like lessons in modules. One read
  returns the whole quiz, the array order is the display order, and quizzes stay
  small.
- **One question schema, with `type` plus per-type fields**, rather than
  Mongoose discriminators. Switching a question's type in the editor only
  changes `type`. Fields left over from the old type are ignored, but they
  must never be sent to students (see Rules). To add a type later, add an enum
  value, its fields and a grading case.
- **Each multiple-choice choice has `correct: Boolean`**, and exactly one
  should be true. A future multiple-answers type can reuse the same shape.
  Choices have ids so that shuffling and attempts can refer to them.
- **Question and choice ids are uuids filled in by Mongoose** whenever a
  question or choice arrives without one, including in an update. The editor
  can still generate its own ids for React keys; ids it sends are kept. The
  quiz's own `_id` is assigned by the DAO, like the other collections.
- **`points` is a virtual**, the sum of the question points. It is never
  stored, and a client-sent `points` is dropped. When a query didn't load
  `questions`, it's left out of the JSON rather than shown as 0.
- **A new question is worth 1 point by default**, as in Canvas.
- **Attempts get their own collection**, since they grow with students ×
  attempts. Each answer keeps the raw response plus the `correct` and `points`
  it earned at submission, and the attempt keeps `score` and `maxScore`. Later
  edits to the quiz therefore don't change past scores, and a regrade is still
  possible from the raw answers.
- **Preview answers aren't stored.** The plan is a server endpoint that grades
  and returns the result without saving, so grading lives in one place.

## Data model

### Quiz: collection `quizzes`

| Field                                   | Type                                                               | Default             | Notes                                   |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------- | --------------------------------------- |
| `_id`                                   | String                                                             | assigned by the DAO |                                         |
| `course`                                | String, a course `_id`                                             | required            |                                         |
| `title`                                 | String                                                             | `"Unnamed Quiz"`    |                                         |
| `description`                           | String (HTML)                                                      |                     | from the WYSIWYG editor                 |
| `quizType`                              | `GRADED_QUIZ`, `PRACTICE_QUIZ`, `GRADED_SURVEY`, `UNGRADED_SURVEY` | `GRADED_QUIZ`       |                                         |
| `points`                                | Number, virtual                                                    |                     | sum of the question points; read-only   |
| `assignmentGroup`                       | `QUIZZES`, `EXAMS`, `ASSIGNMENTS`, `PROJECT`                       | `QUIZZES`           |                                         |
| `shuffleAnswers`                        | Boolean                                                            | `true`              | shuffles multiple-choice choices        |
| `timeLimit`                             | Number (minutes, ≥ 1)                                              | `20`                | `null` = no limit                       |
| `multipleAttempts`                      | Boolean                                                            | `false`             |                                         |
| `howManyAttempts`                       | Number (≥ 1)                                                       | `1`                 | only used when `multipleAttempts` is on |
| `showCorrectAnswers`                    | `NEVER`, `IMMEDIATELY`, `AFTER_LAST_ATTEMPT`, `AFTER_DUE_DATE`     | `IMMEDIATELY`       |                                         |
| `accessCode`                            | String                                                             | `""`                | blank = no code; never sent to students |
| `oneQuestionAtATime`                    | Boolean                                                            | `true`              |                                         |
| `webcamRequired`                        | Boolean                                                            | `false`             | sample flag, no behavior planned        |
| `lockQuestionsAfterAnswering`           | Boolean                                                            | `false`             |                                         |
| `dueDate`, `availableDate`, `untilDate` | Date                                                               | unset               | unset = no restriction                  |
| `published`                             | Boolean                                                            | `false`             |                                         |
| `version`                               | Number                                                             | `1`                 | goes up when a save changes the questions; the editor can't set it |
| `questions`                             | array of Question                                                  | `[]`                | order = display order                   |

### Question: embedded in `quiz.questions`

| Field             | Type                                             | Default           | Used by                                      |
| ----------------- | ------------------------------------------------ | ----------------- | -------------------------------------------- |
| `_id`             | String                                           | uuid              | all types                                    |
| `type`            | `MULTIPLE_CHOICE`, `TRUE_FALSE`, `FILL_IN_BLANK` | `MULTIPLE_CHOICE` | all types                                    |
| `title`           | String                                           |                   | all types                                    |
| `points`          | Number (≥ 0)                                     | `1`               | all types                                    |
| `question`        | String (HTML)                                    |                   | all types; from the WYSIWYG editor           |
| `choices`         | array of `{ _id, text, correct }`                | `[]`              | multiple choice; exactly one `correct`       |
| `correctAnswer`   | Boolean                                          |                   | true/false                                   |
| `possibleAnswers` | array of String                                  | `[]`              | fill in the blank; any one counts as correct |
| `caseSensitive`   | Boolean                                          | `false`           | fill in the blank                            |

### Attempt: collection `quiz-attempts`

| Field           | Type                                             | Notes                                                                                                      |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `_id`           | String                                           | assigned by the DAO                                                                                        |
| `quiz`          | String, a quiz `_id`                             | required                                                                                                   |
| `user`          | String, a user `_id`                             | required; the student who took it                                                                          |
| `attemptNumber` | Number                                           | required; starts at 1. `(quiz, user, attemptNumber)` is unique.                                            |
| `quizVersion`   | Number                                           | required; the quiz's `version` when the attempt started                                                    |
| `startedAt`     | Date                                             | defaults to now; the time limit counts from here                                                           |
| `submittedAt`   | Date                                             | unset while the attempt is in progress                                                                     |
| `answers`       | array of `{ question, answer, correct, points }` | `answer` holds a choice `_id`, `true`/`false`, or the typed text; `correct` and `points` are set on submit |
| `score`         | Number                                           | set on submit                                                                                              |
| `maxScore`      | Number                                           | the quiz's points at submission                                                                            |

### How dropped attempts work

- **The quiz's `version` goes up only when a save changes the questions.** The
  server compares the saved and stored questions in a fixed shape, so a change
  in key order alone doesn't count. Reordering the questions does count.
- **An attempt is dropped** when its `quizVersion` is older than the quiz's
  `version`.
- **The attempt limit:** a student may take `howManyAttempts` attempts when
  Multiple Attempts is on, otherwise 1. Only attempts at the current `version`
  count against it.

### Example

```json
{
  "_id": "6f1c…",
  "course": "RS101",
  "title": "Q1 - Propulsion basics",
  "published": true,
  "availableDate": "2026-12-01T14:00:00.000Z",
  "dueDate": "2026-12-08T04:59:00.000Z",
  "questions": [
    {
      "_id": "…",
      "type": "MULTIPLE_CHOICE",
      "title": "Thrust",
      "points": 4,
      "question": "<p>Which law explains rocket thrust?</p>",
      "choices": [
        { "_id": "c1", "text": "Newton's third law", "correct": true },
        { "_id": "c2", "text": "Boyle's law", "correct": false }
      ]
    },
    {
      "_id": "…",
      "type": "TRUE_FALSE",
      "title": "Vacuum",
      "points": 2,
      "question": "<p>Rockets need air to push against.</p>",
      "correctAnswer": false
    },
    {
      "_id": "…",
      "type": "FILL_IN_BLANK",
      "title": "Fuel",
      "points": 4,
      "question": "<p>Liquid hydrogen needs liquid ____ to burn.</p>",
      "possibleAnswers": ["oxygen", "LOX"],
      "caseSensitive": false
    }
  ],
  "points": 10
}
```

The other quiz fields take their defaults. `points` appears only in responses
and is never stored.

## API

Every route needs a signed-in user enrolled in the quiz's course. Otherwise it
answers 401 when signed out and 403 when not enrolled.

- **Faculty** means FACULTY or ADMIN. Anyone else enrolled is a student.
- **Unpublished quizzes** are a 404 for students.
- **`answer` in a request** is a choice `_id` for multiple choice, `true` or
  `false` for true/false, or the typed text for fill in the blank.

| Method and path                                        | Who     | What it does                                                                                                                                                  |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/courses/:courseId/quizzes`                   | both    | Faculty get every quiz, in full. Students get the published ones, without questions or access code, plus `questionCount` and `hasAccessCode`.                     |
| `POST /api/courses/:courseId/quizzes`                  | faculty | Creates a quiz with the defaults. The body may set fields.                                                                                                     |
| `GET /api/quizzes/:quizId`                             | both    | One quiz, shaped as in the first row.                                                                                                                          |
| `PUT /api/quizzes/:quizId`                             | faculty | Saves the editor's whole draft, details and questions. `_id`, `course` and `version` can't be set, and `points` is ignored. 400 on invalid values. Publish and unpublish use this too. |
| `DELETE /api/quizzes/:quizId`                          | faculty | Deletes the quiz and its attempts.                                                                                                                              |
| `POST /api/quizzes/:quizId/preview`                    | faculty | Grades `{ answers }` and returns the result with the right answers. Saves nothing.                                                                            |
| `GET /api/quizzes/:quizId/attempts`                    | faculty | Every student's attempts, with the student's name.                                                                                                             |
| `GET /api/quizzes/:quizId/attempts/status`             | student | For the details screen: `availability`, `attemptsAllowed`, `attemptsUsed`, `canStart`, `inProgress` and `lastAttempt`.                                       |
| `POST /api/quizzes/:quizId/attempts`                   | student | Starts an attempt, with body `{ accessCode }`, or resumes the one in progress. 403 when the quiz isn't available, no attempts are left, or the code is wrong. |
| `GET /api/quizzes/:quizId/attempts/current`            | student | The attempt in progress, for example after a reload. 404 when there's none.                                                                                    |
| `PUT /api/quizzes/:quizId/attempts/:attemptId/answers` | student | Saves `{ answers: [{ question, answer }] }`. 409 once time is up, and the attempt is then submitted.                                                             |
| `POST /api/quizzes/:quizId/attempts/:attemptId/submit` | student | Submits, optionally with final `{ answers }`, and returns the review.                                                                                          |
| `GET /api/quizzes/:quizId/attempts/last`               | student | The last submitted attempt, for review, or `null`. A dropped one shows only its score.                                                                         |

Behavior settled while building it:

- **Deadline:** an attempt is due at its time limit or when the quiz closes at
  its Until date, whichever comes first. A submit up to 30 seconds late still
  counts, to cover the trip of an auto-submit sent at the deadline.
- **Running out of time:** there's no server timer. An expired attempt is
  submitted the next time anything touches it, with the answers saved by its
  deadline. That's any of: status, start, current, last, a save, a submit, or
  the faculty list.
- **Starting:**
  - The access code is needed to start a new attempt, but not to resume one.
  - An attempt in progress counts as used.
- **Saving answers:**
  - Answers to unknown questions, and answers of the wrong type, are ignored.
  - A blank answer clears that question.
  - With Lock Questions After Answering, a question that has an answer keeps
    it.
- **Review:** it always shows whether each answer was right. The right answers
  themselves appear only when Show Correct Answers allows it.
- **Shuffling:** choices are reshuffled every time the attempt loads, whether
  on start, resume or reload.
- **Deleting a course** also deletes its quizzes and their attempts.
- **Request size:** the server accepts JSON bodies up to 2 MB.

## Screens

### Quiz list

The Quizzes link in a course's navigation opens the list of that course's
quizzes. It looks like the Assignments list.

- **Toolbar:** **+ Quiz** on the right, for faculty. An optional search box on
  the left filters the list by title, locally.
- **Empty list:** faculty see a message telling them to click **+ Quiz**, and
  students see "No quizzes".
- **+ Quiz** creates the quiz on the server straight away, with the default
  title and unpublished, then opens its Quiz Details screen. So cancelling that
  first edit still leaves the new quiz in the list.
- **Each row shows:**
  - The publish symbol, faculty only. 🚫 means unpublished and ✅ published.
    Clicking it toggles publishing.
  - The title, which links to the Quiz Details screen.
  - Under the title, a two-column list with labels right-aligned and values
    left-aligned:
    - **Availability:**
      - "Not available until _Available date_" before the Available date.
      - "Available" between the Available and Until dates.
      - "Closed" after the Until date.
      - An unset date doesn't restrict: with no Available date the quiz is
        open from the start, and with no Until date it never closes.
    - **Due:** the due date.
    - **Points:** the quiz's total points, for students too. A student's own
      score is on the quiz details screen.
    - **Questions:** the number of questions.
  - **A ⋮ menu** on the right, faculty only:
    - Edit: opens the Quiz Details screen.
    - Delete: removes the quiz and stays on the list.
    - Publish or Unpublish, whichever applies.
    - Sort: by name, due date or available date. It sorts the whole list
      locally and isn't saved.
    - Copy to another course (optional).
- **Students** see only published quizzes.

### Quiz details: faculty

- The screen opens read-only. Fields are "frozen": disabled and drawn with a
  diagonal-hatch background.
- **Preview** opens the preview screen: the faculty member takes the quiz, and
  nothing is saved.
- **Edit** switches to edit mode. Edit becomes **Save**, **Save & Publish** and
  **Cancel** appear, and Preview is hidden. All three return to the quiz list:
  - Save saves without changing whether the quiz is published.
  - Save & Publish saves and publishes the quiz.
  - Cancel throws away the changes.
- Two tabs: **Details** and **Questions**.

#### Details tab

There's no set design; this is the proposed layout. It's a two-column form
like the assignment editor, with labels on the right of the first column:

- **Title:** a text input.
- **Description:** the WYSIWYG editor.
- **Quiz Type** and **Assignment Group:** selects.
- **Points:** read-only, the total of the question points.
- **Options box:**
  - Shuffle Answers: a checkbox.
  - Time Limit: a checkbox plus a minutes input; unchecked means no limit.
  - Multiple Attempts: a checkbox, plus How Many Attempts (a number), shown
    when it's checked.
  - One Question at a Time, Webcam Required and Lock Questions After
    Answering: checkboxes.
- **Show Correct Answers:** a select with Never, Immediately, After last
  attempt and After due date.
- **Access Code:** a text input.
- **Assign box:** Due, Available from and Until, each a date-and-time input.

#### Questions tab

- **The list** of the quiz's questions starts empty. Its header shows the total
  points.
- **New Question** adds a multiple-choice question at the bottom, opened for
  editing.
- **Each question** shows a preview of its title, points, question text and
  answers. Its **Edit** button opens it for editing.
- **Editing a question** shows a question-type dropdown, then Title, Points and
  Question (WYSIWYG), then the fields for its type:
  - Multiple choice: one textarea per choice, each with a radio button that
    marks the single correct choice. Choices can be added and removed.
  - True/False: True and False radio buttons for the correct answer.
  - Fill in the blank: one text input per possible answer. Answers can be
    added and removed.
  - Changing the type keeps the title, points and question text.
- **The question's buttons:** **Cancel** reverts that question, and
  **Save/Update** keeps its edits.
- **The screen's buttons:** **Cancel** throws away the edits, and **Save** saves
  them without publishing. They act on the same draft as the top-level
  buttons (see Decisions), so they're the same two actions.

#### Editor behavior settled while building it

- **+ Quiz opens the new quiz in edit mode**, through `?edit=1` on the details
  URL.
- **Saving with a question still open** saves that question's current edits,
  as if its Save/Update had been clicked.
- **Questions can be deleted** in edit mode, with a trash icon next to Edit.
  Like everything else, the deletion only reaches the server on Save.
- **New question defaults:**
  - A new multiple-choice question starts with two empty choices, the first
    marked correct. Removing the correct choice marks the first remaining one,
    so exactly one is always correct.
  - True/false starts with True as the correct answer.
  - Fill in the blank starts with one empty answer. Blank answers are dropped
    when the question's edits are accepted.
- **Changing a question's type** keeps its title, points and question text.
  The other types' fields stay in the draft, so switching back restores them.
- **The WYSIWYG fields** use `react-quill-new`, with no image button or image
  format, so pasted images are dropped. The editor stores Quill's semantic
  HTML, with real `<ul>` and `<ol>` lists.
- **Leaving the editor:** Save, Save & Publish and Cancel all return to the
  list. A failed save stays in the editor and shows the server's message.

### Quiz details: students

- **The screen** shows a **Start** button when the quiz can be taken, and
  otherwise a message: not available until a date, closed, or no attempts
  left.
- **The access code:** if the quiz has one, starting asks for it.
- **The last attempt,** if there is one: its score and a link that replays it.
  If the attempt was dropped, "Quiz edited: attempts dropped." replaces the
  link.

### Taking a quiz, and preview

- **One screen** serves both students and the faculty preview. The preview is
  graded but never saved, and shows the score and which answers were wrong.
- **The quiz settings apply:** one question at a time, locking questions after
  they're answered, and the time limit with auto-submit. Choices are shuffled
  when Shuffle Answers is on.
- **After submitting,** students see their score. Whether and when they see the
  correct answers follows `showCorrectAnswers`.
- **Students can only see their last attempt,** from the quiz details screen.
  Dropped attempts can't be replayed.

#### Taking behavior settled while building it

- **Starting:** the details screen shows an access-code box next to **Start
  Quiz** when the quiz has a code. Starting opens `/take`. While an attempt is
  in progress, the button reads **Resume Quiz**, and reloading `/take` also
  resumes it.
- **When answers are saved:**
  - One question at a time: when the student moves to another question, with
    Previous, Next or the numbered question buttons.
  - All questions on one page: when the student picks an option, or leaves a
    fill-in-the-blank box.
  - Submit sends everything on screen either way.
- **Locked questions** (Lock Questions After Answering) turn read-only and are
  labeled "Locked" once their answer is saved. Students can still go back to
  look at them.
- **Timer:** a countdown that turns red in the last minute and submits
  automatically at the deadline. If a save arrives after the deadline, the
  server has already submitted the attempt, and the screen shows that attempt.
- **Submitting with unanswered questions** asks for confirmation first.
- **After submitting,** the screen shows the review straight away.
  - **Each question in the review** shows its points earned and Correct,
    Incorrect or No answer. Surveys show no verdict for answered questions.
  - **The right answers** appear only when Show Correct Answers allows it.
    Otherwise a note says they aren't shown yet.

#### Preview behavior settled while building it

- **What it shows:** **Preview** on the faculty details screen opens
  `/preview`, which shows the quiz's saved version as a student would see it.
  Choices are shuffled when Shuffle Answers is on, and a banner says the
  answers aren't saved.
- **What doesn't apply:** the access code, and the Available and Until dates.
  The time limit counts from when the preview opens. Locking works on screen,
  even though nothing is saved.
- **Submitting** sends the answers to `POST /api/quizzes/:quizId/preview`. The
  result shows the score with the right answers, so faculty can see what was
  wrong.

## Sample data

From `kambaz-server`, run `bun scripts/seed-quizzes.ts`.

- **Where:** with no arguments, it seeds every course with both faculty and
  students enrolled. You can name courses instead: `bun
  scripts/seed-quizzes.ts RS101`.
- **What:** each course gets nine quizzes with random questions, drawn from a
  pool of general-knowledge questions.
- **Re-running** picks new questions and replaces the earlier samples (quizzes
  titled "Sample: …"), deleting their attempts too.

Each sample covers one situation:

| Quiz                      | What it's for                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| General Knowledge         | 10 questions on one page; 20-minute limit; due in a week                                            |
| One at a Time, Locked     | One question at a time with locking; 3 attempts; answers shown after the last; 10 minutes          |
| Practice with Access Code | Practice quiz; access code `1234`; no time limit; 5 attempts                                        |
| One-Minute Sprint         | A 1-minute limit, to see the auto-submit; 2 attempts                                                |
| Course Survey             | Graded survey: full points for answering; no right answers                                          |
| Midterm Exam              | Exams group; choices not shuffled; answers shown after the due date (3 days out); 30 minutes        |
| Opens Next Week           | Not available until a week from the seeding                                                        |
| Already Closed            | Its Until date was a week before the seeding                                                       |
| Unpublished Draft         | Hidden from students                                                                                |

The questions on the 2026-11-25 run were checked through the API: perfect
answers earn full marks, in an attempt and in a preview.

## Rules for later steps

The server already handles these, since step 2:

- Students never receive answers or access codes, because their views are
  built from allowlists.
- Attempts are scoped to the session user.
- The time limit is enforced.
- Deletes clean up after themselves.

For the client, and for any future server code:

- **Sanitize WYSIWYG HTML** (`description`, `question`) with DOMPurify before
  rendering it with `dangerouslySetInnerHTML`. Faculty-written HTML is shown on
  students' screens.
- **Send dates as ISO strings.** `<input type="datetime-local">` gives local
  time with no zone, so convert with `new Date(value).toISOString()` in the
  browser before sending, and back to local time for display.
- **Keep images out of the editor.** A pasted image would become base64 inside
  the HTML, and the server takes at most 2 MB per request. `RichText.tsx`
  already leaves out the image button and format.
- **Kambaz loads no Tailwind base reset.** Only the theme and utilities are
  loaded, so a `<button>` keeps the browser's border and background unless its
  classes remove them (`border-none bg-transparent`, or an explicit
  background).
- **Save an answer when the student moves on, not on every keystroke.** With
  Lock Questions After Answering, the first saved answer locks the question.
- **Refer to choices by `_id`, never by position.** Their order changes on
  every load.
- **Auto-submit from the client too.** When the deadline passes, submit what's
  on screen; the server still accepts it for 30 seconds.
- **`points` needs the questions loaded.** Don't `.lean()` quiz queries, which
  drops virtuals, and don't project out `questions` where `points` is shown.
- **Deleting a course still leaves its modules and assignments behind.** Only
  quizzes are cleaned up.

## Open questions

None right now. Your answers are in Decisions, and the assumptions you
accepted are written into Screens.
