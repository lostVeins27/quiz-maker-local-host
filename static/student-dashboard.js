const TakeQuizBtn = document.getElementById("TakeQuizBtn");
const ResultBtn = document.getElementById("ResultBtn");
const LogoutBtn = document.getElementById("logoutBtn");


//Take quiz page redirect
TakeQuizBtn.addEventListener("click", function () {
  window.location.href = "student_dashboard/Take-quiz.html";
});

//result page redirect
ResultBtn.addEventListener("click", function () {
  window.location.href = "/result";
});

//logout redirect
LogoutBtn.addEventListener("click", function () {
  window.location.href = "/logout";
});