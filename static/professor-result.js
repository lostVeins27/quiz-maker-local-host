"use strict";

function getResultsEndpoint(quizId) {
  return `/quizzes/${encodeURIComponent(quizId)}/results`;
}

const DASHBOARD_PAGE_URL = "/dashboard";
const QUIZ_LIST_PAGE_URL = "/result-main";

const USE_SAMPLE_DATA = false;

const SAMPLE_RESULTS = {
  1: {
    quiz: { title: "Local History Quiz", status: "active", timeRemainingSeconds: 600 },
    results: [
      { email: "john@example.com", name: "John Doe", score: 18, total: 20, timeTaken: 11, timeFinished: "2026-11-08T07:25:42" },
      { email: "jane@example.com", name: "Jane Smith", score: 20, total: 20, timeTaken: 45, timeFinished: "2026-11-08T07:30:08" },
    ],
  },
};

const backBtn = document.getElementById("backBtn");
const backToListBtn = document.getElementById("backToListBtn");
const quizStatus = document.getElementById("quizStatus");
const resultsTitle = document.getElementById("resultsTitle");
const submittedCount = document.getElementById("submittedCount");
const averageScore = document.getElementById("averageScore");
const timeRemaining = document.getElementById("timeRemaining");
const refreshBtn = document.getElementById("refreshBtn");
const resultsMessage = document.getElementById("resultsMessage");
const resultRows = document.getElementById("resultRows");

const quizId = new URLSearchParams(window.location.search).get("quizId");

let loadRequestId = 0;
let countdownTimer = null;
let secondsLeft = 0;

function showMessage(message, status) {
  resultsMessage.textContent = message;
  if (status) {
    resultsMessage.dataset.status = status;
  } else {
    delete resultsMessage.dataset.status;
  }
}

function setStatus(status) {
  quizStatus.textContent = status === "active" ? "Active" : "Inactive";
}

