// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// ---- Backend addresses (they must match the routes in the backend) ----
// NOTE: these are the only parts that depend on your backend. Change them to your real routes.
// GET this address: must answer {"success": true, "quizzes": [ ... ]}
const QUIZ_LIST_ENDPOINT = "/quizzes";

// DELETE this address: must answer {"success": true}
function getDeleteEndpoint(quizId) {
  return `/quizzes/${encodeURIComponent(quizId)}`;
}

// GET this address: must answer {"success": true, "quiz": { ... }} with the title, description
// and questions of one quiz (see "How a quiz looks" below). It is used when View or Edit is pressed.
function getQuizEndpoint(quizId) {
  return `/quizzes/${encodeURIComponent(quizId)}`;
}

// PUT this address with the edited quiz as JSON: must answer {"success": true}
function getUpdateEndpoint(quizId) {
  return `/quizzes/${encodeURIComponent(quizId)}`;
}

// The page that creates a quiz.
const CREATE_QUIZ_PAGE_URL = "/create-quiz";

// The dashboard page.
const DASHBOARD_PAGE_URL = "/dashboard";

// How many quizzes are shown on one page.
const QUIZZES_PER_PAGE = 10;

// ---- How a quiz looks (the view box and the edit box read this shape, the edit box also sends it) ----
// {
//   title: "Quiz title",
//   description: "Short description",
//   questions: [
//     { type: "multiple_choice", text: "Question?", choices: { A: "..", B: "..", C: "..", D: ".." }, correctAnswer: "B" },
//     { type: "identification", text: "Question?", correctAnswer: "The answer" }
//   ]
// }
// If your backend uses other names, change only normalizeQuestion() and buildQuizPayload() below.

// The letters of the four choices of a multiple choice question.
const CHOICE_LETTERS = ["A", "B", "C", "D"];

// The two question types.
const MULTIPLE_CHOICE = "multiple_choice";
const IDENTIFICATION = "identification";

// ---- Simulation (for testing without a backend) ----
// true  = the page uses the sample quiz below and never contacts the backend (a delete or an edit only affects the page, and a refresh brings the quiz back).
// false = the page loads, edits and deletes real quizzes using the addresses above.
const USE_SAMPLE_DATA = true;

// The sample quiz shown while USE_SAMPLE_DATA is true.
const SAMPLE_QUIZZES = [
  {
    id: 1,
    title: "Local History Quiz",
    description: "Questions about the history of our town.",
    questions: [
      {
        type: MULTIPLE_CHOICE,
        text: "In what year was the town founded?",
        choices: { A: "1850", B: "1875", C: "1900", D: "1925" },
        correctAnswer: "B",
      },
      {
        type: IDENTIFICATION,
        text: "What is the name of the oldest building in the town square?",
        correctAnswer: "Old Town Hall",
      },
      {
        type: MULTIPLE_CHOICE,
        text: "Which industry first brought settlers to the area?",
        choices: { A: "Farming", B: "Mining", C: "Fishing", D: "Shipping" },
        correctAnswer: "A",
      },
      {
        type: IDENTIFICATION,
        text: "Who was the first mayor of the town?",
        correctAnswer: "Samuel Reyes",
      },
      {
        type: MULTIPLE_CHOICE,
        text: "Which event is held in the town every spring?",
        choices: { A: "Harvest Festival", B: "Founders Day", C: "Flower Parade", D: "Boat Race" },
        correctAnswer: "C",
      },
    ],
  },
  {
    id: 2,
    title: "Basic Geography Quiz",
    description: "A short quiz about capital cities.",
    questions: [
      {
        type: IDENTIFICATION,
        text: "What is the capital city of the Philippines?",
        correctAnswer: "Manila",
      },
    ],
  },
];

