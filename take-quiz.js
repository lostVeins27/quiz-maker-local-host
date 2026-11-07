// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// ---- Backend addresses (they must match the routes in the backend) ----
// POST {"pin": "12345"}: must answer {"success": true, "quiz": { ... }} (see "How the quiz looks" below).
// The backend must check the PIN again here and must NOT send the correct answers.
const LOAD_QUIZ_ENDPOINT = "/take-quiz/load";

// POST {"pin": "12345", "answers": [ { number, type, answer } ]}: must answer {"success": true}.
const SUBMIT_QUIZ_ENDPOINT = "/take-quiz/submit";

// The PIN page (the student is sent back here when there is no PIN or the quiz can't be opened).
const PIN_PAGE_URL = "take-quiz-pin.html";

// The student dashboard (shown after the quiz is submitted).
const DASHBOARD_URL = "dashboard.html";

// The PIN page saves the right PIN here (it must be the same key as in take-quiz-pin.js).
const PIN_STORAGE_KEY = "takeQuizPin";

// ---- How the quiz looks (the page reads this shape) ----
// {
//   success: true,
//   quiz: {
//     title: "Quiz title",
//     description: "Instructions (can be empty)",
//     questions: [
//       { text: "Question?", type: "multiple-choice", choices: [ { label: "A", text: "First choice" }, ... ] },
//       { text: "Question?", type: "identification" }
//     ]
//   }
// }
// If your backend uses other names, change only normalizeQuizData() below.

// The two question types (the same names as on the Create Quiz page).
const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice",
  IDENTIFICATION: "identification",
};

// Text on the Submit button: normal, and while the answers are being sent.
const SUBMIT_BUTTON_TEXT = "Submit Quiz";
const SUBMITTING_BUTTON_TEXT = "Submitting...";

// ---- Simulation (for testing without a backend) ----
// true  = the page uses the sample quizzes below and never contacts the backend.
// false = the page loads and submits the quiz using the addresses above.
// The keys are the PINs (they must match SAMPLE_PINS in take-quiz-pin.js).
const USE_SAMPLE_DATA = true;

const SAMPLE_QUIZZES = {
  "11111": {
    title: "Quick Sample Quiz",
    description: "This is a one-question quiz for testing.",
    questions: [
      {
        text: "What is 2 + 2?",
        type: "multiple-choice",
        choices: [
          { label: "A", text: "3" },
          { label: "B", text: "4" },
          { label: "C", text: "5" },
          { label: "D", text: "22" },
        ],
      },
    ],
  },
  "12345": {
    title: "Local History Quiz",
    description: "Answer every question.\nFor multiple choice, pick the best answer. For identification, type your answer.",
    questions: [
      {
        text: "Which year was the town founded?",
        type: "multiple-choice",
        choices: [
          { label: "A", text: "1750" },
          { label: "B", text: "1801" },
          { label: "C", text: "1856" },
          { label: "D", text: "1902" },
        ],
      },
      { text: "Who was the first mayor of the town?", type: "identification" },
    ],
  },
  "54321": {
    title: "Basic Geography Quiz",
    description: "",
    questions: [{ text: "What is the capital of France?", type: "identification" }],
  },
};

const pageTitle = document.getElementById("page-title");
const pageMessage = document.getElementById("page-message");
const backToPinBtn = document.getElementById("back-to-pin-btn");
const quizInformation = document.getElementById("quiz-information");
const quizDescription = document.getElementById("quiz-description");
const quizForm = document.getElementById("quiz-form");
const questionsContainer = document.getElementById("questions-container");
const submitQuizBtn = document.getElementById("submit-quiz-btn");
const formMessage = document.getElementById("form-message");
const dashboardBtn = document.getElementById("dashboard-btn");
const submitConfirmDialog = document.getElementById("submit-confirm-dialog");
const submitConfirmText = document.getElementById("submit-confirm-text");
const submitConfirmYesBtn = document.getElementById("submit-confirm-yes-btn");
const submitConfirmNoBtn = document.getElementById("submit-confirm-no-btn");

// The PIN the student typed on the PIN page (null if there is none).
let quizPin = null;

// true while the answers are being sent, so they can't be sent twice.
let isSubmitting = false;

// The answers that wait for the student to answer Yes or No in the pop up (null when nothing is waiting).
let pendingAnswers = null;

// ---- Small helpers ----
// Shows or hides an element.
function setVisible(element, isVisible) {
  element.hidden = !isVisible;
  element.style.display = isVisible ? "" : "none";
}

