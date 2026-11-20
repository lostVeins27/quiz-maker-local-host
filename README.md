#  Quiz Maker (Local Host)


A role-based web application for creating, hositing, and taking quizzes over a local network, built with **Flask**, **SQLite**, **HTML**, **CSS*, and **JavaScript**.

## Overview

The platform, which is intended for use in classrooms and group assessments in a local host environment, divides **Student** and **Professor** workflows. While students can join active quizzes via PIN, submit answers, and view results, professors can create and manage quizzes, create 5-digit PINs, set timed sessions, and review submissions.

## Key Features

* **Authentication & Role Routing:** User registration and login with hashed password(`werkzeug.security`), session handling, and role-based dashboards (`professor` and `student`).

* **Professor Workflow:** Create, edit, manage, and delete quizzes; toggle quizzes active status with optional time limits; generate random unique 5-digit PINs for students to enter to take that specific quiz for that PIN; inspect student scores and completion times; and professor allow retakes button.

* **Student Workflow:** Join active quizzes using a 5-digit PIN, complete timed or untimed tests with single-submission enforcement, and check personal results.

* **Automatic SQLite Initialization:** Creates required tables (`users`, `quiz`, `question`, `choice`, `submission`) automatically on startup via `init_db()`.

## Tech Stack

* **Backend:** Python, Flask, Werkzeug(`generate_password_hash` / `check_password_hash`)
* **Database:** SQLite3
* **Frontend:** HTML5, CSS3, JavaScript

## Getting Started (Local Setup)

1. **Clone the repository**
  ```bash
  git clone https://github.com/lostVeins27/quiz-maker-local-host
  cd quiz-maker-local-host