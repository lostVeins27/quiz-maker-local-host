// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// The backend address the quiz is sent to (it must match the route in the backend).
const QUIZ_API_ENDPOINT = "/create-quiz";

// The four choice letters, used to build the A-D fields.
const CHOICE_LABELS = ["A", "B", "C", "D"];

// The two question types. Written once here so we don't mistype them later.
const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice",
  IDENTIFICATION: "identification",
};

// Text on the Save button: normal, and while the quiz is being sent.
const SAVE_BUTTON_TEXT = "Save Quiz";
const SAVING_BUTTON_TEXT = "Saving...";

// Find each element on the page once, then reuse these variables.
const quizForm = document.getElementById("quiz-form");
const titleInput = document.getElementById("quiz-title");
const titleError = document.getElementById("quiz-title-error");
const descriptionInput = document.getElementById("quiz-description");
const questionsContainer = document.getElementById("questions-container");
const questionsError = document.getElementById("questions-error");
const addQuestionBtn = document.getElementById("add-question-btn");
const saveQuizBtn = document.getElementById("save-quiz-btn");
const apiStatusNotice = document.getElementById("api-status-notice");
const formMessage = document.getElementById("form-message");

// Goes up by one for every question added. It gives each question unique ids,so the radio buttons of different questions never affect each other.
let questionUid = 0;

// true while the quiz is being sent, so it can't be sent twice.
let isSaving = false;

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

// Removes that message.
function clearFormMessage() {
  formMessage.textContent = "";
  delete formMessage.dataset.status;
}

// Finds which type (multiple choice or identification) is selected for one question.
function getQuestionType(questionElement) {
  return questionElement.querySelector('input[name^="type-"]:checked').value;
}

function createQuestionElement(uid) {
  // Makes the four A-D rows. Each row has a radio button (to mark the correct answer)
  // and a text box. The four radios share one name, so only one can be picked.
  const choicesHTML = CHOICE_LABELS.map(
    (label) => `
      <div class="choice">
        <input
          type="radio"
          class="choice-radio"
          name="correct-${uid}"
          id="correct-${uid}-${label}"
          value="${label}"
          aria-label="Choice ${label} is the correct answer"
        />
        <label class="choice-letter" for="choice-${uid}-${label}">${label}</label>
        <input
          type="text"
          id="choice-${uid}-${label}"
          class="choice-text"
          data-label="${label}"
        />
      </div>`
  ).join("");

  // Create the question's box and fill it with the form fields below.
  const questionElement = document.createElement("fieldset");
  questionElement.className = "question";
  questionElement.dataset.uid = uid;

  questionElement.innerHTML = `
    <legend class="question-number"></legend>

    <div class="question-field">
      <label class="question-label" for="question-text-${uid}">Question</label>
      <textarea id="question-text-${uid}" class="question-text" rows="2"></textarea>
      <p class="error-message" data-error="text"></p>
    </div>

    <fieldset class="question-type">
      <legend class="question-type-legend">Question Type</legend>
      <label class="question-type-option">
        <input class="question-type-radio" type="radio" name="type-${uid}" value="${QUESTION_TYPES.MULTIPLE_CHOICE}" checked />
        Multiple Choice
      </label>
      <label class="question-type-option">
        <input class="question-type-radio" type="radio" name="type-${uid}" value="${QUESTION_TYPES.IDENTIFICATION}" />
        Identification
      </label>
    </fieldset>

    <div class="multiple-choice-fields">
      <p class="choices-hint">Enter four choices, then select the radio button beside the correct answer.</p>
      ${choicesHTML}
      <p class="error-message" data-error="choices"></p>
      <p class="error-message" data-error="correct"></p>
    </div>

    <div class="identification-fields">
      <label class="identification-label" for="identification-answer-${uid}">Correct Answer</label>
      <input type="text" id="identification-answer-${uid}" class="identification-answer" />
      <p class="error-message" data-error="answer"></p>
    </div>

    <button type="button" class="remove-question-btn">Remove Question</button>
  `;

  return questionElement;
}

