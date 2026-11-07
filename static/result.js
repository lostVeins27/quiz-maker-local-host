// The backend address that ends the active quiz (it must match the route in the backend).
// It must answer {"success": true} when the quiz was ended.
const END_QUIZ_ENDPOINT = "/end-quiz";

const backBtn = document.getElementById("backBtn")
const endearlyBtn = document.getElementById("endearlyBtn");
const activeQuizName = document.getElementById("activeQuizName");
const endEarlyDialog = document.getElementById("endEarlyDialog");
const endEarlyError = document.getElementById("endEarlyError");
const endEarlyYesBtn = document.getElementById("endEarlyYesBtn");
const endEarlyNoBtn = document.getElementById("endEarlyNoBtn");

// true while the request to end the quiz is being sent, so it can't be sent twice.
let isEnding = false;

backBtn.addEventListener("click", function () {
  window.location.href = "/dashboard";
});

// End Early button: does not end anything yet, it only opens the "Are you sure?" pop up.
endearlyBtn.addEventListener("click", function () {
  endEarlyError.textContent = "";
  endEarlyDialog.showModal();
});

// While ending: lock the pop up buttons and show "Ending...", so the request is not sent twice.
function setEndingState(ending) {
  isEnding = ending;
  endEarlyYesBtn.disabled = ending;
  endEarlyNoBtn.disabled = ending;
  endEarlyYesBtn.textContent = ending ? "Ending..." : "Yes";
}

// Pop up: Yes ends the quiz.
endEarlyYesBtn.addEventListener("click", async function () {
  if (isEnding) {
    return;
  }

  setEndingState(true);
  endEarlyError.textContent = "";

  try {
    const response = await fetch(END_QUIZ_ENDPOINT, { method: "POST" });
    const data = await response.json();

    // The quiz only counts as ended if the backend answers with {"success": true}
    if (response.ok && data.success) {
      endEarlyDialog.close();
      activeQuizName.textContent = "No active quiz";
      endearlyBtn.disabled = true;
    } else {
      endEarlyError.textContent = data.message || "The quiz could not be ended.";
    }
  } catch (error) {
    // This runs when the request could not be sent or the reply was not JSON
    console.error("Ending the quiz failed:", error);
    endEarlyError.textContent = "Something went wrong. The quiz has not been ended. Try again.";
  } finally {
    setEndingState(false);
  }
});

// Pop up: No closes it and nothing happens to the quiz.
endEarlyNoBtn.addEventListener("click", function () {
  endEarlyDialog.close();
});

// Stop the Escape key from closing the pop up while the quiz is being ended.
endEarlyDialog.addEventListener("cancel", function (event) {
  if (isEnding) {
    event.preventDefault();
  }
});