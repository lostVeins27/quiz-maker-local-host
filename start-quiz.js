// Key used to store the quizzes in localStorage
const QUIZ_STORAGE_KEY = "quizzes";

// Number of quizzes shown per page
const QUIZZES_PER_PAGE = 5;

// Scoring: every question is worth 1 point (a question can have its own "points" number).
// The student passes with this percentage or more.
const PASSING_PERCENT = 75;

// The letters shown before the choices of a question
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Sample quizzes saved when there are no quizzes yet.
// answer = the position of the correct choice (0 is the first choice).
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
      },
      {
        text: "Which industry first brought settlers to the area?",
        choices: ["Farming", "Mining", "Fishing", "Shipping"],
        answer: 0
      },
      {
        text: "Which event is held in the town every spring?",
        choices: ["Harvest Festival", "Founders Day", "Flower Parade", "Boat Race"],
        answer: 2
      }
    ]
  },
  {
    id: 2,
    title: "Basic Geography Quiz",
    description: "A short quiz about capital cities.",
    questions: [
      {
        text: "What is the capital city of the Philippines?",
        choices: ["Cebu City", "Manila", "Davao City", "Quezon City"],
        answer: 1
      },
      {
        text: "What is the capital city of Japan?",
        choices: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
        answer: 2
      },
      {
        text: "What is the capital city of France?",
        choices: ["Paris", "Lyon", "Marseille", "Nice"],
        answer: 0
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

// The quiz in the test box (null when the box is closed)
let testingQuiz = null;

// true after the test was submitted (the answers are locked and marked)
let testSubmitted = false;

// The score of the submitted test
let testScore = 0;

// Get the quizzes from localStorage.
// If there are no quizzes (nothing saved, bad data or an empty list), the sample quizzes are saved.
function loadQuizzes() {
  try {
    const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    // Bad data, so the sample quizzes are saved again below
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

    // Test button (beside the Start button): shows the quiz in a box below the list
    const testButton = document.createElement("button");
    testButton.type = "button";
    testButton.className = "test-button";
    testButton.textContent = "Test";
    testButton.setAttribute("aria-label", "Test quiz " + quiz.title);
    testButton.addEventListener("click", function () {
      openTestBox(quiz);
    });

    actionsCell.appendChild(startButton);
    actionsCell.appendChild(testButton);

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

// Make the box of one question. The student answers it here (the correct answer is not shown yet).
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
    // Multiple choice: one radio button for each choice
    const list = document.createElement("div");
    list.className = "test-choices";

    choices.forEach(function (choice, choiceIndex) {
      const option = document.createElement("label");
      option.className = "test-choice";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "test-radio";
      radio.name = "test-answer-" + index;
      radio.value = choiceIndex;

      const letter = document.createElement("span");
      letter.className = "test-choice-letter";
      letter.textContent = CHOICE_LETTERS[choiceIndex] || "";

      const choiceText = document.createElement("span");
      choiceText.className = "test-choice-text";
      choiceText.textContent = choice;

      option.appendChild(radio);
      option.appendChild(letter);
      option.appendChild(choiceText);
      list.appendChild(option);
    });

    card.appendChild(list);
  } else {
    // A question without choices: the student types the answer
    const input = document.createElement("input");
    input.type = "text";
    input.className = "test-text-input";
    input.placeholder = "Your answer";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Your answer for question " + (index + 1));
    card.appendChild(input);
  }

  return card;
}

// Open the test box below the list and show the quiz in it (every answer is empty)
function openTestBox(quiz) {
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  testingQuiz = quiz;
  testSubmitted = false;
  testScore = 0;

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
    const empty = document.createElement("p");
    empty.className = "test-empty";
    empty.textContent = "This quiz has no questions yet.";
    testQuestions.appendChild(empty);
  }

  questions.forEach(function (question, index) {
    testQuestions.appendChild(createTestQuestion(question, index));
  });

  testBox.hidden = false;
  testBox.scrollIntoView({ block: "start" });
}

// Close the test box
function closeTestBox() {
  testingQuiz = null;
  testSubmitted = false;
  testBox.hidden = true;
  testQuestions.innerHTML = "";
}

// Add a small label (like "Correct answer") at the end of a choice
function addMark(option, className, label) {
  const mark = document.createElement("span");
  mark.className = className;
  mark.textContent = label;
  option.appendChild(mark);
}

// How many points a question is worth (1 if the quiz does not say)
function getQuestionPoints(question) {
  const points = Number(question.points);
  return points > 0 ? points : 1;
}

// Make one line of the score box, like "Correct: 2"
function createScoreLine(className, text) {
  const line = document.createElement("p");
  line.className = className;
  line.textContent = text;
  return line;
}

// Fill the score box: points, percentage, passed or failed, and how many answers were right or wrong
function renderScoreSummary(result) {
  testScoreText.replaceChildren(
    createScoreLine("score-heading", "Your Score"),
    createScoreLine("score-points", result.score + " / " + result.total + " points"),
    createScoreLine("score-percent", result.percent + "%"),
    createScoreLine(
      "score-remark " + (result.passed ? "score-passed" : "score-failed"),
      result.passed ? "Passed" : "Failed (passing score: " + PASSING_PERCENT + "%)"
    ),
    createScoreLine(
      "score-counts",
      "Correct: " + result.correct + "  |  Wrong: " + result.wrong + "  |  Unanswered: " + result.unanswered
    )
  );
}

// Submit the test: lock the answers, show the correct answers, turn the wrong answers red and count the score
function submitTest() {
  if (!testingQuiz || testSubmitted) {
    return;
  }

  testSubmitted = true;

  const questions = testingQuiz.questions;
  const cards = testQuestions.querySelectorAll(".test-question");
  const result = { score: 0, total: 0, correct: 0, wrong: 0, unanswered: 0, percent: 0, passed: false };

  cards.forEach(function (card, index) {
    const question = questions[index];
    const points = getQuestionPoints(question);
    const hasChoices = Array.isArray(question.choices) && question.choices.length > 0;
    let isCorrect = false;
    let isAnswered = false;

    if (hasChoices) {
      const correctIndex = Number(question.answer);
      const checked = card.querySelector(".test-radio:checked");
      const chosenIndex = checked ? Number(checked.value) : -1;

      isAnswered = chosenIndex !== -1;
      isCorrect = chosenIndex === correctIndex;

      card.querySelectorAll(".test-choice").forEach(function (option, choiceIndex) {
        if (choiceIndex === correctIndex) {
          option.classList.add("correct-choice");
          addMark(option, "correct-mark", "Correct answer");
        } else if (choiceIndex === chosenIndex) {
          option.classList.add("wrong-choice");
          addMark(option, "wrong-mark", "Your answer");
        }
      });
    } else {
      const input = card.querySelector(".test-text-input");
      const typed = input.value.trim().toLowerCase();
      const correctText = String(question.answer ?? "").trim().toLowerCase();

      isAnswered = typed !== "";
      isCorrect = isAnswered && typed === correctText;
      input.classList.add(isCorrect ? "correct-input" : "wrong-input");

      if (!isCorrect) {
        const feedback = document.createElement("p");
        feedback.className = "test-answer-text";
        feedback.textContent = "Correct answer: " + question.answer;
        card.appendChild(feedback);
      }
    }

    // Points of this question (shown at the top of its box)
    const earned = isCorrect ? points : 0;
    const badge = document.createElement("span");
    badge.className = "test-points " + (isCorrect ? "points-earned" : "points-lost");
    badge.textContent = earned + " / " + points + (points === 1 ? " pt" : " pts");
    card.querySelector(".test-question-number").appendChild(badge);

    result.total += points;
    result.score += earned;

    if (isCorrect) {
      result.correct++;
    } else if (isAnswered) {
      result.wrong++;
    } else {
      result.unanswered++;
    }
  });

  result.percent = result.total === 0 ? 0 : Math.round((result.score / result.total) * 100);
  result.passed = result.percent >= PASSING_PERCENT;
  testScore = result.score;

  // Lock every answer
  testForm.querySelectorAll("input").forEach(function (input) {
    input.disabled = true;
  });
  testSubmitButton.hidden = true;

  // Show the score right after submitting. The small Score button hides or shows it again.
  renderScoreSummary(result);
  testScoreText.hidden = false;
  testScoreButton.hidden = false;
  testScoreButton.textContent = "Hide Score";
  testScoreText.scrollIntoView({ block: "nearest" });
}

// Show or hide the score box (small Score button)
function showTestScore() {
  if (!testSubmitted) {
    return;
  }

  testScoreText.hidden = !testScoreText.hidden;
  testScoreButton.textContent = testScoreText.hidden ? "Score" : "Hide Score";
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

// Test box: Close, Submit and Score buttons
testCloseButton.addEventListener("click", closeTestBox);

testForm.addEventListener("submit", function (event) {
  event.preventDefault();
  submitTest();
});

testScoreButton.addEventListener("click", showTestScore);

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