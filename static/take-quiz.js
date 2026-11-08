"use strict";

const LOAD_QUIZ_ENDPOINT = "/take-quiz/load";
const SUBMIT_QUIZ_ENDPOINT = "/take-quiz/submit";
const PIN_PAGE_URL = "/quiz-pin";
const DASHBOARD_URL = "/dashboard";
const PIN_STORAGE_KEY = "takeQuizPin";

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice",
  IDENTIFICATION: "identification",
};

const SUBMIT_BUTTON_TEXT = "Submit Quiz";
const SUBMITTING_BUTTON_TEXT = "Submitting...";

const USE_SAMPLE_DATA = false;

const backBtn = document.getElementById("back-btn");
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
const submitConfirmTitle = document.getElementById("submit-confirm-title");
const submitConfirmText = document.getElementById("submit-confirm-text");
const submitConfirmYesBtn = document.getElementById("submit-confirm-yes-btn");
const submitConfirmNoBtn = document.getElementById("submit-confirm-no-btn");
const quizTimerContainer = document.getElementById("quiz-timer-container");
const quizTimerValue = document.getElementById("quiz-timer-value");

let quizPin = null;
let isSubmitting = false;
let pendingAnswers = null;
let dialogMode = "submit";

let countdownTimer = null;
let secondsLeft = -1;

function setVisible(element, isVisible) {
  element.hidden = !isVisible;
  element.style.display = isVisible ? "" : "none";
}

function showFormMessage(message, status) {
  formMessage.textContent = message;
  formMessage.dataset.status = status;
}

function showPageMessage(message, status) {
  pageMessage.textContent = message;
  if (status) {
    pageMessage.dataset.status = status;
  } else {
    delete pageMessage.dataset.status;
  }
}

function updateTimerDisplay() {
  if (secondsLeft < 0) {
    quizTimerValue.textContent = "Infinite";
    return;
  }
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  quizTimerValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startCountdown(seconds) {
  secondsLeft = seconds;
  updateTimerDisplay();
  setVisible(quizTimerContainer, true);

  if (secondsLeft < 0) {
    return; // Infinite time
  }

  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
  }

  countdownTimer = setInterval(() => {
    secondsLeft -= 1;
    updateTimerDisplay();

    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      handleTimeExpired();
    }
  }, 1000);
}

function handleTimeExpired() {
  // Lock the form and show expiration message
  setSubmittingState(true);
  showFormMessage("Time's up! The quiz has ended.", "error");
  setVisible(submitQuizBtn, false);
  setVisible(backBtn, false);
  setVisible(dashboardBtn, true);
  dashboardBtn.disabled = false;
  dashboardBtn.focus();

  try {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
  } catch (e) {}
}

function normalizeQuizData(data) {
  const quiz = data.quiz ?? {};
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  let rawTime = Number(quiz.timeRemainingSeconds);
  if (isNaN(rawTime)) rawTime = -1;

  return {
    title: String(quiz.title ?? ""),
    description: String(quiz.description ?? "").trim(),
    timeRemainingSeconds: rawTime,
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

function renderQuiz(quiz) {
  pageTitle.textContent = quiz.title || "Take Quiz";
  document.title = quiz.title || "Take Quiz";

  quizDescription.textContent = quiz.description;
  setVisible(quizInformation, quiz.description !== "");

  startCountdown(quiz.timeRemainingSeconds);

  questionsContainer.replaceChildren(
    ...quiz.questions.map((question, index) => createQuestionElement(question, index + 1))
  );

  showPageMessage(quiz.questions.length === 0 ? "This quiz has no questions yet." : "");
  setVisible(quizForm, quiz.questions.length > 0);
  setVisible(backBtn, quiz.questions.length > 0);
}

async function loadQuiz() {
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
    const response = await fetch(LOAD_QUIZ_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: quizPin }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      showPageMessage(data.message || "The quiz could not be opened.", "error");
      setVisible(backToPinBtn, true);
      return;
    }

    renderQuiz(normalizeQuizData(data));
  } catch (error) {
    console.error("Loading the quiz failed:", error);
    showPageMessage("Something went wrong. The quiz could not be opened.", "error");
    setVisible(backToPinBtn, true);
  }
}

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

function setSubmittingState(submitting) {
  isSubmitting = submitting;
  backBtn.disabled = submitting;

  quizForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = submitting;
  });

  submitQuizBtn.textContent = submitting ? SUBMITTING_BUTTON_TEXT : SUBMIT_BUTTON_TEXT;
  quizForm.setAttribute("aria-busy", String(submitting));
}

function handleQuizSubmit(event) {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const answers = collectAnswers();
  const unanswered = answers.filter((item) => item.answer === "").length;

  submitConfirmText.textContent = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Are you sure you want to submit this quiz?`
    : "Are you sure you want to submit this quiz?";

  dialogMode = "submit";
  submitConfirmTitle.textContent = "Submit Quiz";
  pendingAnswers = answers;
  submitConfirmDialog.showModal();
}

async function submitQuiz(answers) {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  setSubmittingState(true);
  showFormMessage("Submitting quiz...", "warning");

  try {
    const response = await fetch(SUBMIT_QUIZ_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: quizPin, answers }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      try {
        sessionStorage.removeItem(PIN_STORAGE_KEY);
      } catch (error) {}

      showFormMessage("Quiz submitted successfully!", "success");
      setVisible(submitQuizBtn, false);
      setVisible(backBtn, false);
      setVisible(dashboardBtn, true);
      dashboardBtn.disabled = false;
      dashboardBtn.focus();
    } else {
      setSubmittingState(false);
      showFormMessage(data.message || "The quiz could not be submitted.", "error");
    }
  } catch (error) {
    console.error("Submitting the quiz failed:", error);
    setSubmittingState(false);
    showFormMessage("Something went wrong. Your quiz has not been submitted. Try again.", "error");
  }
}

quizForm.addEventListener("submit", handleQuizSubmit);

submitConfirmYesBtn.addEventListener("click", () => {
  if (dialogMode === "leave") {
    submitConfirmDialog.close();
    window.location.href = PIN_PAGE_URL;
    return;
  }

  const answers = pendingAnswers;
  submitConfirmDialog.close();

  if (answers && !isSubmitting) {
    submitQuiz(answers);
  }
});

submitConfirmNoBtn.addEventListener("click", () => {
  submitConfirmDialog.close();
});

submitConfirmDialog.addEventListener("close", () => {
  pendingAnswers = null;
});

backBtn.addEventListener("click", () => {
  if (isSubmitting) {
    return;
  }

  dialogMode = "leave";
  pendingAnswers = null;
  submitConfirmTitle.textContent = "Leave Quiz";
  submitConfirmText.textContent = "Are you sure you want to leave? Your answers will not be saved.";
  submitConfirmDialog.showModal();
});

backToPinBtn.addEventListener("click", () => {
  window.location.href = PIN_PAGE_URL;
});

dashboardBtn.addEventListener("click", () => {
  window.location.href = DASHBOARD_URL;
});

loadQuiz();