// Shows a message under the form. status is "success", "error" or "warning".
function showFormMessage(message, status) {
  formMessage.textContent = message;
  formMessage.dataset.status = status;
}

// Shows a message at the top of the page (loading or error). An empty text hides it.
function showPageMessage(message, status) {
  pageMessage.textContent = message;
  if (status) {
    pageMessage.dataset.status = status;
  } else {
    delete pageMessage.dataset.status;
  }
}

// ---- Showing the quiz ----
// Turns the answer of the backend into the shape this page uses.
function normalizeQuizData(data) {
  const quiz = data.quiz ?? {};
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  return {
    title: String(quiz.title ?? ""),
    description: String(quiz.description ?? "").trim(),
    questions: questions.map((question) => ({
      text: String(question.text ?? ""),
      type: question.type === QUESTION_TYPES.IDENTIFICATION
        ? QUESTION_TYPES.IDENTIFICATION
        : QUESTION_TYPES.MULTIPLE_CHOICE,
      choices: (Array.isArray(question.choices) ? question.choices : []).map((choice) => ({
        label: String(choice.label ?? ""),
        text: String(choice.text ?? ""),
      })),
    })),
  };
}

// Builds one question box. Text is added with textContent, so quiz text can't break the page.
function createQuestionElement(question, number) {
  const questionElement = document.createElement("fieldset");
  questionElement.className = "question";
  questionElement.dataset.number = String(number);
  questionElement.dataset.type = question.type;

  const legend = document.createElement("legend");
  legend.className = "question-number";
  legend.textContent = `Question ${number}`;

  const text = document.createElement("p");
  text.className = "question-text";
  text.textContent = question.text;

  questionElement.append(legend, text);

  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    // One row for each choice: a radio button, its letter and its text. The radios share one name.
    question.choices.forEach((choice) => {
      const row = document.createElement("label");
      row.className = "choice";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "choice-radio";
      radio.name = `answer-${number}`;
      radio.value = choice.label;

      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.textContent = choice.label;

      const choiceText = document.createElement("span");
      choiceText.className = "choice-text";
      choiceText.textContent = choice.text;

      row.append(radio, letter, choiceText);
      questionElement.append(row);
    });
  } else {
    const label = document.createElement("label");
    label.className = "identification-label";
    label.htmlFor = `answer-${number}`;
    label.textContent = "Your Answer";

    const input = document.createElement("input");
    input.type = "text";
    input.id = `answer-${number}`;
    input.className = "identification-answer";
    input.autocomplete = "off";

    questionElement.append(label, input);
  }

  return questionElement;
}

// Puts everything on the page: title, description and the questions.
function renderQuiz(quiz) {
  pageTitle.textContent = quiz.title || "Take Quiz";
  document.title = quiz.title || "Take Quiz";

  quizDescription.textContent = quiz.description;
  setVisible(quizInformation, quiz.description !== "");

  questionsContainer.replaceChildren(
    ...quiz.questions.map((question, index) => createQuestionElement(question, index + 1))
  );

  showPageMessage(quiz.questions.length === 0 ? "This quiz has no questions yet." : "");
  setVisible(quizForm, quiz.questions.length > 0);
}

// ---- Loading the quiz (runs when the page opens) ----
async function loadQuiz() {
  // The PIN comes from the address (?pin=12345) or from the storage the PIN page filled.
  // No PIN means the student did not come from the PIN page.
  const addressPin = new URLSearchParams(window.location.search).get("pin");
  quizPin = /^\d{5}$/.test(addressPin ?? "") ? addressPin : null;

  if (!quizPin) {
    try {
      quizPin = sessionStorage.getItem(PIN_STORAGE_KEY);
    } catch (error) {
      quizPin = null;
    }
  }

  if (!quizPin) {
    window.location.href = PIN_PAGE_URL;
    return;
  }

  showPageMessage("Loading quiz...");

  try {
    let ok = false;
    let data = {};

    if (USE_SAMPLE_DATA) {
      // Simulation: read the quiz from the sample data.
      const sample = SAMPLE_QUIZZES[quizPin];

      ok = Boolean(sample);
      data = sample ? { quiz: sample } : { message: "This quiz was not found." };
    } else {
      const response = await fetch(LOAD_QUIZ_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: quizPin }),
      });
      data = await response.json();

      // The quiz only counts if the backend answers with {"success": true}
      ok = response.ok && data.success;
    }

    if (!ok) {
      showPageMessage(data.message || "The quiz could not be opened.", "error");
      setVisible(backToPinBtn, true);
      return;
    }

    renderQuiz(normalizeQuizData(data));
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Loading the quiz failed:", error);
    showPageMessage("Something went wrong. The quiz could not be opened.", "error");
    setVisible(backToPinBtn, true);
  }
}

