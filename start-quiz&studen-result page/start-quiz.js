// Key used to store the quizzes in localStorage
const QUIZ_STORAGE_KEY = "quizzes";

// Number of quizzes shown per page
const QUIZZES_PER_PAGE = 5;

// Sample quiz saved the first time the page opens
const SAMPLE_QUIZZES = [
  {
    id: 1,
    title: "Local History Quiz",
    description: "A short quiz about local history.",
    questions: [
      {
        text: "In what year was the town founded?",
        choices: ["1850", "1875", "1900", "1925"],
        answer: 1
      }
    ]
  }
];

// Page elements
const searchInput = document.getElementById("search-input");
const quizTableBody = document.getElementById("quiz-table-body");
const showingText = document.getElementById("showing-text");
const pageText = document.getElementById("page-text");
const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmMessage = document.getElementById("confirm-message");
const confirmYesButton = document.getElementById("confirm-yes-button");
const confirmNoButton = document.getElementById("confirm-no-button");

let quizzes = [];
let currentPage = 1;

// Get the quizzes from localStorage
function loadQuizzes() {
  try {
    const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    // Bad data, so the sample quiz is saved again below
  }

  saveQuizzes(SAMPLE_QUIZZES);
  return SAMPLE_QUIZZES;
}

// Save the quizzes to localStorage
function saveQuizzes(list) {
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Could not save quizzes:", error);
  }
}

// Get the quizzes that match the search
function getFilteredQuizzes() {
  const search = searchInput.value.trim().toLowerCase();
  return quizzes.filter(function (quiz) {
    return String(quiz.title).toLowerCase().includes(search);
  });
}

// Show the table rows and pagination
function renderTable() {
  const filtered = getFilteredQuizzes();
  const totalPages = Math.max(1, Math.ceil(filtered.length / QUIZZES_PER_PAGE));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * QUIZZES_PER_PAGE;
  const pageQuizzes = filtered.slice(startIndex, startIndex + QUIZZES_PER_PAGE);

  quizTableBody.innerHTML = "";

  if (pageQuizzes.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 3;
    emptyCell.className = "empty-cell";
    emptyCell.textContent = "No quizzes found.";
    emptyRow.appendChild(emptyCell);
    quizTableBody.appendChild(emptyRow);
  }

  pageQuizzes.forEach(function (quiz) {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.className = "quiz-title-cell";
    titleCell.textContent = quiz.title;

    const questionsCell = document.createElement("td");
    questionsCell.textContent = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

    const actionsCell = document.createElement("td");
    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "start-button";
    startButton.textContent = "Start";
    startButton.addEventListener("click", function () {
      openConfirm(quiz);
    });
    actionsCell.appendChild(startButton);

    row.appendChild(titleCell);
    row.appendChild(questionsCell);
    row.appendChild(actionsCell);
    quizTableBody.appendChild(row);
  });

  // Pagination text
  const first = filtered.length === 0 ? 0 : startIndex + 1;
  const last = startIndex + pageQuizzes.length;
  showingText.textContent = "Showing " + first + " to " + last + " of " + filtered.length + " quizzes";
  pageText.textContent = "Page " + currentPage + " of " + totalPages;
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

// Open the confirm popup
function openConfirm(quiz) {
  confirmMessage.textContent = 'Do you really want to start "' + quiz.title + '"?';
  confirmOverlay.hidden = false;
  confirmYesButton.focus();
}

// Close the confirm popup
function closeConfirm() {
  confirmOverlay.hidden = true;
}

// Search
searchInput.addEventListener("input", function () {
  currentPage = 1;
  renderTable();
});

// Pagination buttons
previousButton.addEventListener("click", function () {
  currentPage--;
  renderTable();
});

nextButton.addEventListener("click", function () {
  currentPage++;
  renderTable();
});

// Yes and No only close the popup for now
confirmYesButton.addEventListener("click", closeConfirm);
confirmNoButton.addEventListener("click", closeConfirm);

// Close the popup with the Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !confirmOverlay.hidden) {
    closeConfirm();
  }
});

// Start
quizzes = loadQuizzes();
renderTable();