// Find each element on the page once, then reuse these variables.
const apiStatusNotice = document.getElementById("api-status-notice");
const createQuizLink = document.getElementById("create-quiz-link");
const dashboardLink = document.getElementById("dashboard-link");
const searchInput = document.getElementById("quiz-search");
const quizTable = document.getElementById("quiz-table");
const quizTableBody = document.getElementById("quiz-table-body");
const quizListMessage = document.getElementById("quiz-list-message");
const pagination = document.getElementById("pagination");
const paginationInfo = document.getElementById("pagination-info");
const previousPageBtn = document.getElementById("previous-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageIndicator = document.getElementById("page-indicator");
const formMessage = document.getElementById("form-message");
const deleteDialog = document.getElementById("delete-dialog");
const deleteDialogText = document.getElementById("delete-dialog-text");
const deleteDialogError = document.getElementById("delete-dialog-error");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const viewQuizSection = document.getElementById("view-quiz-section");
const viewQuizHeading = document.getElementById("view-quiz-heading");
const viewQuizDescription = document.getElementById("view-quiz-description");
const viewQuizStatus = document.getElementById("view-quiz-status");
const viewQuestionsList = document.getElementById("view-questions-list");
const closeViewBtn = document.getElementById("close-view-btn");
const editQuizSection = document.getElementById("edit-quiz-section");
const editQuizHeading = document.getElementById("edit-quiz-heading");
const editQuizStatus = document.getElementById("edit-quiz-status");
const editQuizForm = document.getElementById("edit-quiz-form");
const editQuizFieldset = document.getElementById("edit-quiz-fieldset");
const editQuizTitle = document.getElementById("edit-quiz-title");
const editQuizTitleError = document.getElementById("edit-quiz-title-error");
const editQuizDescription = document.getElementById("edit-quiz-description");
const editQuestionsList = document.getElementById("edit-questions-list");
const editQuestionsError = document.getElementById("edit-questions-error");
const newQuestionType = document.getElementById("new-question-type");
const addQuestionBtn = document.getElementById("add-question-btn");
const editQuizError = document.getElementById("edit-quiz-error");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveQuizBtn = document.getElementById("save-quiz-btn");

// Every quiz received from the backend.
let allQuizzes = [];

// The full sample quizzes (only used while USE_SAMPLE_DATA is true). Saving an edit changes this copy.
let sampleQuizDetails = [];

// The page number being shown (starts at 1).
let currentPage = 1;

// The quiz waiting for the delete confirmation (null when no dialog is open).
let quizToDelete = null;

// true while a delete request is being sent, so it can't be sent twice.
let isDeleting = false;

// The quiz shown in the view box (null when the view box is closed).
let viewingQuiz = null;

// Counts every View press, so an old answer from the backend can be ignored.
let viewRequestId = 0;

// The quiz shown in the edit box (null when the edit box is closed).
let editingQuiz = null;

// The edit form as it was when it opened. It is used to know if there are unsaved changes.
let editSnapshot = "";

// true while the edited quiz is being saved, so it can't be sent twice.
let isSaving = false;

// Counts every Edit press, so an old answer from the backend can be ignored.
let openRequestId = 0;

// Gives every question in the edit box its own number for the ids (they are never reused).
let nextQuestionUid = 1;

// ---- Small helpers ----
// Shows or hides an element.
function setVisible(element, isVisible) {
  element.hidden = !isVisible;
  element.style.display = isVisible ? "" : "none";
}

// Makes an element with an optional class name and text.
function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Shows a message under the page. status is "success", "error" or "warning".
function showFormMessage(message, status) {
  formMessage.textContent = message;
  formMessage.dataset.status = status;
}

// Removes that message.
function clearFormMessage() {
  formMessage.textContent = "";
  delete formMessage.dataset.status;
}

// Shows a message in the table area (loading, empty, no results or error).
function showListMessage(message, status) {
  quizListMessage.textContent = message;
  if (status) {
    quizListMessage.dataset.status = status;
  } else {
    delete quizListMessage.dataset.status;
  }
}

// Turns one quiz from the backend into the shape this page uses.
// It accepts either a "questions" list (like the Create Quiz data) or a question count.
function normalizeQuiz(quiz) {
  const questionCount = Array.isArray(quiz.questions)
    ? quiz.questions.length
    : Number(quiz.questionCount ?? quiz.question_count ?? 0);

  return {
    id: quiz.id,
    title: String(quiz.title ?? ""),
    questionCount,
  };
}

// ---- Search and pages ----
// Returns the quizzes whose title contains the search text.
function getFilteredQuizzes() {
  const searchText = searchInput.value.trim().toLowerCase();

  return allQuizzes.filter((quiz) => quiz.title.toLowerCase().includes(searchText));
}

// Makes one table row for one quiz. Text is added with textContent, so quiz titles can't break the page.
function createQuizRow(quiz) {
  const row = document.createElement("tr");

  const titleCell = document.createElement("td");
  titleCell.dataset.label = "Quiz Title";
  const titleText = document.createElement("span");
  titleText.className = "quiz-title";
  titleText.textContent = quiz.title;
  titleCell.appendChild(titleText);

  const questionsCell = document.createElement("td");
  questionsCell.dataset.label = "Questions";
  questionsCell.textContent = quiz.questionCount;

  const actionsCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "quiz-actions";

  // View button (opens the view box below the list, with the correct answers shown)
  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "view-quiz-btn";
  viewButton.dataset.id = quiz.id;
  viewButton.textContent = "View";
  viewButton.setAttribute("aria-label", `View quiz ${quiz.title}`);

  // Edit button (opens the edit box below the list)
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-quiz-btn";
  editButton.dataset.id = quiz.id;
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit quiz ${quiz.title}`);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-quiz-btn";
  deleteButton.dataset.id = quiz.id;
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete quiz ${quiz.title}`);

  actions.append(viewButton, editButton, deleteButton);
  actionsCell.appendChild(actions);

  row.append(titleCell, questionsCell, actionsCell);
  return row;
}

