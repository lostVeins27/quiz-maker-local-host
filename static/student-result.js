const STUDENT_RESULTS_API_ENDPOINT = "/api/student/results";

const resultTableBody = document.getElementById("result-table-body");
const resultStatus = document.getElementById("result-status");

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

function showStatus(message, isError) {
  resultStatus.textContent = message;
  resultStatus.classList.toggle("status-error", isError);
  resultStatus.hidden = false;
}

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

  // New Delete Action Cell
  const actionCell = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-result-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", `Delete result for ${quiz.quizTitle}`);
  
  // Prevent row accordion toggle when clicking the delete button
  deleteBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    deleteResultRecord(quiz.id, row);
  });

  actionCell.appendChild(deleteBtn);

  row.append(nameCell, scoreCell, dateCell, actionCell);
  return row;
}

async function deleteResultRecord(resultId, row) {
  if (!confirm("Are you sure you want to delete this result record?")) {
    return;
  }

  try {
    const response = await fetch(`/api/student/results/${resultId}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = await response.json();

    if (response.ok && data.success) {
      // Remove both the main row and its corresponding details row from DOM
      const detailsRowId = row.getAttribute("aria-controls");
      const detailsRow = document.getElementById(detailsRowId);
      
      row.remove();
      if (detailsRow) {
        detailsRow.remove();
      }

      // Check if table is empty now
      if (resultTableBody.children.length === 0) {
        showStatus("You have not completed any quizzes yet.", false);
      }
    } else {
      alert(data.message || "Could not delete result.");
    }
  } catch (err) {
    console.error("Error deleting result:", err);
    alert("Something went wrong while deleting.");
  }
}

function createDetailsRow(quiz, index) {
  const row = document.createElement("tr");
  row.className = "quiz-details-row";
  row.id = "quiz-details-" + index;
  row.hidden = true;

  const cell = document.createElement("td");
  cell.colSpan = 4; // Updated span to match 4 columns

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

function toggleRow(row) {
  const isOpen = row.getAttribute("aria-expanded") === "true";
  const detailsRow = document.getElementById(row.getAttribute("aria-controls"));

  row.setAttribute("aria-expanded", String(!isOpen));
  detailsRow.hidden = isOpen;
}

resultTableBody.addEventListener("click", function (event) {
  const row = event.target.closest(".quiz-row");
  if (row) {
    toggleRow(row);
  }
});

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