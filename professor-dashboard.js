const createQuizBtn = document.getElementById("createQuizBtn");
const manageQuizBtn = document.getElementById("manageQuizBtn");
const startQuizBtn = document.getElementById("startQuizBtn");
const resultBtn = document.getElementById("resultBtn");

//create quiz page redirect
createQuizBtn.addEventListener("click", function () {
  window.location.href = "professor-dashboard/create-quiz.html";
});

//manage quiz page redirect
manageQuizBtn.addEventListener("click", function () {
  window.location.href = "professor-dashboard/manage-quiz.html";
});

//start quiz page redirect
startQuizBtn.addEventListener("click", function () {
  window.location.href = "professor-dashboard/start-quiz.html";
});

//result page redirect
resultBtn.addEventListener("click", function () {
  window.location.href = "professor-dashboard/results.html";
});

//logout
//set this to the real logout URL
const LOGOUT_API_ENDPOINT = "/api/logout";
const LOGIN_PAGE = "login.html";
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async function () {
  //stop double clicks
  logoutBtn.disabled = true;

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
    logoutBtn.disabled = false;
  }
});