// Draws the table and the pagination for the current search and page.
function renderQuizList() {
  const filteredQuizzes = getFilteredQuizzes();
  const totalQuizzes = filteredQuizzes.length;
  const totalPages = Math.max(1, Math.ceil(totalQuizzes / QUIZZES_PER_PAGE));

  // Stay on a page that exists (for example after deleting the last quiz of a page).
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (currentPage - 1) * QUIZZES_PER_PAGE;
  const pageQuizzes = filteredQuizzes.slice(startIndex, startIndex + QUIZZES_PER_PAGE);

  quizTableBody.replaceChildren(...pageQuizzes.map(createQuizRow));
  setVisible(quizTable, totalQuizzes > 0);

  if (allQuizzes.length === 0) {
    showListMessage("There are no quizzes yet.");
  } else if (totalQuizzes === 0) {
    showListMessage("No quizzes match your search.");
  } else {
    showListMessage("");
  }

  setVisible(pagination, totalQuizzes > 0);

  if (totalQuizzes > 0) {
    paginationInfo.textContent =
      `Showing ${startIndex + 1} to ${startIndex + pageQuizzes.length} of ${totalQuizzes} quizzes`;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    previousPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }
}

// ---- Loading the quizzes ----
async function loadQuizzes() {
  setVisible(quizTable, false);
  setVisible(pagination, false);
  showListMessage("Loading quizzes...");

  // Simulation: use the sample quiz instead of asking the backend.
  if (USE_SAMPLE_DATA) {
    sampleQuizDetails = JSON.parse(JSON.stringify(SAMPLE_QUIZZES));
    allQuizzes = SAMPLE_QUIZZES.map(normalizeQuiz);
    renderQuizList();
    return;
  }

  try {
    const response = await fetch(QUIZ_LIST_ENDPOINT);
    const data = await response.json();

    if (!response.ok || !data.success || !Array.isArray(data.quizzes)) {
      showListMessage(data.message || "The quizzes could not be loaded.", "error");
      return;
    }

    allQuizzes = data.quizzes.map(normalizeQuiz);
    renderQuizList();
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Loading the quizzes failed:", error);
    showListMessage("Something went wrong. The quizzes could not be loaded.", "error");
  }
}

// ---- Deleting ----
// Opens the confirmation dialog for one quiz.
function openDeleteDialog(quiz) {
  quizToDelete = quiz;
  deleteDialogText.textContent =
    `Are you sure you want to delete "${quiz.title}"? This cannot be undone.`;
  deleteDialogError.textContent = "";
  deleteDialog.showModal();
}

// While deleting: lock the dialog buttons, so the request is not sent twice.
function setDeletingState(deleting) {
  isDeleting = deleting;
  confirmDeleteBtn.disabled = deleting;
  cancelDeleteBtn.disabled = deleting;
  confirmDeleteBtn.textContent = deleting ? "Deleting..." : "Delete";
}

// Runs when the Delete button in the dialog is pressed.
async function confirmDelete() {
  if (isDeleting || !quizToDelete) {
    return;
  }

  const quiz = quizToDelete;
  setDeletingState(true);
  deleteDialogError.textContent = "";

  try {
    let deleted = true;
    let failMessage = "";

    // Simulation: no request is sent, the delete always works.
    if (!USE_SAMPLE_DATA) {
      const response = await fetch(getDeleteEndpoint(quiz.id), { method: "DELETE" });
      const data = await response.json();

      // The delete only counts if the backend answers with {"success": true}
      deleted = response.ok && data.success;
      failMessage = data.message;
    }

    if (deleted) {
      allQuizzes = allQuizzes.filter((item) => item.id !== quiz.id);
      deleteDialog.close();

      // If this quiz is open in the view box, close the box too.
      if (viewingQuiz && String(viewingQuiz.id) === String(quiz.id)) {
        closeViewBox();
      }

      // If this quiz is open in the edit box, close the box too.
      if (editingQuiz && String(editingQuiz.id) === String(quiz.id)) {
        closeEditBox();
      }

      renderQuizList();
      showFormMessage(`"${quiz.title}" was deleted.`, "success");
    } else {
      deleteDialogError.textContent = failMessage || "The quiz could not be deleted.";
    }
  } catch (error) {
    console.error("Deleting the quiz failed:", error);
    deleteDialogError.textContent = "Something went wrong. The quiz has not been deleted. Try again.";
  } finally {
    setDeletingState(false);
  }
}

