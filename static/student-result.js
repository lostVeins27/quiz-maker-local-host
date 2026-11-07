// api link for the student results, set the real one from the back-end dev
const STUDENT_RESULTS_API_ENDPOINT = "";

// the api should send a list, one item for each completed quiz:
// { quizTitle, score, totalQuestions, timeTaken (in seconds), submittedAt (date and time) }

// sample quizzes to preview the page, shown only while the api link is empty
const sampleQuizResults = [
  {
    quizTitle: "Algebra Basics",
    score: 18,
    totalQuestions: 20,
    timeTaken: 750,
    submittedAt: "2026-11-05T10:25:42",
  },
  {
    quizTitle: "World History Midterm",
    score: 15,
    totalQuestions: 20,
    timeTaken: 1325,
    submittedAt: "2026-11-03T14:10:08",
  },
];

const resultTableBody = document.getElementById("result-table-body");
const resultStatus = document.getElementById("result-status");

// get the results from the api
async function loadResults() {
  if (!STUDENT_RESULTS_API_ENDPOINT) {
    showResults(sampleQuizResults);
    return;
  }

  showStatus("Loading results...", false);

  try {
    const response = await fetch(STUDENT_RESULTS_API_ENDPOINT, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Request failed with status " + response.status);
    }

    const quizResults = await response.json();

    if (!Array.isArray(quizResults)) {
      throw new Error("Unexpected data from the server");
    }

    showResults(quizResults);
  } catch (error) {
    console.error("Could not load results:", error);
    showStatus("Could not load your results. Please try again later.", true);
  }
}

// show a message under the table header
function showStatus(message, isError) {
  resultStatus.textContent = message;
  resultStatus.classList.toggle("status-error", isError);
  resultStatus.hidden = false;
}

// fill the table
function showResults(quizResults) {
  resultTableBody.replaceChildren();

  if (quizResults.length === 0) {
    showStatus("You have not completed any quizzes yet.", false);
    return;
  }

  resultStatus.hidden = true;

  quizResults.forEach(function (quiz, index) {
    resultTableBody.append(createQuizRow(quiz, index), createDetailsRow(quiz, index));
  });
}

// the row that shows in the table
function createQuizRow(quiz, index) {
  const row = document.createElement("tr");
  row.className = "quiz-row";
  row.tabIndex = 0;
  row.setAttribute("aria-expanded", "false");
  row.setAttribute("aria-controls", "quiz-details-" + index);

  const nameCell = document.createElement("td");
  const arrow = document.createElement("span");
  arrow.className = "row-arrow";
  arrow.setAttribute("aria-hidden", "true");
  nameCell.append(arrow, quiz.quizTitle);

  const scoreCell = document.createElement("td");
  scoreCell.textContent = formatScore(quiz);

  const dateCell = document.createElement("td");
  dateCell.textContent = formatDate(getSubmittedDate(quiz), "short");

  row.append(nameCell, scoreCell, dateCell);
  return row;
}

// the row that opens under a quiz row
function createDetailsRow(quiz, index) {
  const row = document.createElement("tr");
  row.className = "quiz-details-row";
  row.id = "quiz-details-" + index;
  row.hidden = true;

  const cell = document.createElement("td");
  cell.colSpan = 3;

  const submittedDate = getSubmittedDate(quiz);
  const list = document.createElement("dl");
  list.className = "quiz-details-list";
  list.append(
    createDetail("Score", formatScore(quiz)),
    createDetail("Time Taken", formatTimeTaken(quiz.timeTaken)),
    createDetail("Date Answered", formatDate(submittedDate, "long")),
    createDetail("Time Answered", formatTime(submittedDate))
  );

  cell.append(list);
  row.append(cell);
  return row;
}

// one label and value box inside the details
function createDetail(label, value) {
  const item = document.createElement("div");
  item.className = "detail-item";

  const term = document.createElement("dt");
  term.className = "detail-label";
  term.textContent = label;

  const description = document.createElement("dd");
  description.className = "detail-value";
  description.textContent = value;

  item.append(term, description);
  return item;
}

function formatScore(quiz) {
  return quiz.score + "/" + quiz.totalQuestions;
}

function getSubmittedDate(quiz) {
  return quiz.submittedAt ? new Date(quiz.submittedAt) : new Date(NaN);
}

// example: Nov 5, 2026 (short) or November 5, 2026 (long)
function formatDate(date, monthStyle) {
  if (isNaN(date)) {
    return "N/A";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: monthStyle,
    day: "numeric",
  });
}

// example: 10:25:42 AM
function formatTime(date) {
  if (isNaN(date)) {
    return "N/A";
  }
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

// example: 12 min 30 sec
function formatTimeTaken(totalSeconds) {
  const seconds = Number(totalSeconds);

  if (totalSeconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "N/A";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];

  if (hours) {
    parts.push(hours + " hr");
  }
  if (minutes) {
    parts.push(minutes + " min");
  }
  if (secs || parts.length === 0) {
    parts.push(secs + " sec");
  }

  return parts.join(" ");
}

// open or close the details of a quiz row
function toggleRow(row) {
  const isOpen = row.getAttribute("aria-expanded") === "true";
  const detailsRow = document.getElementById(row.getAttribute("aria-controls"));

  row.setAttribute("aria-expanded", String(!isOpen));
  detailsRow.hidden = isOpen;
}

// click on a quiz row
resultTableBody.addEventListener("click", function (event) {
  const row = event.target.closest(".quiz-row");
  if (row) {
    toggleRow(row);
  }
});

// Enter or Space on a focused quiz row
resultTableBody.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const row = event.target.closest(".quiz-row");
  if (row) {
    event.preventDefault();
    toggleRow(row);
  }
});

loadResults();