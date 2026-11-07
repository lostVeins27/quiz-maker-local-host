// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// The backend address the PIN is checked at (it must match the route in the backend).
// POST {"pin": "12345"}: must answer {"success": true} for a right PIN, or {"success": false, "message": "..."}.
const VERIFY_PIN_ENDPOINT = "/take-quiz/verify-pin";

// The page the Back to Dashboard button goes to (change it if your student dashboard route is different).
const DASHBOARD_URL = "/dashboard";

// The main take quiz page the student goes to after a right PIN (take-quiz.html).
const TAKE_QUIZ_PAGE_URL = "/take-quiz";

// The take quiz page reads the PIN from here, so the student can't open the quiz without a PIN.
const PIN_STORAGE_KEY = "takeQuizPin";

// A PIN has exactly 5 digits.
const PIN_LENGTH = 5;

// Text on the button: normal, and while the PIN is being checked.
const ENTER_BUTTON_TEXT = "Enter Quiz";
const CHECKING_BUTTON_TEXT = "Checking...";

// ---- Simulation (for testing without a backend) ----
// true  = the page accepts the sample PINs below and never contacts the backend.
// false = the page checks the PIN using the address above.
// The sample PINs must match the keys of SAMPLE_QUIZZES in take-quiz.js.
const USE_SAMPLE_DATA = false;
const SAMPLE_PINS = ["11111", "12345", "54321"];

const pinForm = document.getElementById("pin-form");
const pinInput = document.getElementById("quiz-pin");
const pinError = document.getElementById("quiz-pin-error");
const enterQuizBtn = document.getElementById("enter-quiz-btn");
const formMessage = document.getElementById("form-message");
const dashboardBtn = document.getElementById("dashboard-btn");

// true while the PIN is being checked, so it can't be sent twice.
let isChecking = false;

// Shows a message under the form. status is "error" or "warning".
function showFormMessage(message, status) {
  formMessage.textContent = message;
  formMessage.dataset.status = status;
}

// Removes that message and the PIN error.
function clearMessages() {
  formMessage.textContent = "";
  delete formMessage.dataset.status;
  pinError.textContent = "";
}

// While checking: lock the form and show "Checking...", so nothing is changed or sent twice.
function setCheckingState(checking) {
  isChecking = checking;

  pinForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = checking;
  });

  enterQuizBtn.textContent = checking ? CHECKING_BUTTON_TEXT : ENTER_BUTTON_TEXT;
  pinForm.setAttribute("aria-busy", String(checking));
}

// Asks if the PIN is right. Returns {ok: true} or {ok: false, message: "..."}.
async function verifyPin(pin) {
  if (USE_SAMPLE_DATA) {
    return SAMPLE_PINS.includes(pin)
      ? { ok: true }
      : { ok: false, message: "Wrong PIN. Please check it and try again." };
  }

  const response = await fetch(VERIFY_PIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await response.json();

  // The PIN only counts if the backend answers with {"success": true}
  if (response.ok && data.success) {
    return { ok: true };
  }
  return { ok: false, message: data.message || "Wrong PIN. Please check it and try again." };
}

// Runs when Enter Quiz is pressed (or the Enter key): check the PIN, then open the quiz.
async function handlePinSubmit(event) {
  // Stop the browser from reloading the page. We send the data ourselves.
  event.preventDefault();

  if (isChecking) {
    return;
  }

  clearMessages();
  const pin = pinInput.value.trim();

  // The PIN must be exactly 5 digits.
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    pinError.textContent = `Please enter the ${PIN_LENGTH}-digit PIN.`;
    pinInput.focus();
    return;
  }

  setCheckingState(true);
  showFormMessage("Checking PIN...", "warning");

  try {
    const result = await verifyPin(pin);

    if (!result.ok) {
      showFormMessage(result.message, "error");
      setCheckingState(false);
      pinInput.select();
      return;
    }

    // Right PIN: remember it for the next page, then go to the quiz.
    // The PIN is also put in the address, so the quiz opens even when the browser does not share storage between pages.
    const nextPage = `${TAKE_QUIZ_PAGE_URL}?pin=${encodeURIComponent(pin)}`;
    try {
      sessionStorage.setItem(PIN_STORAGE_KEY, pin);
    } catch (error) {
      // Nothing to do: the PIN in the address is enough.
    }
    window.location.href = nextPage;
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Checking the PIN failed:", error);
    showFormMessage("Something went wrong. The PIN could not be checked. Try again.", "error");
    setCheckingState(false);
  }
}

// ---- Buttons and events ----
// Only digits can be typed (letters and spaces are removed, also when pasting).
pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
  clearMessages();
});

// Enter Quiz button (or the Enter key).
pinForm.addEventListener("submit", handlePinSubmit);

// Back to Dashboard button.
dashboardBtn.addEventListener("click", () => {
  window.location.href = DASHBOARD_URL;
});

// Start with the cursor in the PIN box.
pinInput.focus();