// ---- Reading a quiz from the backend (used by View and Edit) ----
// Works out the type of a question. A question with choices is multiple choice.
function getQuestionType(question) {
  const type = String(question.type ?? "").toLowerCase().replace(/[^a-z]+/g, "_");

  if (type === MULTIPLE_CHOICE || type === IDENTIFICATION) {
    return type;
  }
  return question.choices ? MULTIPLE_CHOICE : IDENTIFICATION;
}

// Returns the four choices as a list of text (A, B, C, D). Missing choices are empty.
function getChoices(question) {
  const source = question.choices ?? {};

  return CHOICE_LETTERS.map((letter, index) => {
    const choice = Array.isArray(source) ? source[index] : source[letter] ?? source[letter.toLowerCase()];
    return String(choice ?? "");
  });
}

// Turns one question from the backend into the shape the view box and the edit box use.
function normalizeQuestion(question) {
  const type = getQuestionType(question);
  const choices = getChoices(question);
  const text = String(question.text ?? question.question ?? "");
  let correctAnswer = String(question.correctAnswer ?? question.correct_answer ?? question.answer ?? "").trim();

  // A multiple choice answer is a letter (A to D). The text of the choice is also accepted.
  if (type === MULTIPLE_CHOICE) {
    const letter = correctAnswer.toUpperCase();

    if (CHOICE_LETTERS.includes(letter)) {
      correctAnswer = letter;
    } else {
      const choiceIndex = choices.indexOf(correctAnswer);
      correctAnswer = choiceIndex === -1 ? "" : CHOICE_LETTERS[choiceIndex];
    }
  }

  return { type, text, choices, correctAnswer };
}

// Turns one full quiz from the backend into the shape the view box and the edit box use.
function normalizeQuizDetails(quiz) {
  return {
    id: quiz.id,
    title: String(quiz.title ?? ""),
    description: String(quiz.description ?? ""),
    questions: Array.isArray(quiz.questions) ? quiz.questions.map(normalizeQuestion) : [],
  };
}

// ---- Viewing a quiz (read only, with the correct answers shown) ----
// Makes the box of one question. The correct answer is already shown.
function createViewQuestion(question, index) {
  const card = createElement("div", "view-question");

  const header = createElement("div", "view-question-header");
  header.append(
    createElement("h4", "view-question-number", `Question ${index + 1}`),
    createElement(
      "span",
      "question-type-label",
      question.type === MULTIPLE_CHOICE ? "Multiple Choice" : "Identification"
    )
  );
  card.append(header, createElement("p", "view-question-text", question.text));

  if (question.type === MULTIPLE_CHOICE) {
    // The four choices. The correct one is green.
    const list = createElement("ul", "view-choices");

    CHOICE_LETTERS.forEach((letter, choiceIndex) => {
      const item = createElement("li", "view-choice");
      item.append(
        createElement("span", "choice-letter", letter),
        createElement("span", "view-choice-text", question.choices[choiceIndex])
      );

      if (question.correctAnswer === letter) {
        item.classList.add("correct-choice");
        item.append(createElement("span", "correct-mark", "Correct answer"));
      }

      list.append(item);
    });

    card.append(list);
  } else {
    // The correct answer of an identification question
    const answer = createElement("p", "view-answer");
    answer.append(
      createElement("span", "view-answer-label", "Correct Answer: "),
      createElement("span", "view-answer-text", question.correctAnswer)
    );
    card.append(answer);
  }

  return card;
}

// Closes the view box and empties it.
function closeViewBox() {
  // A new number, so an answer that is still on its way from the backend is ignored.
  viewRequestId += 1;
  viewingQuiz = null;

  setVisible(viewQuizSection, false);
  viewQuizStatus.textContent = "";
  viewQuizDescription.textContent = "";
  viewQuestionsList.replaceChildren();
}

