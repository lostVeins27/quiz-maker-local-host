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

// The page that edits a quiz. It is in the same folder as this page, and the quiz id
// is added to the address (edit-quiz.html?id=3), so the edit page knows which quiz to open.
function getEditPageUrl(quizId) {
  return `edit-quiz.html?id=${encodeURIComponent(quizId)}`;
}

// The page that creates a quiz.
const CREATE_QUIZ_PAGE_URL = "/create-quiz";

// How many quizzes are shown on one page.
const QUIZZES_PER_PAGE = 10;

// ---- Simulation (for testing without a backend) ----
// true  = the page uses the sample quiz below and never contacts the backend (a delete only affects the page, and a refresh brings the quiz back).
// false = the page loads and deletes real quizzes using the addresses above.
const USE_SAMPLE_DATA = true;

// The sample quiz shown while USE_SAMPLE_DATA is true.
const SAMPLE_QUIZZES = [
  { id: 1, title: "Local History Quiz", questionCount: 5 },
];

// Find each element on the page once, then reuse these variables.
const apiStatusNotice = document.getElementById("api-status-notice");
const createQuizLink = document.getElementById("create-quiz-link");
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

// Every quiz received from the backend.
let allQuizzes = [];

// The page number being shown (starts at 1).
let currentPage = 1;

// The quiz waiting for the delete confirmation (null when no dialog is open).
let quizToDelete = null;

// true while a delete request is being sent, so it can't be sent twice.
let isDeleting = false;

// ---- Small helpers ----
// Shows or hides an element.
function setVisible(element, isVisible) {
  element.hidden = !isVisible;
  element.style.display = isVisible ? "" : "none";
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

  const editLink = document.createElement("a");
  editLink.className = "edit-quiz-link";
  editLink.href = getEditPageUrl(quiz.id);
  editLink.textContent = "Edit";
  editLink.setAttribute("aria-label", `Edit quiz ${quiz.title}`);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-quiz-btn";
  deleteButton.dataset.id = quiz.id;
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete quiz ${quiz.title}`);

  actions.append(editLink, deleteButton);
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

// Delete buttons. One listener on the table also works for rows drawn later.
quizTableBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-quiz-btn");

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

// When the page loads: set the create quiz link, then load the quizzes.
createQuizLink.href = CREATE_QUIZ_PAGE_URL;
setVisible(apiStatusNotice, !QUIZ_LIST_ENDPOINT);

if (QUIZ_LIST_ENDPOINT) {
  loadQuizzes();
} else {
  showListMessage("");
}