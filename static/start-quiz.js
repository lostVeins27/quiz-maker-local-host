// Number of quizzes shown per page
const QUIZZES_PER_PAGE = 5;
const PASSING_PERCENT = 75;
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Page elements
const searchInput = document.getElementById("search-input");
const quizTableBody = document.getElementById("quiz-table-body");
const showingText = document.getElementById("showing-text");
const pageText = document.getElementById("page-text");
const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmYesButton = document.getElementById("confirm-yes-button");
const confirmNoButton = document.getElementById("confirm-no-button");
const testBox = document.getElementById("test-box");
const testBoxTitle = document.getElementById("test-box-title");
const testBoxDescription = document.getElementById("test-box-description");
const testQuestions = document.getElementById("test-questions");
const testCloseButton = document.getElementById("test-close-button");
const testForm = document.getElementById("test-form");
const testSubmitButton = document.getElementById("test-submit-button");
const testScoreButton = document.getElementById("test-score-button");
const testScoreText = document.getElementById("test-score-text");

let quizzes = [];
let currentPage = 1;
let confirmAction = null;
let testingQuiz = null;
let testSubmitted = false;

// Fetch quizzes from your Flask backend database API
async function fetchQuizzes() {
  try {
    const res = await fetch("/api/quizzes");
    const data = await res.json();
    if (res.ok && data.success) {
      quizzes = data.quizzes;
      renderTable();
    } else {
      console.error("Failed to load quizzes:", data.message);
    }
  } catch (err) {
    console.error("Error connecting to server:", err);
  }
}

function getFilteredQuizzes() {
  const search = searchInput.value.trim().toLowerCase();
  return quizzes.filter((quiz) => String(quiz.title).toLowerCase().includes(search));
}

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
    emptyRow.innerHTML = `<td colspan="4" class="empty-cell">No quizzes found.</td>`;
    quizTableBody.appendChild(emptyRow);
  }

  pageQuizzes.forEach((quiz) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.className = "quiz-title-cell";
    titleCell.textContent = quiz.title;

    const questionsCell = document.createElement("td");
    questionsCell.textContent = quiz.questionCount || 0;

    const actionsCell = document.createElement("td");
    const startEndButton = document.createElement("button");
    startEndButton.type = "button";

    if (quiz.isActive) {
      startEndButton.className = "end-button";
      startEndButton.textContent = "End";
      startEndButton.addEventListener("click", () => openConfirm(quiz, "end"));
    } else {
      startEndButton.className = "start-button";
      startEndButton.textContent = "Start";
      startEndButton.addEventListener("click", () => openConfirm(quiz, "start"));
    }

    const testButton = document.createElement("button");
    testButton.type = "button";
    testButton.className = "test-button";
    testButton.textContent = "Test";
    testButton.addEventListener("click", () => openTestBox(quiz.id));

    actionsCell.appendChild(startEndButton);
    actionsCell.appendChild(testButton);

    const pinCell = document.createElement("td");
    pinCell.className = "pin-cell";
    pinCell.textContent = quiz.pin || "—";

    row.appendChild(titleCell);
    row.appendChild(questionsCell);
    row.appendChild(actionsCell);
    row.appendChild(pinCell);
    quizTableBody.appendChild(row);
  });

  const first = filtered.length === 0 ? 0 : startIndex + 1;
  const last = startIndex + pageQuizzes.length;
  showingText.textContent = `Showing ${first} to ${last} of ${filtered.length} quizzes`;
  pageText.textContent = `Page ${currentPage} of ${totalPages}`;
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

// Open Test box and pull detailed question data from server database
async function openTestBox(quizId) {
  try {
    const res = await fetch(`/api/quiz/${quizId}/details`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert("Could not load quiz details.");
      return;
    }

    const quiz = data.quiz;
    const questions = quiz.questions || [];

    testingQuiz = quiz;
    testSubmitted = false;

    testBoxTitle.textContent = "Test Quiz: " + quiz.title;
    testBoxDescription.textContent = quiz.description || "";
    testBoxDescription.hidden = !quiz.description;
    testQuestions.innerHTML = "";

    testScoreText.hidden = true;
    testScoreText.replaceChildren();
    testScoreButton.hidden = true;
    testScoreButton.textContent = "Score";
    testSubmitButton.hidden = questions.length === 0;
    testSubmitButton.disabled = false;

    if (questions.length === 0) {
      testQuestions.innerHTML = `<p class="test-empty">This quiz has no questions yet.</p>`;
    } else {
      questions.forEach((q, index) => testQuestions.appendChild(createTestQuestion(q, index)));
    }

    testBox.hidden = false;
    testBox.scrollIntoView({ block: "start" });
  } catch (err) {
    console.error("Error fetching quiz questions:", err);
  }
}