// Opens the view box below the list and shows the quiz in it.
async function openViewBox(quiz) {
  if (isSaving) {
    return;
  }

  // This quiz is already open: go back to it.
  if (viewingQuiz && String(viewingQuiz.id) === String(quiz.id)) {
    viewQuizSection.scrollIntoView({ block: "start" });
    return;
  }

  // The edit box is closed first (it asks before throwing away unsaved changes).
  if (editingQuiz) {
    if (!confirmDiscardChanges()) {
      return;
    }
    closeEditBox();
  }

  viewRequestId += 1;
  const requestId = viewRequestId;

  clearFormMessage();
  viewingQuiz = quiz;
  viewQuizHeading.textContent = `View Quiz: ${quiz.title}`;
  viewQuizDescription.textContent = "";
  viewQuestionsList.replaceChildren();
  viewQuizStatus.textContent = "Loading quiz...";
  setVisible(viewQuizSection, true);
  viewQuizSection.scrollIntoView({ block: "start" });

  let details = null;
  let failMessage = "The quiz could not be opened.";

  try {
    if (USE_SAMPLE_DATA) {
      // Simulation: read the quiz from the sample data (it also shows saved edits).
      const sampleQuiz = sampleQuizDetails.find((item) => item.id === quiz.id);
      details = sampleQuiz ? normalizeQuizDetails(sampleQuiz) : null;
    } else {
      const response = await fetch(getQuizEndpoint(quiz.id));
      const data = await response.json();

      if (response.ok && data.success && data.quiz) {
        details = normalizeQuizDetails(data.quiz);
      } else if (data.message) {
        failMessage = data.message;
      }
    }
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Opening the quiz failed:", error);
    failMessage = "Something went wrong. The quiz could not be opened.";
  }

  // Another quiz was opened (or the box was closed) while waiting, so this answer is old.
  if (requestId !== viewRequestId) {
    return;
  }

  if (!details) {
    closeViewBox();
    showFormMessage(failMessage, "error");
    return;
  }

  viewQuizDescription.textContent = details.description;
  viewQuizStatus.textContent = details.questions.length === 0 ? "This quiz has no questions yet." : "";
  viewQuestionsList.replaceChildren(...details.questions.map(createViewQuestion));
}

// ---- Editing: the questions in the edit box ----
// An empty question of the chosen type (used by the Add Question button).
function createEmptyQuestion(type) {
  return { type, text: "", choices: ["", "", "", ""], correctAnswer: "" };
}

// Makes the box of one question. Every question has its own number (uid) for the ids and radio names.
function createQuestionCard(question) {
  const uid = nextQuestionUid;
  nextQuestionUid += 1;

  const card = createElement("div", "question-card");
  card.dataset.type = question.type;

  // Top row: question number, question type and the remove button
  const header = createElement("div", "question-header");
  const number = createElement("h4", "question-number");
  const typeLabel = createElement(
    "span",
    "question-type-label",
    question.type === MULTIPLE_CHOICE ? "Multiple Choice" : "Identification"
  );
  const removeButton = createElement("button", "remove-question-btn", "Remove");
  removeButton.type = "button";
  header.append(number, typeLabel, removeButton);

  // The question text
  const textLabel = createElement("label", "edit-label", "Question");
  textLabel.htmlFor = `question-text-${uid}`;
  const textInput = createElement("textarea", "edit-input question-text-input");
  textInput.id = `question-text-${uid}`;
  textInput.rows = 2;
  textInput.value = question.text;

  card.append(header, textLabel, textInput);

  if (question.type === MULTIPLE_CHOICE) {
    // The four choices, each with a radio button to select the correct one
    const choicesGroup = createElement("fieldset", "choices-fieldset");
    choicesGroup.append(createElement("legend", "edit-label", "Choices (select the correct answer)"));

    CHOICE_LETTERS.forEach((letter, index) => {
      const row = createElement("div", "choice-row");

      const radioLabel = createElement("label", "choice-radio-label");
      const radio = createElement("input", "correct-choice-input");
      radio.type = "radio";
      radio.name = `correct-choice-${uid}`;
      radio.value = letter;
      radio.checked = question.correctAnswer === letter;
      radio.setAttribute("aria-label", `Choice ${letter} is the correct answer`);
      radioLabel.append(radio, createElement("span", "choice-letter", letter));

      const choiceInput = createElement("input", "edit-input choice-input");
      choiceInput.type = "text";
      choiceInput.dataset.letter = letter;
      choiceInput.value = question.choices[index];
      choiceInput.setAttribute("aria-label", `Choice ${letter}`);

      row.append(radioLabel, choiceInput);
      choicesGroup.append(row);
    });

    card.append(choicesGroup);
  } else {
    // The correct answer of an identification question
    const answerField = createElement("div", "answer-field");
    const answerLabel = createElement("label", "edit-label", "Correct Answer");
    answerLabel.htmlFor = `question-answer-${uid}`;
    const answerInput = createElement("input", "edit-input correct-answer-input");
    answerInput.type = "text";
    answerInput.id = `question-answer-${uid}`;
    answerInput.autocomplete = "off";
    answerInput.value = question.correctAnswer;
    answerField.append(answerLabel, answerInput);

    card.append(answerField);
  }

  // The error message of this question
  const errorMessage = createElement("p", "error-message question-error");
  errorMessage.id = `question-error-${uid}`;
  card.append(errorMessage);

  return card;
}