function showTimeRemaining() {
  if (secondsLeft < 0) {
    timeRemaining.textContent = "Infinite";
    return;
  }
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  timeRemaining.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(seconds) {
  stopCountdown();
  secondsLeft = seconds;
  showTimeRemaining();

  if (secondsLeft <= 0) {
    return;
  }

  countdownTimer = setInterval(function () {
    secondsLeft -= 1;
    showTimeRemaining();

    if (secondsLeft <= 0) {
      stopCountdown();
    }
  }, 1000);
}

function getAverageScore(results) {
  const scored = results.filter((result) => result.total > 0);

  if (scored.length === 0) {
    return "0%";
  }

  const sum = scored.reduce((total, result) => total + result.score / result.total, 0);
  return `${Math.round((sum / scored.length) * 100)}%`;
}

function normalizeResultsData(data) {
  const quiz = data.quiz ?? {};
  const results = Array.isArray(data.results) ? data.results : [];

  let rawTime = Number(quiz.timeRemainingSeconds);
  if (isNaN(rawTime)) rawTime = -1;

  return {
    title: String(quiz.title ?? ""),
    status: String(quiz.status ?? "").toLowerCase() === "active" ? "active" : "inactive",
    timeRemainingSeconds: rawTime,
    results: results.map((result) => ({
      email: String(result.email ?? ""),
      name: String(result.name ?? ""),
      score: Number(result.score) || 0,
      total: Number(result.total) || 0,
      timeTaken: Number(result.timeTaken) || 0,
      timeFinished: String(result.timeFinished ?? ""),
    })),
  };
}

function getSubmittedDate(timeFinishedStr) {
  return timeFinishedStr ? new Date(timeFinishedStr) : new Date(NaN);
}

function formatDate(date) {
  if (isNaN(date)) {
    return "N/A";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
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
    parts.push(hours + "h");
  }
  if (minutes) {
    parts.push(minutes + "m");
  }
  if (secs || parts.length === 0) {
    parts.push(secs + "s");
  }

  return parts.join(" ");
}

// Function to handle allowing a student to retake
async function allowRetake(studentEmail, rowElement) {
  if (!confirm(`Are you sure you want to allow this student to retake the quiz?`)) {
    return;
  }

  try {
    const response = await fetch(`/quizzes/${encodeURIComponent(quizId)}/results/${encodeURIComponent(studentEmail)}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (response.ok && data.success) {
      rowElement.remove();
      loadResults(); // Reload results/summary numbers
    } else {
      alert(data.message || "Failed to allow retake.");
    }
  } catch (error) {
    console.error("Error allowing retake:", error);
    alert("Something went wrong.");
  }
}

// Creates row elements matching 6 columns: Name, Score, Time Taken, Date Finished, Time Finished, Action
function createResultRow(result) {
  const row = document.createElement("div");
  row.className = "resultRow";

  const name = document.createElement("span");
  name.textContent = result.name;

  const score = document.createElement("span");
  score.textContent = `${result.score}/${result.total}`;

  const timeTakenSpan = document.createElement("span");
  timeTakenSpan.textContent = formatTimeTaken(result.timeTaken);

  const submittedDate = getSubmittedDate(result.timeFinished);

  const dateFinishedSpan = document.createElement("span");
  dateFinishedSpan.textContent = formatDate(submittedDate);

  const timeFinishedSpan = document.createElement("span");
  timeFinishedSpan.textContent = formatTime(submittedDate);

  const actionSpan = document.createElement("span");
  const retakeBtn = document.createElement("button");
  retakeBtn.type = "button";
  retakeBtn.className = "retake-btn";
  retakeBtn.textContent = "Retake";
  retakeBtn.addEventListener("click", () => allowRetake(result.email, row));
  actionSpan.appendChild(retakeBtn);

  row.append(name, score, timeTakenSpan, dateFinishedSpan, timeFinishedSpan, actionSpan);
  return row;
}

function renderResults(details) {
  resultsTitle.textContent = details.title ? `${details.title} Result` : "Result";
  setStatus(details.status);

  submittedCount.textContent = String(details.results.length);
  averageScore.textContent = getAverageScore(details.results);
  startCountdown(details.status === "active" ? details.timeRemainingSeconds : 0);

  resultRows.replaceChildren(...details.results.map(createResultRow));
  showMessage(details.results.length === 0 ? "No students have submitted yet." : "");
}

async function loadResults() {
  if (!quizId) {
    showMessage("No quiz was selected. Go back to the quiz list and choose a quiz.", "error");
    return;
  }

  loadRequestId += 1;
  const requestId = loadRequestId;

  refreshBtn.disabled = true;
  showMessage("Loading results...");

  try {
    let ok = false;
    let data = {};

    if (USE_SAMPLE_DATA) {
      const sample = SAMPLE_RESULTS[quizId];
      ok = Boolean(sample);
      data = sample ?? { message: "This quiz was not found." };
    } else {
      const response = await fetch(getResultsEndpoint(quizId));
      data = await response.json();
      ok = response.ok && data.success;
    }

    if (requestId !== loadRequestId) {
      return;
    }

    if (!ok) {
      showMessage(data.message || "The results could not be loaded.", "error");
      return;
    }

    renderResults(normalizeResultsData(data));
  } catch (error) {
    console.error("Loading the results failed:", error);

    if (requestId === loadRequestId) {
      showMessage("Something went wrong. The results could not be loaded.", "error");
    }
  } finally {
    if (requestId === loadRequestId) {
      refreshBtn.disabled = false;
    }
  }
}

backBtn.addEventListener("click", function () {
  window.location.href = DASHBOARD_PAGE_URL;
});

backToListBtn.addEventListener("click", function () {
  window.location.href = QUIZ_LIST_PAGE_URL;
});

refreshBtn.addEventListener("click", loadResults);

loadResults();