function createTestQuestion(question, index) {
  const card = document.createElement("div");
  card.className = "test-question";

  const number = document.createElement("h3");
  number.className = "test-question-number";
  number.textContent = "Question " + (index + 1);
  card.appendChild(number);

  const text = document.createElement("p");
  text.className = "test-question-text";
  text.textContent = question.text;
  card.appendChild(text);

  const choices = Array.isArray(question.choices) ? question.choices : [];

  if (choices.length > 0) {
    const list = document.createElement("div");
    list.className = "test-choices";

    choices.forEach((choice, choiceIndex) => {
      const option = document.createElement("label");
      option.className = "test-choice";
      option.innerHTML = `
        <input type="radio" class="test-radio" name="test-answer-${index}" value="${choiceIndex}">
        <span class="test-choice-letter">${CHOICE_LETTERS[choiceIndex] || ""}</span>
        <span class="test-choice-text">${choice}</span>
      `;
      list.appendChild(option);
    });

    card.appendChild(list);
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "test-text-input";
    input.placeholder = "Your answer";
    card.appendChild(input);
  }

  return card;
}

function closeTestBox() {
  testingQuiz = null;
  testSubmitted = false;
  testBox.hidden = true;
  testQuestions.innerHTML = "";
}

function submitTest() {
  if (!testingQuiz || testSubmitted) return;

  testSubmitted = true;
  const questions = testingQuiz.questions;
  const cards = testQuestions.querySelectorAll(".test-question");
  const result = { score: 0, total: questions.length, correct: 0, wrong: 0, unanswered: 0, percent: 0, passed: false };

  cards.forEach((card, index) => {
    const question = questions[index];
    const hasChoices = Array.isArray(question.choices) && question.choices.length > 0;
    let isCorrect = false;
    let isAnswered = false;

    if (hasChoices) {
      const correctIndex = Number(question.answer);
      const checked = card.querySelector(".test-radio:checked");
      const chosenIndex = checked ? Number(checked.value) : -1;

      isAnswered = chosenIndex !== -1;
      isCorrect = chosenIndex === correctIndex;

      card.querySelectorAll(".test-choice").forEach((option, choiceIndex) => {
        if (choiceIndex === correctIndex) {
          option.classList.add("correct-choice");
        } else if (choiceIndex === chosenIndex) {
          option.classList.add("wrong-choice");
        }
      });
    } else {
      const input = card.querySelector(".test-text-input");
      const typed = input.value.trim().toLowerCase();
      const correctText = String(question.answer ?? "").trim().toLowerCase();

      isAnswered = typed !== "";
      isCorrect = isAnswered && typed === correctText;
      input.classList.add(isCorrect ? "correct-input" : "wrong-input");
    }

    if (isCorrect) result.correct++;
    else if (isAnswered) result.wrong++;
    else result.unanswered++;
  });

  result.score = result.correct;
  result.percent = result.total === 0 ? 0 : Math.round((result.score / result.total) * 100);
  result.passed = result.percent >= PASSING_PERCENT;

  testForm.querySelectorAll("input").forEach((input) => (input.disabled = true));
  testSubmitButton.hidden = true;

  renderScoreSummary(result);
  testScoreText.hidden = false;
  testScoreButton.hidden = false;
}

function renderScoreSummary(result) {
  testScoreText.innerHTML = `
    <p class="score-heading">Your Score</p>
    <p class="score-points">${result.score} / ${result.total} points</p>
    <p class="score-percent">${result.percent}%</p>
    <p class="score-remark ${result.passed ? "score-passed" : "score-failed"}">
      ${result.passed ? "Passed" : "Failed"}
    </p>
    <p class="score-counts">Correct: ${result.correct} | Wrong: ${result.wrong} | Unanswered: ${result.unanswered}</p>
  `;
}

async function toggleQuizState(quiz, start) {
  try {
    const res = await fetch(`/api/quiz/${quiz.id}/toggle-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: start })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      quiz.isActive = start;
      renderTable();
    }
  } catch (err) {
    console.error("Error updating quiz state:", err);
  }
}

function openConfirm(quiz, type) {
  confirmAction = { type, quiz };
  confirmTitle.textContent = type === "end" ? "End Quiz" : "Start Quiz";
  confirmMessage.textContent = type === "end" 
    ? `Do you really want to end "${quiz.title}"?`
    : `Do you really want to start "${quiz.title}"?`;
  confirmOverlay.hidden = false;
}

function closeConfirm() {
  confirmAction = null;
  confirmOverlay.hidden = true;
}

// Event Listeners
searchInput.addEventListener("input", () => { currentPage = 1; renderTable(); });
previousButton.addEventListener("click", () => { currentPage--; renderTable(); });
nextButton.addEventListener("click", () => { currentPage++; renderTable(); });
testCloseButton.addEventListener("click", closeTestBox);
testForm.addEventListener("submit", (e) => { e.preventDefault(); submitTest(); });

confirmYesButton.addEventListener("click", () => {
  if (confirmAction) {
    toggleQuizState(confirmAction.quiz, confirmAction.type === "start");
  }
  closeConfirm();
});
confirmNoButton.addEventListener("click", closeConfirm);

// Clear old browser cache/localStorage data if it exists
try {
  localStorage.removeItem("quizzes");
} catch (e) {}

// Initial load straight from the database via backend
fetchQuizzes();