// Writes "Question 1", "Question 2"... again, so the numbers stay in order after adding or removing.
function renumberQuestions() {
  editQuestionsList.querySelectorAll(".question-card").forEach((card, index) => {
    card.querySelector(".question-number").textContent = `Question ${index + 1}`;
    card.querySelector(".remove-question-btn").setAttribute("aria-label", `Remove question ${index + 1}`);
  });
}

// Puts a quiz into the edit form.
function fillEditForm(details) {
  clearEditErrors();
  editQuizTitle.value = details.title;
  editQuizDescription.value = details.description;
  editQuestionsList.replaceChildren(...details.questions.map(createQuestionCard));
  renumberQuestions();
}

// Reads everything the user typed in the edit form.
function readFormData() {
  const questions = Array.from(editQuestionsList.querySelectorAll(".question-card")).map((card) => {
    const type = card.dataset.type;
    const question = {
      type,
      text: card.querySelector(".question-text-input").value.trim(),
    };

    if (type === MULTIPLE_CHOICE) {
      question.choices = CHOICE_LETTERS.map((letter) =>
        card.querySelector(`.choice-input[data-letter="${letter}"]`).value.trim()
      );
      const selectedRadio = card.querySelector(".correct-choice-input:checked");
      question.correctAnswer = selectedRadio ? selectedRadio.value : "";
    } else {
      question.correctAnswer = card.querySelector(".correct-answer-input").value.trim();
    }

    return question;
  });

  return {
    title: editQuizTitle.value.trim(),
    description: editQuizDescription.value.trim(),
    questions,
  };
}

// Turns the form data into what is sent to the backend.
function buildQuizPayload(data) {
  return {
    title: data.title,
    description: data.description,
    questions: data.questions.map((question) => {
      if (question.type === MULTIPLE_CHOICE) {
        return {
          type: question.type,
          text: question.text,
          choices: {
            A: question.choices[0],
            B: question.choices[1],
            C: question.choices[2],
            D: question.choices[3],
          },
          correctAnswer: question.correctAnswer,
        };
      }

      return {
        type: question.type,
        text: question.text,
        correctAnswer: question.correctAnswer,
      };
    }),
  };
}

// ---- Editing: errors ----
// Removes every error message in the edit box.
function clearEditErrors() {
  editQuizError.textContent = "";
  editQuizTitleError.textContent = "";
  editQuestionsError.textContent = "";

  editQuizForm.querySelectorAll(".question-error").forEach((errorMessage) => {
    errorMessage.textContent = "";
  });

  editQuizForm.querySelectorAll("[aria-invalid]").forEach((control) => {
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-describedby");
  });
}

// Checks the form. It shows the errors and returns true only if everything is filled in.
function validateEditForm(data) {
  clearEditErrors();

  let firstInvalidControl = null;

  // Shows one error under a field and remembers the first wrong field.
  function markInvalid(control, errorMessage, message) {
    errorMessage.textContent = message;
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", errorMessage.id);

    if (!firstInvalidControl) {
      firstInvalidControl = control;
    }
  }

  if (!data.title) {
    markInvalid(editQuizTitle, editQuizTitleError, "Enter a quiz title.");
  }

  if (data.questions.length === 0) {
    editQuestionsError.textContent = "Add at least one question.";

    if (!firstInvalidControl) {
      firstInvalidControl = addQuestionBtn;
    }
  }

  const cards = editQuestionsList.querySelectorAll(".question-card");

  data.questions.forEach((question, index) => {
    const card = cards[index];
    const errorMessage = card.querySelector(".question-error");
    const number = index + 1;

    if (!question.text) {
      markInvalid(card.querySelector(".question-text-input"), errorMessage, `Question ${number}: write the question.`);
      return;
    }

    if (question.type === MULTIPLE_CHOICE) {
      const emptyIndex = question.choices.findIndex((choice) => !choice);

      if (emptyIndex !== -1) {
        const letter = CHOICE_LETTERS[emptyIndex];
        markInvalid(
          card.querySelector(`.choice-input[data-letter="${letter}"]`),
          errorMessage,
          `Question ${number}: choice ${letter} is empty.`
        );
        return;
      }

      if (!question.correctAnswer) {
        markInvalid(card.querySelector(".correct-choice-input"), errorMessage, `Question ${number}: select the correct answer.`);
      }
    } else if (!question.correctAnswer) {
      markInvalid(card.querySelector(".correct-answer-input"), errorMessage, `Question ${number}: write the correct answer.`);
    }
  });

  if (firstInvalidControl) {
    editQuizError.textContent = "Please fix the errors above.";
    firstInvalidControl.focus();
    return false;
  }

  return true;
}

