// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// ---- Backend addresses (they must match the routes in the backend) ----
// NOTE: these are the only parts that depend on your backend. Change them to your real routes.
// GET this address: must answer {"success": true, "quizzes": [ ... ]}
// Each quiz needs an "id" and a "title". It can also have "submittedCount" (how many students submitted)
// and "isActive" (true or false). If your backend uses other names, change only normalizeQuiz().
const QUIZ_LIST_ENDPOINT = "/quizzes";

// The page that opens when a quiz is pressed (professor-result.html).
// This is the same route its Refresh button uses. The quiz id is added to the address,
// for example /result?quizId=1
const RESULT_DETAILS_PAGE_URL = "/result";

// The dashboard page.
const DASHBOARD_PAGE_URL = "/dashboard";

// How many quizzes are shown on one page.
const QUIZZES_PER_PAGE = 10;

// Builds the address of the results page of one quiz.
function getResultDetailsUrl(quizId) {
  return `${RESULT_DETAILS_PAGE_URL}?quizId=${encodeURIComponent(quizId)}`;
}

// ---- Simulation (for testing without a backend) ----
// true  = the page uses the sample quizzes below and never contacts the backend.
// false = the page loads the real quizzes using the address above.
const USE_SAMPLE_DATA = false;

// The sample quizzes shown while USE_SAMPLE_DATA is true.
const SAMPLE_QUIZZES = [
  { id: 1, title: "Local History Quiz", submittedCount: 3, isActive: true },
  { id: 2, title: "Basic Geography Quiz", submittedCount: 1, isActive: true },
  { id: 3, title: "Science Midterm Quiz", submittedCount: 0, isActive: false },
];

// Find each element on the page once, then reuse these variables.
const apiStatusNotice = document.getElementById("api-status-notice");
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

// Every quiz received from the backend.
let allQuizzes = [];

// The page number being shown (starts at 1).
let currentPage = 1;

// ---- Small helpers ----
// Shows or hides an element.
function setVisible(element, isVisible) {
  element.hidden = !isVisible;
  element.style.display = isVisible ? "" : "none";
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

// true if the backend says the quiz is active (isActive true, or status "active")
function isQuizActive(quiz) {
  if (typeof quiz.isActive === "boolean") {
    return quiz.isActive;
  }
  if (typeof quiz.is_active === "boolean") {
    return quiz.is_active;
  }
  return String(quiz.status ?? "").toLowerCase() === "active";
}

// Turns one quiz from the backend into the shape this page uses.
function normalizeQuiz(quiz) {
  return {
    id: quiz.id,
    title: String(quiz.title ?? ""),
    submittedCount: Math.max(0, Math.floor(Number(quiz.submittedCount ?? quiz.submitted_count ?? quiz.submitted)) || 0),
    isActive: isQuizActive(quiz),
  };
}

// ---- Search and pages ----
// Returns the quizzes whose name contains the search text.
function getFilteredQuizzes() {
  const searchText = searchInput.value.trim().toLowerCase();

  return allQuizzes.filter((quiz) => quiz.title.toLowerCase().includes(searchText));
}

// Makes one table row for one quiz. Text is added with textContent, so quiz names can't break the page.
function createQuizRow(quiz) {
  const row = document.createElement("tr");
  row.className = "quiz-row";

  const titleCell = document.createElement("td");

  // A real link, so it also works with the keyboard (Tab and Enter)
  const titleLink = document.createElement("a");
  titleLink.className = "quiz-title-link";
  titleLink.href = getResultDetailsUrl(quiz.id);
  titleLink.textContent = quiz.title;
  titleLink.setAttribute("aria-label", `View results of ${quiz.title}`);

  titleCell.appendChild(titleLink);

  // Middle column: how many students submitted, written like #3
  const submittedCell = document.createElement("td");
  submittedCell.dataset.label = "Submitted";
  submittedCell.textContent = `#${quiz.submittedCount}`;

  // Last column: is the quiz active or not
  const statusCell = document.createElement("td");
  statusCell.dataset.label = "Status";
  const statusBadge = document.createElement("span");
  statusBadge.className = `quiz-status ${quiz.isActive ? "is-active" : "is-inactive"}`;
  statusBadge.textContent = quiz.isActive ? "Active" : "Not active";
  statusCell.appendChild(statusBadge);

  row.append(titleCell, submittedCell, statusCell);
  return row;
}

// Draws the table and the pagination for the current search and page.
function renderQuizList() {
  const filteredQuizzes = getFilteredQuizzes();
  const totalQuizzes = filteredQuizzes.length;
  const totalPages = Math.max(1, Math.ceil(totalQuizzes / QUIZZES_PER_PAGE));

  // Stay on a page that exists.
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

  // Simulation: use the sample quizzes instead of asking the backend.
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

// ---- Buttons and events ----
// Search: show the first page of the matching quizzes while typing.
searchInput.addEventListener("input", () => {
  currentPage = 1;
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

// Pressing anywhere on a row opens that quiz's page (pressing the link itself already works).
// One listener on the table also works for rows drawn later.
quizTableBody.addEventListener("click", (event) => {
  const row = event.target.closest(".quiz-row");

  if (!row || event.target.closest("a")) {
    return;
  }

  const link = row.querySelector(".quiz-title-link");

  if (link) {
    window.location.href = link.href;
  }
});

// When the page loads: set the header link, then load the quizzes.
dashboardLink.href = DASHBOARD_PAGE_URL;
setVisible(apiStatusNotice, !QUIZ_LIST_ENDPOINT);

if (QUIZ_LIST_ENDPOINT) {
  loadQuizzes();
} else {
  showListMessage("");
}