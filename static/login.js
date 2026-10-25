document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailError = document.getElementById("email-error");
  const passwordError = document.getElementById("password-error");
  const message = document.getElementById("login-message");
  const toggleBtn = document.getElementById("toggle-password");
  const loginBtn = document.getElementById("login-button");

  function showError(el, text) {
    if (el) {
      el.textContent = text;
      el.hidden = !text;
    }
  }

  // Show / hide password
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      toggleBtn.textContent = show ? "Hide" : "Show";
      toggleBtn.setAttribute("aria-pressed", show);
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (message) message.hidden = true;

      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      // Basic client-side validation
      showError(emailError, email ? "" : "Email is required");
      showError(passwordError, password ? "" : "Password is required");
      if (!email || !password) return;

      if (loginBtn) loginBtn.disabled = true;

      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          window.location.href = "/dashboard";
        } else {
          if (message) {
            message.textContent = data.message || "Invalid credentials";
            message.hidden = false;
          }
        }
      } catch (err) {
        if (message) {
          message.textContent = "Something went wrong. Try again.";
          message.hidden = false;
        }
      } finally {
        if (loginBtn) loginBtn.disabled = false;
      }
    });
  }
});