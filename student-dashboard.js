const QuizListBtn = document.getElementById("QuizListBtn");
const TakeQuizBtn = document.getElementById("TakeQuizBtn");
const ResultBtn = document.getElementById("ResultBtn");

//Quiz list page redirect
QuizListBtn.addEventListener("click", function () {
  window.location.href = "student-dashboard/Quiz-list.html";
});

//Take quiz page redirect
TakeQuizBtn.addEventListener("click", function () {
  window.location.href = "student-dashboard/Take-quiz.html";
});

//result page redirect
ResultBtn.addEventListener("click", function () {
  window.location.href = "student-dashboard/Results.html";
});

//logout
//set this to the real logout URL
const LOGOUT_API_ENDPOINT = "/api/logout";
const LOGIN_PAGE = "login.html";
const LogoutBtn = document.getElementById("LogoutBtn");

LogoutBtn.addEventListener("click", async function () {
  //stop double clicks
  LogoutBtn.disabled = true;

  try {
    //ask the server to end the session
    const response = await fetch(LOGOUT_API_ENDPOINT, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    //go back to login page only after the server confirms
    window.location.href = LOGIN_PAGE;
  } catch (error) {
    alert("Could not log out. Please try again.");
    LogoutBtn.disabled = false;
  }
});