// ---- Editing: opening, closing and saving ----
// true if the form has changes that were not saved.
function isEditFormDirty() {
  return editingQuiz !== null && editSnapshot !== "" && JSON.stringify(readFormData()) !== editSnapshot;
}

// Asks before throwing away unsaved changes. Returns true if it is fine to continue.
function confirmDiscardChanges() {
  if (!isEditFormDirty()) {
    return true;
  }
  return window.confirm("You have unsaved changes. Discard them?");
}

// While saving: lock the whole form, so the quiz can't be sent twice or changed.
function setSavingState(saving) {
  isSaving = saving;
  editQuizFieldset.disabled = saving;
  saveQuizBtn.textContent = saving ? "Saving..." : "Save Changes";
}

// Closes the edit box and empties it.
function closeEditBox() {
  // A new number, so an answer that is still on its way from the backend is ignored.
  openRequestId += 1;
  editingQuiz = null;
  editSnapshot = "";

  setVisible(editQuizSection, false);
  setVisible(editQuizForm, false);
  editQuizStatus.textContent = "";
  editQuizForm.reset();
  editQuestionsList.replaceChildren();
  clearEditErrors();
}

// Opens the edit box below the list and shows the quiz in it.
async function openEditBox(quiz) {
  if (isSaving) {
    return;
  }

  // This quiz is already open: go back to its form.
  if (editingQuiz && String(editingQuiz.id) === String(quiz.id)) {
    editQuizSection.scrollIntoView({ block: "start" });
    editQuizTitle.focus({ preventScroll: true });
    return;
  }

  if (!confirmDiscardChanges()) {
    return;
  }

  openRequestId += 1;
  const requestId = openRequestId;

  clearFormMessage();
  // Only one box is open at a time, so the view box is closed.
  closeViewBox();
  clearEditErrors();
  editingQuiz = quiz;
  editSnapshot = "";
  editQuizHeading.textContent = `Edit Quiz: ${quiz.title}`;
  editQuizStatus.textContent = "Loading quiz...";
  setVisible(editQuizForm, false);
  setVisible(editQuizSection, true);
  editQuizSection.scrollIntoView({ block: "start" });

  let details = null;
  let failMessage = "The quiz could not be opened.";

  try {
    if (USE_SAMPLE_DATA) {
      // Simulation: read the quiz from the sample data.
      const sampleQuiz = sampleQuizDetails.find((item) => item.id === quiz.id);
      details = sampleQuiz ? normalizeQuizDetails(sampleQuiz) : null;
    } else {
      const response = await fetch(getQuizEndpoint(quiz.id));
      const data = await response.json();

      if (response.ok && data.success && data.quiz) {
        details = normalizeQuizDetails(data.quiz);
      } else if (data.message) {
        failMessage = data.message;
      }
    }
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Opening the quiz failed:", error);
    failMessage = "Something went wrong. The quiz could not be opened.";
  }

  // Another quiz was opened (or the box was closed) while waiting, so this answer is old.
  if (requestId !== openRequestId) {
    return;
  }

  if (!details) {
    closeEditBox();
    showFormMessage(failMessage, "error");
    return;
  }

  fillEditForm(details);
  editSnapshot = JSON.stringify(readFormData());
  editQuizStatus.textContent = "";
  setVisible(editQuizForm, true);
  editQuizTitle.focus({ preventScroll: true });
}

