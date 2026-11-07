// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// ---- Backend addresses (they must match the routes in the backend) ----
// NOTE: these are the only parts that depend on your backend. Change them to your real routes.

// GET this address: must answer {"success": true, "quiz": { ... }, "results": [ ... ]} (see "How the results look" below).
function getResultsEndpoint(quizId) {
  return `/quizzes/${encodeURIComponent(quizId)}/results`;
}

// The dashboard page.
const DASHBOARD_PAGE_URL = "/dashboard";

// The quiz list page (the Back button goes here).
const QUIZ_LIST_PAGE_URL = "/result-main";

// ---- How the results look (the page reads this shape) ----
// {
//   success: true,
//   quiz: { title: "Quiz title", status: "active" or "ended", timeRemainingSeconds: 600 },
//   results: [
//     { name: "John Doe", score: 18, total: 20, timeFinished: "10:25 AM" }
//   ]
// }
// If your backend uses other names, change only normalizeResultsData() below.

// ---- Simulation (for testing without a backend) ----
// true  = the page uses the sample quizzes below and never contacts the backend.
// false = the page loads the real results using the address above.
const USE_SAMPLE_DATA = true;

// The sample quizzes shown while USE_SAMPLE_DATA is true. The keys are the quiz ids from the quiz list.
const SAMPLE_RESULTS = {
  1: {
    quiz: { title: "Local History Quiz", status: "active", timeRemainingSeconds: 600 },
    results: [
      { name: "John Doe", score: 18, total: 20, timeFinished: "10:25 AM" },
      { name: "Jane Smith", score: 20, total: 20, timeFinished: "10:30 AM" },
      { name: "Alex Cruz", score: 15, total: 20, timeFinished: "10:35 AM" },
    ],
  },
  2: {
    quiz: { title: "Basic Geography Quiz", status: "active", timeRemainingSeconds: 300 },
    results: [{ name: "Maria Santos", score: 1, total: 1, timeFinished: "9:12 AM" }],
  },
  3: {
    quiz: { title: "Science Midterm Quiz", status: "ended", timeRemainingSeconds: 0 },
    results: [],
  },
};

// Find each element on the page once, then reuse these variables.
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

// The quiz that was pressed in the quiz list (the address looks like /result?quizId=1).
const quizId = new URLSearchParams(window.location.search).get("quizId");

// Counts every load, so an old answer from the backend can be ignored.
let loadRequestId = 0;

// The countdown of the time remaining.
let countdownTimer = null;
let secondsLeft = 0;

// ---- Small helpers ----
// Shows a message in the results table (loading, empty or error). An empty text hides it.
function showMessage(message, status) {
  resultsMessage.textContent = message;
  if (status) {
    resultsMessage.dataset.status = status;
  } else {
    delete resultsMessage.dataset.status;
  }
}

// Writes "Active" or "Ended".
function setStatus(status) {
  quizStatus.textContent = status === "active" ? "Active" : "Ended";
}

// Writes the time remaining as minutes:seconds, for example 09:05.
function showTimeRemaining() {
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

// Starts counting down from the given seconds (0 = nothing to count).
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

// The average of all the scores as a percentage, for example "84%". Without scores it is "0%".
function getAverageScore(results) {
  const scored = results.filter((result) => result.total > 0);

  if (scored.length === 0) {
    return "0%";
  }

  const sum = scored.reduce((total, result) => total + result.score / result.total, 0);
  return `${Math.round((sum / scored.length) * 100)}%`;
}

// ---- Showing the results ----
// Turns the answer of the backend into the shape this page uses.
function normalizeResultsData(data) {
  const quiz = data.quiz ?? {};
  const results = Array.isArray(data.results) ? data.results : [];

  return {
    title: String(quiz.title ?? ""),
    status: String(quiz.status ?? "").toLowerCase() === "active" ? "active" : "ended",
    timeRemainingSeconds: Math.max(0, Math.floor(Number(quiz.timeRemainingSeconds)) || 0),
    results: results.map((result) => ({
      name: String(result.name ?? ""),
      score: Number(result.score) || 0,
      total: Number(result.total) || 0,
      timeFinished: String(result.timeFinished ?? ""),
    })),
  };
}

// Makes one row for one student. Text is added with textContent, so names can't break the page.
function createResultRow(result) {
  const row = document.createElement("div");
  row.className = "resultRow";

  const name = document.createElement("span");
  name.textContent = result.name;

  const score = document.createElement("span");
  score.textContent = `${result.score}/${result.total}`;

  const timeFinished = document.createElement("span");
  timeFinished.textContent = result.timeFinished;

  row.append(name, score, timeFinished);
  return row;
}

// Puts everything on the page: title, status, summary numbers and the rows.
function renderResults(details) {
  resultsTitle.textContent = details.title ? `${details.title} Result` : "Result";
  setStatus(details.status);

  submittedCount.textContent = String(details.results.length);
  averageScore.textContent = getAverageScore(details.results);
  startCountdown(details.status === "active" ? details.timeRemainingSeconds : 0);

  resultRows.replaceChildren(...details.results.map(createResultRow));
  showMessage(details.results.length === 0 ? "No students have submitted yet." : "");
}

// ---- Loading the results (runs when the page opens and when Refresh is pressed) ----
async function loadResults() {
  if (!quizId) {
    showMessage("No quiz was selected. Go back to the quiz list and choose a quiz.", "error");
    return;
  }

  loadRequestId += 1;
  const requestId = loadRequestId;

  // Refresh is locked while loading, so the request is not sent twice.
  refreshBtn.disabled = true;
  showMessage("Loading results...");

  try {
    let ok = false;
    let data = {};

    if (USE_SAMPLE_DATA) {
      // Simulation: read the quiz from the sample data.
      const sample = SAMPLE_RESULTS[quizId];

      ok = Boolean(sample);
      data = sample ?? { message: "This quiz was not found." };
    } else {
      const response = await fetch(getResultsEndpoint(quizId));
      data = await response.json();

      // The results only count if the backend answers with {"success": true}
      ok = response.ok && data.success;
    }

    // Another load was started while waiting, so this answer is old.
    if (requestId !== loadRequestId) {
      return;
    }

    if (!ok) {
      showMessage(data.message || "The results could not be loaded.", "error");
      return;
    }

    renderResults(normalizeResultsData(data));
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
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

// ---- Buttons and events ----
backBtn.addEventListener("click", function () {
  window.location.href = DASHBOARD_PAGE_URL;
});

// Back button: goes back to the quiz list.
backToListBtn.addEventListener("click", function () {
  window.location.href = QUIZ_LIST_PAGE_URL;
});

// Refresh button: loads the results again and keeps the same quiz open.
refreshBtn.addEventListener("click", loadResults);

// When the page opens, load the results of the quiz that was pressed.
loadResults();