// ---- Reading the answers ----
// Reads every answer into a list. An unanswered question has an empty answer.
function collectAnswers() {
  return Array.from(questionsContainer.querySelectorAll(".question")).map((questionElement) => {
    const type = questionElement.dataset.type;
    let answer = "";

    if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      const selectedRadio = questionElement.querySelector('input[type="radio"]:checked');
      answer = selectedRadio ? selectedRadio.value : "";
    } else {
      answer = questionElement.querySelector(".identification-answer").value.trim();
    }

    return { number: Number(questionElement.dataset.number), type, answer };
  });
}

// ---- Messages and submitting ----
// While submitting: lock the form and show "Submitting...", so nothing is changed or sent twice.
function setSubmittingState(submitting) {
  isSubmitting = submitting;

  quizForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = submitting;
  });

  submitQuizBtn.textContent = submitting ? SUBMITTING_BUTTON_TEXT : SUBMIT_BUTTON_TEXT;
  quizForm.setAttribute("aria-busy", String(submitting));
}

// Runs when Submit Quiz is pressed: read the answers, then ask "Are you sure?" in the pop up.
// Nothing is sent yet. The answers are only sent if the student answers Yes (see submitQuiz below).
function handleQuizSubmit(event) {
  // Stop the browser from reloading the page. We send the data ourselves.
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const answers = collectAnswers();
  const unanswered = answers.filter((item) => item.answer === "").length;

  submitConfirmText.textContent = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Are you sure you want to submit this quiz?`
    : "Are you sure you want to submit this quiz?";

  pendingAnswers = answers;
  submitConfirmDialog.showModal();
}

// Sends the answers to the backend and shows the result. Runs only after the student answers Yes.
async function submitQuiz(answers) {
  setSubmittingState(true);
  showFormMessage("Submitting quiz...", "warning");

  try {
    let ok = false;
    let data = {};

    if (USE_SAMPLE_DATA) {
      // Simulation: nothing is sent.
      ok = true;
    } else {
      const response = await fetch(SUBMIT_QUIZ_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: quizPin, answers }),
      });
      data = await response.json();

      // The submit only counts if the backend answers with {"success": true}
      ok = response.ok && data.success;
    }

    if (ok) {
      // Done: the form stays locked, the PIN is forgotten and the student can go back.
      try {
        sessionStorage.removeItem(PIN_STORAGE_KEY);
      } catch (error) {
        // Nothing to do if the browser does not allow it.
      }

      showFormMessage("Quiz submitted successfully!", "success");
      setVisible(submitQuizBtn, false);
      setVisible(dashboardBtn, true);
      dashboardBtn.disabled = false;
      dashboardBtn.focus();
    } else {
      setSubmittingState(false);
      showFormMessage(data.message || "The quiz could not be submitted.", "error");
    }
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Submitting the quiz failed:", error);
    setSubmittingState(false);
    showFormMessage("Something went wrong. Your quiz has not been submitted. Try again.", "error");
  }
}

// ---- Buttons and events ----
// Submit Quiz button (or the Enter key).
quizForm.addEventListener("submit", handleQuizSubmit);

// Pop up: Yes closes it and submits the quiz.
submitConfirmYesBtn.addEventListener("click", () => {
  const answers = pendingAnswers;
  submitConfirmDialog.close();

  if (answers && !isSubmitting) {
    submitQuiz(answers);
  }
});

// Pop up: No closes it and nothing is sent (the answers stay as they are).
submitConfirmNoBtn.addEventListener("click", () => {
  submitConfirmDialog.close();
});

// However the pop up closes (Yes, No or the Escape key), nothing waits for an answer anymore.
submitConfirmDialog.addEventListener("close", () => {
  pendingAnswers = null;
});

// Back to PIN Page button (shown when the quiz could not be opened).
backToPinBtn.addEventListener("click", () => {
  window.location.href = PIN_PAGE_URL;
});

// Back to Dashboard button (shown after the quiz is submitted).
dashboardBtn.addEventListener("click", () => {
  window.location.href = DASHBOARD_URL;
});

// When the page opens, load the quiz that belongs to the PIN.
loadQuiz();