//Get the elements from the HTML
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const togglePasswordBtn = document.getElementById("toggle-password");
const loginButton = document.getElementById("login-button");

//Backend API endpoint for login
const LOGIN_URL = "/api/login";

//the page to redirect to after successful login
const REDIRECT_URL = "dashboard.html";

//Helper functions

// Show a message at the top of the page (error or success)
function showMessage(text, type) {
  loginMessage.textContent = text;
  loginMessage.className = type; // "error" or "success"
  loginMessage.hidden = false;
}

function hideMessage() {
  loginMessage.textContent = "";
  loginMessage.className = "";
  loginMessage.hidden = true;
}

// Show an error under a field
function showFieldError(input, errorElement, text) {
  errorElement.textContent = text;
  errorElement.hidden = false;
  input.setAttribute("aria-invalid", "true");
}

// Clear the error under a field
function clearFieldError(input, errorElement) {
  errorElement.textContent = "";
  errorElement.hidden = true;
  input.removeAttribute("aria-invalid");
}

// Simple email format check (same rule as the signup page)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Check the inputs. Returns true if everything is valid.
function validateForm() {
  let isValid = true;
  let emailHasError = false;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  clearFieldError(emailInput, emailError);
  clearFieldError(passwordInput, passwordError);

  if (email === "") {
    showFieldError(emailInput, emailError, "Please enter your email address.");
    emailHasError = true;
    isValid = false;
  } else if (!emailPattern.test(email)) {
    showFieldError(emailInput, emailError, "Please enter a valid email address.");
    emailHasError = true;
    isValid = false;
  }

  if (password === "") {
    showFieldError(passwordInput, passwordError, "Please enter your password.");
    isValid = false;
  }

  // Focus the first field that has a problem
  if (emailHasError) {
    emailInput.focus();
  } else if (password === "") {
    passwordInput.focus();
  }

  return isValid;
}

// ----- Show / hide password button -----
togglePasswordBtn.addEventListener("click", function () {
  const isHidden = passwordInput.type === "password";

  if (isHidden) {
    passwordInput.type = "text";
    togglePasswordBtn.textContent = "Hide";
    togglePasswordBtn.setAttribute("aria-pressed", "true");
  } else {
    passwordInput.type = "password";
    togglePasswordBtn.textContent = "Show";
    togglePasswordBtn.setAttribute("aria-pressed", "false");
  }
});

// ----- Clear errors while the user is typing -----
emailInput.addEventListener("input", function () {
  clearFieldError(emailInput, emailError);
  hideMessage();
});

passwordInput.addEventListener("input", function () {
  clearFieldError(passwordInput, passwordError);
  hideMessage();
});

// ----- Handle the form submit -----
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault(); // stop the page from reloading
  hideMessage();

  if (!validateForm()) {
    return;
  }

  // Emails are not case-sensitive for login, so send them in lowercase
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  // Disable the button so the user can't click it twice
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    // Try to read the JSON reply (it may be empty on some errors)
    let data = {};
    try {
      data = await response.json();
    } catch (jsonError) {
      data = {};
    }

    if (response.ok) {
      showMessage("Login successful! Redirecting...", "success");
      window.location.href = REDIRECT_URL;
    } else if (response.status === 401 || response.status === 400) {
      showMessage(data.message || "Incorrect email or password.", "error");
      passwordInput.value = "";
      passwordInput.focus();
    } else {
      showMessage(
        data.message || "Something went wrong. Please try again later.",
        "error"
      );
    }
  } catch (error) {
    // This runs when the request could not be sent (no internet, server down)
    console.error("Login error:", error);
    showMessage(
      "Cannot connect to the server. Please check your connection and try again.",
      "error"
    );
  } finally {
    // Turn the button back on
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});