// Shows the fields that match the chosen type and hides the others.
// It only changes the one question it is given.
function updateQuestionType(questionElement) {
  const type = getQuestionType(questionElement);

  setVisible(
    questionElement.querySelector(".multiple-choice-fields"),
    type === QUESTION_TYPES.MULTIPLE_CHOICE
  );
  setVisible(
    questionElement.querySelector(".identification-fields"),
    type === QUESTION_TYPES.IDENTIFICATION
  );
}

// Writes "Question 1", "Question 2", ... in page order.
// Runs after every add or remove, so the numbers never skip.
function renumberQuestions() {
  const questionElements = questionsContainer.querySelectorAll(".question");

  questionElements.forEach((questionElement, index) => {
    const number = index + 1;

    questionElement.querySelector(".question-number").textContent = `Question ${number}`;

    questionElement
      .querySelector(".remove-question-btn")
      .setAttribute("aria-label", `Remove question ${number}`);
  });
}

// Add Question button: puts a new question at the bottom.
function addQuestion() {
  questionUid += 1;

  const questionElement = createQuestionElement(questionUid);
  questionsContainer.appendChild(questionElement);

  updateQuestionType(questionElement);
  renumberQuestions();

  questionsError.textContent = "";
  clearFormMessage();

  questionElement.querySelector(".question-text").focus();
}

// Remove Question button: deletes that question, then fixes the numbers.
function removeQuestion(questionElement) {
  questionElement.remove();
  renumberQuestions();

  addQuestionBtn.focus();
}

// ---- Reading the form ----
// Reads one question into an object. It only looks inside that question,
// so answers from different questions never get mixed up.
function collectQuestionData(questionElement, number) {
  const type = getQuestionType(questionElement);

  const questionData = {
    number,
    text: questionElement.querySelector(".question-text").value.trim(),
    type,
  };

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    questionData.choices = Array.from(
      questionElement.querySelectorAll(".choice-text")
    ).map((input) => ({
      label: input.dataset.label,
      text: input.value.trim(),
    }));

    const selectedRadio = questionElement.querySelector('input[name^="correct-"]:checked');
    questionData.correctAnswer = selectedRadio ? selectedRadio.value : "";
  } else {
    questionData.correctAnswer = questionElement
      .querySelector(".identification-answer")
      .value.trim();
  }

  return questionData;
}

// Reads the whole form into one object. This is what gets sent to the backend.
function collectQuizData() {
  const questionElements = questionsContainer.querySelectorAll(".question");

  return {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    questions: Array.from(questionElements).map((questionElement, index) =>
      collectQuestionData(questionElement, index + 1)
    ),
  };
}

// ---- Validation (checking the form) ----
// Shows an error message under the field that has the problem.
function showQuestionError(questionElement, errorName, message) {
  questionElement.querySelector(`[data-error="${errorName}"]`).textContent = message;
}

// Clears the error messages of one question.
function clearQuestionErrors(questionElement) {
  questionElement.querySelectorAll(".error-message").forEach((errorElement) => {
    errorElement.textContent = "";
  });
}

// Clears every error message on the page.
function clearAllErrors() {
  titleError.textContent = "";
  questionsError.textContent = "";
  questionsContainer.querySelectorAll(".question").forEach(clearQuestionErrors);
}

// Checks one question and shows its errors.
// Returns the first bad field (so it can be focused), or null if the question is fine.
function validateQuestion(questionElement, questionData) {
  let firstInvalidField = null;

  // Shows an error and remembers the first problem found.
  function flagProblem(field, errorName, message) {
    showQuestionError(questionElement, errorName, message);
    if (!firstInvalidField) {
      firstInvalidField = field;
    }
  }

  if (!questionData.text) {
    flagProblem(
      questionElement.querySelector(".question-text"),
      "text",
      "Please enter the question."
    );
  }

  if (questionData.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    // Find which of the A-D choices were left empty.
    const missingLabels = questionData.choices
      .filter((choice) => !choice.text)
      .map((choice) => choice.label);

    if (missingLabels.length > 0) {
      flagProblem(
        questionElement.querySelector(`.choice-text[data-label="${missingLabels[0]}"]`),
        "choices",
        `Please fill in all four choices. Missing: ${missingLabels.join(", ")}.`
      );
    }

    // No radio button selected means no correct answer was chosen.
    if (!questionData.correctAnswer) {
      flagProblem(
        questionElement.querySelector('input[name^="correct-"]'),
        "correct",
        "Please select the correct answer."
      );
    }
  } else if (!questionData.correctAnswer) {
    flagProblem(
      questionElement.querySelector(".identification-answer"),
      "answer",
      "Please enter the correct answer."
    );
  }

  return firstInvalidField;
}

