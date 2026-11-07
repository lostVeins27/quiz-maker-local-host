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
      { name: "John Doe", score: 18, total: 20, timeFinished: "2026-11-08T07:25:42" },
      { name: "Jane Smith", score: 20, total: 20, timeFinished: "2026-11-08T07:30:08" },
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
      name: String(result.name ?? ""),
      score: Number(result.score) || 0,
      total: Number(result.total) || 0,
      timeFinished: String(result.timeFinished ?? ""),
    })),
  };
}

// Helpers for formatting date and time cleanly
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

// Creates row elements matching 4 columns: Name, Score, Date Finished, Time Finished
function createResultRow(result) {
  const row = document.createElement("div");
  row.className = "resultRow";

  const name = document.createElement("span");
  name.textContent = result.name;

  const score = document.createElement("span");
  score.textContent = `${result.score}/${result.total}`;

  const submittedDate = getSubmittedDate(result.timeFinished);

  const dateFinishedSpan = document.createElement("span");
  dateFinishedSpan.textContent = formatDate(submittedDate);

  const timeFinishedSpan = document.createElement("span");
  timeFinishedSpan.textContent = formatTime(submittedDate);

  row.append(name, score, dateFinishedSpan, timeFinishedSpan);
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