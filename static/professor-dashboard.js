const createQuizBtn = document.getElementById("createQuizBtn");
const manageQuizBtn = document.getElementById("manageQuizBtn");
const startQuizBtn = document.getElementById("startQuizBtn");
const resultBtn = document.getElementById("resultBtn");
const logoutBtn = document.getElementById("logoutBtn")

//create quiz page redirect
createQuizBtn.addEventListener("click", function () {
  window.location.href = "create-quiz.html";
});

//manage quiz page redirect
manageQuizBtn.addEventListener("click", function () {
  window.location.href = "manage-quiz.html";
});

//start quiz page redirect
startQuizBtn.addEventListener("click", function () {
  window.location.href = "start-quiz.html";
});

//result page redirect
resultBtn.addEventListener("click", function () {
  window.location.href = "results.html";
});

//logout page redirect
logoutBtn.addEventListener("click", function () {
  window.location.href = "/logout";
});


