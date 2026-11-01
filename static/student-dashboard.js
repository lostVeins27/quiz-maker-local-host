const QuizListBtn = document.getElementById("QuizListBtn");
const TakeQuizBtn = document.getElementById("TakeQuizBtn");
const ResultBtn = document.getElementById("ResultBtn");
const LogoutBtn = document.getElementById("logoutBtn");

//Quiz list page redirect
QuizListBtn.addEventListener("click", function () {
  window.location.href = "student_dashboard/Quiz-list.html";
});

//Take quiz page redirect
TakeQuizBtn.addEventListener("click", function () {
  window.location.href = "student_dashboard/Take-quiz.html";
});

//result page redirect
ResultBtn.addEventListener("click", function () {
  window.location.href = "student_dashboard/Results.html";
});

//logout redirect
LogoutBtn.addEventListener("click", function () {
  window.location.href = "/logout";
});