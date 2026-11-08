// Makes JavaScript warn about common mistakes, like a misspelled variable name.
"use strict";

// The backend address the PIN is checked at (it must match the route in the backend).
const VERIFY_PIN_ENDPOINT = "/take-quiz/verify-pin";

// The page the Back to Dashboard button goes to.
const DASHBOARD_URL = "/dashboard";

// The main take quiz page the student goes to after a right PIN.
const TAKE_QUIZ_PAGE_URL = "/take-quiz";

// The PIN page saves the right PIN here.
const PIN_STORAGE_KEY = "takeQuizPin";

// A PIN has exactly 5 digits.
const PIN_LENGTH = 5;

// Text on the button: normal, and while the PIN is being checked.
const ENTER_BUTTON_TEXT = "Enter Quiz";
const CHECKING_BUTTON_TEXT = "Checking...";

const USE_SAMPLE_DATA = false;
const SAMPLE_PINS = ["11111", "12345", "54321"];

const pinForm = document.getElementById("pin-form");
const pinInput = document.getElementById("quiz-pin");
const pinError = document.getElementById("quiz-pin-error");
const enterQuizBtn = document.getElementById("enter-quiz-btn");
const formMessage = document.getElementById("form-message");
const dashboardBtn = document.getElementById("dashboard-btn");

let isChecking = false;

function showFormMessage(message, status) {
  formMessage.textContent = message;
  formMessage.dataset.status = status;
}

function clearMessages() {
  formMessage.textContent = "";
  delete formMessage.dataset.status;
  pinError.textContent = "";
}

function setCheckingState(checking) {
  isChecking = checking;

  pinForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = checking;
  });

  enterQuizBtn.textContent = checking ? CHECKING_BUTTON_TEXT : ENTER_BUTTON_TEXT;
  pinForm.setAttribute("aria-busy", String(checking));
}

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

  if (response.ok && data.success) {
    return { ok: true };
  }
  return { ok: false, message: data.message || "Wrong PIN. Please check it and try again." };
}

async function handlePinSubmit(event) {
  event.preventDefault();

  if (isChecking) {
    return;
  }

  clearMessages();
  const pin = pinInput.value.trim();

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

    const nextPage = `${TAKE_QUIZ_PAGE_URL}?pin=${encodeURIComponent(pin)}`;
    try {
      sessionStorage.setItem(PIN_STORAGE_KEY, pin);
    } catch (error) {}
    window.location.href = nextPage;
  } catch (error) {
    console.error("Checking the PIN failed:", error);
    showFormMessage("Something went wrong. The PIN could not be checked. Try again.", "error");
    setCheckingState(false);
  }
}

pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
  clearMessages();
});

pinForm.addEventListener("submit", handlePinSubmit);

dashboardBtn.addEventListener("click", () => {
  window.location.href = DASHBOARD_URL;
});

pinInput.focus();