// Runs when Save Changes is pressed.
async function saveQuiz() {
  if (isSaving || !editingQuiz) {
    return;
  }

  const quiz = editingQuiz;
  const formData = readFormData();

  if (!validateEditForm(formData)) {
    return;
  }

  const payload = buildQuizPayload(formData);
  setSavingState(true);

  try {
    let saved = true;
    let failMessage = "";

    if (USE_SAMPLE_DATA) {
      // Simulation: no request is sent, the sample quiz is changed instead.
      const sampleIndex = sampleQuizDetails.findIndex((item) => item.id === quiz.id);

      if (sampleIndex !== -1) {
        sampleQuizDetails[sampleIndex] = { id: quiz.id, ...payload };
      }
    } else {
      const response = await fetch(getUpdateEndpoint(quiz.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      // The save only counts if the backend answers with {"success": true}
      saved = response.ok && result.success;
      failMessage = result.message;
    }

    // The edit box was closed while saving (the quiz was deleted), so there is nothing to update.
    if (editingQuiz !== quiz) {
      return;
    }

    if (saved) {
      quiz.title = payload.title;
      quiz.questionCount = payload.questions.length;
      closeEditBox();
      renderQuizList();
      showFormMessage(`"${quiz.title}" was saved.`, "success");
    } else {
      editQuizError.textContent = failMessage || "The quiz could not be saved.";
    }
  } catch (error) {
    console.error("Saving the quiz failed:", error);

    if (editingQuiz === quiz) {
      editQuizError.textContent = "Something went wrong. The quiz has not been saved. Try again.";
    }
  } finally {
    setSavingState(false);
  }
}

// ---- Buttons and events ----
// Search: show the first page of the matching quizzes while typing.
searchInput.addEventListener("input", () => {
  currentPage = 1;
  clearFormMessage();
  renderQuizList();
});

// Previous and Next buttons.
previousPageBtn.addEventListener("click", () => {
  currentPage -= 1;
  renderQuizList();
});

nextPageBtn.addEventListener("click", () => {
  currentPage += 1;
  renderQuizList();
});

// View, Edit and Delete buttons. One listener on the table also works for rows drawn later.
quizTableBody.addEventListener("click", (event) => {
  const viewButton = event.target.closest(".view-quiz-btn");
  const editButton = event.target.closest(".edit-quiz-btn");
  const deleteButton = event.target.closest(".delete-quiz-btn");

  if (viewButton) {
    const quiz = allQuizzes.find((item) => String(item.id) === viewButton.dataset.id);

    if (quiz) {
      openViewBox(quiz);
    }
  }

  if (editButton) {
    const quiz = allQuizzes.find((item) => String(item.id) === editButton.dataset.id);

    if (quiz) {
      openEditBox(quiz);
    }
  }

  if (deleteButton) {
    clearFormMessage();
    const quiz = allQuizzes.find((item) => String(item.id) === deleteButton.dataset.id);

    if (quiz) {
      openDeleteDialog(quiz);
    }
  }
});

// Dialog buttons.
confirmDeleteBtn.addEventListener("click", confirmDelete);
cancelDeleteBtn.addEventListener("click", () => deleteDialog.close());

// Stop the Escape key from closing the dialog while a delete is being sent.
deleteDialog.addEventListener("cancel", (event) => {
  if (isDeleting) {
    event.preventDefault();
  }
});

// View box: Close button.
closeViewBtn.addEventListener("click", closeViewBox);

// Edit box: Add Question button.
addQuestionBtn.addEventListener("click", () => {
  const type = newQuestionType.value === IDENTIFICATION ? IDENTIFICATION : MULTIPLE_CHOICE;
  const card = createQuestionCard(createEmptyQuestion(type));

  editQuestionsList.append(card);
  editQuestionsError.textContent = "";
  renumberQuestions();
  card.querySelector(".question-text-input").focus();
});

// Edit box: Remove buttons of the questions. One listener on the list also works for new questions.
editQuestionsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-question-btn");

  if (!removeButton) {
    return;
  }

  const card = removeButton.closest(".question-card");
  const nextCard = card.nextElementSibling || card.previousElementSibling;

  card.remove();
  renumberQuestions();

  // The old messages mention question numbers that just changed, so remove them.
  clearEditErrors();

  // Keep the keyboard focus inside the form.
  if (nextCard) {
    nextCard.querySelector(".question-text-input").focus();
  } else {
    addQuestionBtn.focus();
  }
});

// Edit box: Save Changes (the form is also sent with the Enter key).
editQuizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveQuiz();
});

// Edit box: Cancel button.
cancelEditBtn.addEventListener("click", () => {
  if (confirmDiscardChanges()) {
    closeEditBox();
  }
});

// When the page loads: set the header links, then load the quizzes.
createQuizLink.href = CREATE_QUIZ_PAGE_URL;
dashboardLink.href = DASHBOARD_PAGE_URL;
setVisible(apiStatusNotice, !QUIZ_LIST_ENDPOINT);

if (QUIZ_LIST_ENDPOINT) {
  loadQuizzes();
} else {
  showListMessage("");
}