// Checks the whole quiz: a title, at least one question, and every question.
// Returns true if everything is valid.
function validateQuiz(quizData) {
  clearAllErrors();
  clearFormMessage();

  let firstInvalidField = null;

  function rememberFirstProblem(field) {
    if (!firstInvalidField) {
      firstInvalidField = field;
    }
  }

  if (!quizData.title) {
    titleError.textContent = "Please enter a quiz title.";
    rememberFirstProblem(titleInput);
  }

  if (quizData.questions.length === 0) {
    questionsError.textContent = "Please add at least one question.";
    rememberFirstProblem(addQuestionBtn);
  }

  const questionElements = questionsContainer.querySelectorAll(".question");
  quizData.questions.forEach((questionData, index) => {
    rememberFirstProblem(validateQuestion(questionElements[index], questionData));
  });

  if (firstInvalidField) {
    showFormMessage("Please fix the errors shown above before saving.", "error");
    firstInvalidField.focus();
    return false;
  }

  return true;
}

// ---- Messages and saving ----
// While saving: lock the form and show "Saving...", so nothing is changed or sent twice.
function setSavingState(saving) {
  isSaving = saving;

  quizForm.querySelectorAll("input, textarea, button").forEach((control) => {
    control.disabled = saving;
  });

  saveQuizBtn.textContent = saving ? SAVING_BUTTON_TEXT : SAVE_BUTTON_TEXT;
  quizForm.setAttribute("aria-busy", String(saving));
}

// Empties the form after a confirmed save.
function resetForm() {
  quizForm.reset();
  questionsContainer.innerHTML = "";
  clearAllErrors();
  clearFormMessage();
}

// Runs when Save Quiz is pressed: read the form, check it, send it, show the result.
async function handleQuizSubmit(event) {
  // Stop the browser from reloading the page. We send the data ourselves.
  event.preventDefault();

  if (isSaving) {
    return;
  }

  const quizData = collectQuizData();
  if (!validateQuiz(quizData)) {
    return;
  }

  setSavingState(true);
  showFormMessage("Saving quiz...", "warning");

  try {
    // Send the quiz to the backend as JSON
    const response = await fetch(QUIZ_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizData),
    });
    const data = await response.json();

    // The save only counts if the backend answers with {"success": true}
    if (response.ok && data.success) {
      resetForm();
      showFormMessage("Quiz saved successfully!", "success");
    } else {
      showFormMessage(data.message || "The quiz could not be saved.", "error");
    }
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Saving the quiz failed:", error);
    showFormMessage("Something went wrong. Your quiz has not been saved. Try again.", "error");
  } finally {
    // Runs after success or failure, so the form never stays locked.
    setSavingState(false);
  }
}

// ---- Buttons and events ----
// Add Question button.
addQuestionBtn.addEventListener("click", addQuestion);

// Remove buttons. One listener on the container also works for questions added later.
questionsContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-question-btn");

  if (removeButton) {
    removeQuestion(removeButton.closest(".question"));
  }
});

// When a question's type radio changes, update only that question.
questionsContainer.addEventListener("change", (event) => {
  if (event.target.matches('input[type="radio"][name^="type-"]')) {
    const questionElement = event.target.closest(".question");

    clearQuestionErrors(questionElement);
    updateQuestionType(questionElement);
  }
});

// Hide the old "saved" message once the user starts typing a new quiz.
quizForm.addEventListener("input", () => {
  if (formMessage.dataset.status === "success") {
    clearFormMessage();
  }
});

// Save Quiz button (or the Enter key).
quizForm.addEventListener("submit", handleQuizSubmit);

// When the page loads, show the "not connected" notice only if no address is set.
setVisible(apiStatusNotice, !QUIZ_API_ENDPOINT);