//change this to the real signup endpoint
const SIGNUP_URL = "/api/signup";

//Where to go after the account is created
const LOGIN_PAGE = "login.html";

//Get the elements
const form = document.getElementById("signup-form");
const messageBox = document.getElementById("signup-message");
const signupButton = document.getElementById("signup-button");

const firstNameInput = document.getElementById("first-name");
const middleNameInput = document.getElementById("middle-name");
const lastNameInput = document.getElementById("last-name");
const emailInput = document.getElementById("email");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

//Helper functions

//Show a message at the top of the form (type: "error" or "success")
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.hidden = true;
}

//Show an error under one field
function showFieldError(input, errorId, text) {
  const errorSpan = document.getElementById(errorId);
  errorSpan.textContent = text;
  errorSpan.hidden = false;
  input.setAttribute("aria-invalid", "true");
}

//Clear the error under one field
function clearFieldError(input, errorId) {
  const errorSpan = document.getElementById(errorId);
  errorSpan.textContent = "";
  errorSpan.hidden = true;
  input.removeAttribute("aria-invalid");
}

// Clear every field error
function clearAllErrors() {
  clearFieldError(firstNameInput, "first-name-error");
  clearFieldError(middleNameInput, "middle-name-error");
  clearFieldError(lastNameInput, "last-name-error");
  clearFieldError(emailInput, "email-error");
  clearFieldError(usernameInput, "username-error");
  clearFieldError(passwordInput, "password-error");
  clearFieldError(confirmPasswordInput, "confirm-password-error");
}

//Validation rules

// Letters, spaces, apostrophes, periods and hyphens
const namePattern = /^\p{L}[\p{L}\s'.-]*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z0-9._-]{3,30}$/;

//Returns an error message, or "" if the name is fine
function checkName(value, label) {
  if (value === "") {
    return label + " is required.";
  }
  if (value.length > 50) {
    return label + " must be 50 characters or fewer.";
  }
  if (!namePattern.test(value)) {
    return label + " can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }
  return "";
}

function checkEmail(value) {
  if (value === "") {
    return "Email address is required.";
  }
  if (!emailPattern.test(value)) {
    return "Please enter a valid email address.";
  }
  return "";
}

function checkUsername(value) {
  if (value === "") {
    return "Username is required.";
  }
  if (!usernamePattern.test(value)) {
    return "Username must be 3 to 30 characters: letters, numbers, dots, underscores, or hyphens.";
  }
  return "";
}

function checkPassword(value) {
  if (value === "") {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must have at least one uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must have at least one lowercase letter.";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must have at least one number.";
  }
  return "";
}

function checkConfirmPassword(password, confirmPassword) {
  if (confirmPassword === "") {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return "";
}

// Runs all the checks. Returns true if the form is valid.
function validateForm() {
  clearAllErrors();

  // Passwords are NOT trimmed, spaces can be part of a password
  const checks = [
    { input: firstNameInput, errorId: "first-name-error", error: checkName(firstNameInput.value.trim(), "First name") },
    { input: middleNameInput, errorId: "middle-name-error", error: middleNameInput.value.trim() === "" ? "" : checkName(middleNameInput.value.trim(), "Middle name") },
    { input: lastNameInput, errorId: "last-name-error", error: checkName(lastNameInput.value.trim(), "Last name") },
    { input: emailInput, errorId: "email-error", error: checkEmail(emailInput.value.trim()) },
    { input: usernameInput, errorId: "username-error", error: checkUsername(usernameInput.value.trim()) },
    { input: passwordInput, errorId: "password-error", error: checkPassword(passwordInput.value) },
    { input: confirmPasswordInput, errorId: "confirm-password-error", error: checkConfirmPassword(passwordInput.value, confirmPasswordInput.value) }
  ];

  let firstInvalidInput = null;

  //loops through each validation result.
  //if a field has an error, it displays that error.
  for (let i = 0; i < checks.length; i++) {
    if (checks[i].error !== "") {
      showFieldError(checks[i].input, checks[i].errorId, checks[i].error);
      if (firstInvalidInput === null) {
        firstInvalidInput = checks[i].input;
      }
    }
  }

  //if any field is invalid, show a general message and focus the first invalid field
  if (firstInvalidInput !== null) {
    showMessage("Please fix the errors below and try again.", "error");
    firstInvalidInput.focus();
    return false;
  }

  return true;
}

//Show / hide password buttons
const toggleButtons = document.querySelectorAll("[data-toggle-password]");

toggleButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const targetInput = document.getElementById(button.dataset.target);
    const isHidden = targetInput.type === "password";

    targetInput.type = isHidden ? "text" : "password";
    button.textContent = isHidden ? "Hide" : "Show";
    button.setAttribute("aria-pressed", isHidden ? "true" : "false");
  });
});

//Clear a field's error while the user is fixing it
firstNameInput.addEventListener("input", function () {
  clearFieldError(firstNameInput, "first-name-error");
});
middleNameInput.addEventListener("input", function () {
  clearFieldError(middleNameInput, "middle-name-error");
});
lastNameInput.addEventListener("input", function () {
  clearFieldError(lastNameInput, "last-name-error");
});
emailInput.addEventListener("input", function () {
  clearFieldError(emailInput, "email-error");
});
usernameInput.addEventListener("input", function () {
  clearFieldError(usernameInput, "username-error");
});
passwordInput.addEventListener("input", function () {
  clearFieldError(passwordInput, "password-error");
});
confirmPasswordInput.addEventListener("input", function () {
  clearFieldError(confirmPasswordInput, "confirm-password-error");
});

//Submit the form
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideMessage();

  //validates all input fields
  //if invalid, the function stops immediately.
  if (!validateForm()) {
    return;
  }

  //Data to send to the server
  //JSON object obtaining the signup data
  const userData = {
    firstName: firstNameInput.value.trim(),
    middleName: middleNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    email: emailInput.value.trim(),
    username: usernameInput.value.trim(),
    password: passwordInput.value
  };

  //Stop the user from clicking the button twice
  signupButton.disabled = true;
  signupButton.textContent = "Creating account...";

  //sends a POST request with JSON data to the signup API
  //converts the JAVASCRIPT object into JSON string using JSON.stringify()
  try {
    const response = await fetch(SIGNUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    //The response might not be JSON
    let result = {};
    try {
      result = await response.json();
    } catch (parseError) {
      result = {};
    }

    //if the server responds with a success status, redirect to the login page
    if (response.ok) {
      showMessage("Account created! Redirecting to the login page...", "success");
      window.location.href = LOGIN_PAGE;
    } 
    //if the server responds with an error status, show the error message
    else {
      showMessage(result?.message || "Could not create your account. Please try again.", "error");
      signupButton.disabled = false;
      signupButton.textContent = "Create account";
    }
  //if the fetch itself fails (network error, server down, etc.)
  } catch (networkError) {
    showMessage("Cannot reach the server. Please check your connection and try again.", "error");
    signupButton.disabled = false;
    signupButton.textContent = "Create account";
  }
});