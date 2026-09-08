# quiz-maker-local-host

Isel - Database (sa database branch ka mag push ng files mo)
* MySQL database
* SQL to flask
* Tables and Result
* Tables and elements
  - users (gawa ka table for each ung nasababa ayun ung nilalaman nila)
    - id (dapat hindi madoble)
    - fullname
    - username
    - email
    - password
    - role

  - Quizzes
    - Id (dapat hindi madoble)
    - title
    - description
    - created_by

  - Questions
    - id (dapat hindi madoble)
    - quiz_id
    - question_text

  - Choices
    - id (dapat hindi madoble)
    - question_id
    - choice_text
    - is_correct
   
  - result
    - id (dapat hindi madoble)
    - quiz_id
    - user_id
    - score
    - submitted_at

Daniel - Backend
* Flask
* Authentication
* Quiz taking logic
* Score calculation

Zion - Frontend (sa frontend branch ka mag push ng files mo)
* HTML
* CSS
* Javascript
* Pages
  - Signup
    - Full name (Text Field magkahiwalay ung first middle tapos last name tas may indicator bawat text field) 
    - Username (Text field)
    - Email (Text field)
    - Password (Text Field pag nag type dapat *** ganyan lalabas)
    - Confirm Password (Text Field pag nag type dapat *** ganyan lalabas)
    - Account type Student/Professor (Radio button)
    - Signup Button (Button)
    - Already have an account? Login (Label pero ung "Login" clickable)
      
  - Login
    - Username/Email (text field)
    - Password (Text Field pag nag type dapat *** ganyan lalabas)
    - Login Button (Button)
    - Don't have an account? Signup (Label pero ung "Signup" clickable)
    
  - Professor Dashboard (Professor side)
    - Welcome, Name (label welcome tapos name ng professor sa taas)
    - Create quiz button (Button)
    - Manage quizzes (Button)
    - view result (Button)
    - Logout (Button sa top right)

  - Create quiz page
    - Quiz title (text field)
    - Description/Instruction (Text field)
    - Add Question (Button)
    - Question Field (Text field lalabas pag napindot ung add question)
    - Select Question type (Radio button for example multiple choice test, indentification)
    - Add choices (Text field lalabas ung add choices depends sa question type na pinili ng user for example pinili nya multiple choice test lalabas apat na text field na nakalagay A. haggang D.)
    - Select Correct Answer(Radio button pipili ung user sa A to D kung alin ung tamang sagot)
    - Save quiz (Button)
   
  - Edit quiz page
    - Modify title and Description
    - Edit questions
    - Change choices/correct answer
    - Add/Remove question
    - Update quiz

  - Quiz Management Page
    - List of created quizzes
    - Edit
    - Delete
    - Preview
    - View Result

  - Result Page
    - List of students
    - Score
    - Percentage
    - Date/Time
    - Average Score

  - Quiz List(Student side)
    - Available Quizzes
    - Quiz title
    - Number of questions
    - Start Quiz Button

  - Take quiz page(Student side)
    - Question
    - Multiple Choice answers (kung multiple choice ung queston)
    - Identification field (kung identification ung question)
    - Question number
    - Progress bar
    - Previous/Next
    - Submit quiz
   
  - Quiz Result Page(Student side)
    - Score
    - Percentage
    - Number of correct/incorrect
    - Retake Button (kung available)
