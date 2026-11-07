from flask import Flask, render_template, redirect, url_for, request, jsonify, session
import sqlite3

app = Flask(__name__)
app.secret_key = "asdfasdfasdfgsjhdafgjkxcgvjasdouryehrkjshdf"

def init_db():
    """Automatically creates the database table and test user if they don't exist"""
    conn = sqlite3.connect("quizdb.db")
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS users")
    
    # Create the table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      middle_name TEXT DEFAULT 'N/A',
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
    """)

    # Create quiz table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        professor_email TEXT
    )
    """)

    # Create question table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS question (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER,
        question_number INTEGER,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
    )
    """)

    # Create choice table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS choice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER,
        label TEXT NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
    )
    """)

    # Check if test user already exists, if not, insert them
    cursor.execute("SELECT * FROM users WHERE email = ?", ('email@example.com',))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (first_name, middle_name, last_name, email, password, role)
        VALUES 
            ('John', 'M', 'Doe', 'email@example.com', 'passwordtesting', 'student'),
            ('Daniel', 'D', 'Maninang', 'student@gmail.com', '123', 'student'),
            ('Daniel', 'D', 'Maninang', 'professor@gmail.com', '123', 'professor')
        """)
        print("Test user inserted successfully!")
        
    conn.commit()
    conn.close()


def get_current_user():
    if "user_email" not in session:
        return None

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM users where email = ?", (session["user_email"],)
    )

    user = cursor.fetchone()
    conn.close()

    return user
    


@app.route("/")
def home():
    return redirect(url_for("login_page"))

@app.route("/login", methods = ["GET", "POST"])
def login_page():

    if "user_email" in session:
        return redirect(url_for("dashboard"))

    if request.method == "POST":


        data = request.get_json()

        if not data:
            return (
                jsonify({"success": False, "message": "Invalid Login Data."}),
                400,
            )


        email = data.get("email", "").strip().lower()
        password = data.get("password")

        conn = sqlite3.connect("quizdb.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email = ? ", (email,))
        user = cursor.fetchone()
        conn.close()


        if user and user["password"] == password:
            session["user_email"] = user["email"]
            session["role"] = user["role"]

            return jsonify ({"success": True})
        else:
            return jsonify(
                {"success": False, "message": "Invalid Email or Password."}
            ), 400

    else:
        return render_template("login.html")

@app.route("/signup", methods = ["GET", "POST"])
def signup_page():

    if "user_email" in session:
            return redirect(url_for("dashboard"))

    if request.method == "POST":

        data = request.get_json()
        if not data:
            return(
                jsonify({"success": False, "message": "Invalid submission data"}),
                400,
            )

        first_name = data.get("firstName")
        middle_name = data.get("middleName")
        if not middle_name:
            middle_name = "N/A"
        last_name = data.get("lastName")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")

        print(f"--- DEBUG --- Received email: {email}")

        conn = sqlite3.connect("quizdb.db")
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()


        print(f"--- DEBUG --- Database query result: {existing_user}")


        if existing_user:
            conn.close()
            return jsonify({"success": False, "message": "Email already exists!"}), 400

        cursor.execute("""
                INSERT INTO users (first_name, middle_name, last_name, email, password, role)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
            (first_name, middle_name, last_name, email, password, role),)
        
        conn.commit()
        conn.close()

        return jsonify({"success": True})
        
    else:
        return render_template("signup.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))

@app.route("/dashboard")
def dashboard():

    user = get_current_user()

    if not user:
        return redirect(url_for("login_page"))

    match user["role"]:
        case "student":
            return render_template("student-dashboard.html", user = user)
        case "professor":
            return render_template("professor-dashboard.html", user = user)
        case _:
            return "Unauthorized role", 403



@app.route("/users")
def view_users():
    conn = sqlite3.connect("quizdb.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, first_name, last_name, email, role, password FROM users"
    )
    all_users = cursor.fetchall()
    conn.close()

    html = "<h1>Registered Users in Database</h1><ul>"
    for user in all_users:
        # user[1] = first_name, user[2] = last_name, user[3] = email, user[4] = role
        html += (
            f"<li><strong>{user[0]} {user[1]} {user[2]}</strong> — {user[3]} ({user[4]}) password = {user[5]}</li> "
        )
    html += "</ul><br><a href='/login'>Go to Login</a> </ul><br><a href='/signup'>Go to Signup</a>"

    return html

@app.route("/result")
def result():

    user = get_current_user()

    if not user:
        return redirect(url_for("login_page"))

    match user["role"]:
            case "student":
                return render_template("student-result.html")
            case "professor":
                return render_template("professor-result.html")
            case _:
                return "Unauthorized role", 403

    
    
    return render_template("result.html", user=user)

@app.route("/result-main")
def result_main():

    user = get_current_user()

    if not user:
        return redirect(url_for("login_page"))

    match user["role"]:
            case "student":
                return render_template("student-result.html")
            case "professor":
                return render_template("professor-result-main.html")
            case _:
                return "Unauthorized role", 403

@app.route("/manage-quiz")
def manage_quiz():
    if "role" not in session or session["role"] != "professor":
        return redirect(url_for("dashboard"))
    
    return render_template("manage-quiz.html")

@app.route("/quizzes", methods=["GET"])
def get_quizzes():
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    professor_email = session.get("user_email")
    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Fetch quizzes created by the logged-in professor
    cursor.execute("SELECT * FROM quiz WHERE professor_email = ?", (professor_email,))
    quizzes = cursor.fetchall()

    quiz_list = []
    for q in quizzes:
        # Count the questions belonging to this quiz
        cursor.execute("SELECT COUNT(*) as count FROM question WHERE quiz_id = ?", (q["id"],))
        count_row = cursor.fetchone()
        question_count = count_row["count"] if count_row else 0

        quiz_list.append({
            "id": q["id"],
            "title": q["title"],
            "questionCount": question_count
        })

    conn.close()
    return jsonify({"success": True, "quizzes": quiz_list})


@app.route("/quizzes/<int:quiz_id>", methods=["GET", "PUT", "DELETE"])
def handle_quiz(quiz_id):
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Ensure foreign keys are enabled so CASCADE works properly
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Verify quiz exists
    cursor.execute("SELECT * FROM quiz WHERE id = ?", (quiz_id,))
    quiz = cursor.fetchone()
    if not quiz:
        conn.close()
        return jsonify({"success": False, "message": "Quiz not found."}), 404

    # GET: Return quiz details along with its questions and choices for editing
    if request.method == "GET":
        quiz_data = {
            "id": quiz["id"],
            "title": quiz["title"],
            "description": quiz["description"],
            "questions": []
        }

        cursor.execute("SELECT * FROM question WHERE quiz_id = ? ORDER BY question_number", (quiz_id,))
        questions = cursor.fetchall()

        for quest in questions:
            q_dict = {
                "type": quest["type"],
                "text": quest["text"],
                "correctAnswer": quest["correct_answer"]
            }

            if quest["type"] in ["multiple-choice", "multiple_choice"]:
                cursor.execute("SELECT label, text FROM choice WHERE question_id = ?", (quest["id"],))
                choices = cursor.fetchall()
                # Convert choice rows into a dictionary format expected by the frontend: {"A": "...", "B": "...", ...}
                q_dict["choices"] = {c["label"]: c["text"] for c in choices}

            quiz_data["questions"].append(q_dict)

        conn.close()
        return jsonify({"success": True, "quiz": quiz_data})

    # PUT: Update quiz details, questions, and choices
    elif request.method == "PUT":
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({"success": False, "message": "Invalid update data."}), 400

        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        questions = data.get("questions", [])

        if not title:
            conn.close()
            return jsonify({"success": False, "message": "Quiz title is required."}), 400

        try:
            # Update quiz table
            cursor.execute(
                "UPDATE quiz SET title = ?, description = ? WHERE id = ?",
                (title, description, quiz_id)
            )

            # Clear out old questions (choices will cascade delete automatically)
            cursor.execute("DELETE FROM question WHERE quiz_id = ?", (quiz_id,))

            # Insert updated questions and choices
            for idx, q in enumerate(questions, start=1):
                q_type = q.get("type")
                q_text = q.get("text")
                correct_answer = q.get("correctAnswer")

                cursor.execute(
                    """
                    INSERT INTO question (quiz_id, question_number, text, type, correct_answer)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (quiz_id, idx, q_text, q_type, correct_answer)
                )
                question_id = cursor.lastrowid

                if q_type in ["multiple-choice", "multiple_choice"]:
                    choices = q.get("choices", {})
                    for label, text in choices.items():
                        cursor.execute(
                            """
                            INSERT INTO choice (question_id, label, text)
                            VALUES (?, ?, ?)
                            """,
                            (question_id, label, text)
                        )

            conn.commit()
            conn.close()
            return jsonify({"success": True})

        except Exception as e:
            conn.close()
            print(f"--- DEBUG ERROR --- {e}")
            return jsonify({"success": False, "message": "Database error while updating quiz."}), 500

    # DELETE: Delete the quiz from the database
    elif request.method == "DELETE":
        try:
            cursor.execute("DELETE FROM quiz WHERE id = ?", (quiz_id,))
            conn.commit()
            conn.close()
            return jsonify({"success": True})
        except Exception as e:
            conn.close()
            print(f"--- DEBUG ERROR --- {e}")
            return jsonify({"success": False, "message": "Database error while deleting quiz."}), 500


@app.route("/create-quiz", methods=["GET", "POST"])
def create_quiz():

    if "role" not in session or session["role"] != "professor":
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Invalid submission data."}), 400

        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        questions = data.get("questions", [])
        professor_email = session.get("user_email")

        if not title:
            return jsonify({"success": False, "message": "Quiz title is required."}), 400

        if not questions:
            return jsonify({"success": False, "message": "At least one question is required."}), 400

        try:
            conn = sqlite3.connect("quizdb.db")
            cursor = conn.cursor()

            # 1. Insert into quiz table
            cursor.execute(
                """
                INSERT INTO quiz (title, description, professor_email)
                VALUES (?, ?, ?)
                """,
                (title, description, professor_email)
            )
            quiz_id = cursor.lastrowid

            # 2. Insert questions and choices
            for q in questions:
                q_number = q.get("number")
                q_text = q.get("text")
                q_type = q.get("type")
                correct_answer = q.get("correctAnswer")

                cursor.execute(
                    """
                    INSERT INTO question (quiz_id, question_number, text, type, correct_answer)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (quiz_id, q_number, q_text, q_type, correct_answer)
                )
                question_id = cursor.lastrowid

                # If multiple choice, insert choices
                if q_type == "multiple-choice":
                    for choice in q.get("choices", []):
                        choice_label = choice.get("label")
                        choice_text = choice.get("text")

                        cursor.execute(
                            """
                            INSERT INTO choice (question_id, label, text)
                            VALUES (?, ?, ?)
                            """,
                            (question_id, choice_label, choice_text)
                        )

            conn.commit()
            conn.close()
            return jsonify({"success": True})

        except Exception as e:
            print(f"--- DEBUG ERROR --- {e}")
            return jsonify({"success": False, "message": "Database error while saving quiz."}), 500

    return render_template("create-quiz.html")

@app.route("/debug-quiz")
def debug_quiz():
    """Debug endpoint to view all saved quizzes, questions, and choices."""
    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quiz")
    quizzes = cursor.fetchall()

    debug_data = []
    for q in quizzes:
        quiz_dict = dict(q)
        
        # Get related questions
        cursor.execute("SELECT * FROM question WHERE quiz_id = ?", (q["id"],))
        questions = cursor.fetchall()
        
        question_list = []
        for quest in questions:
            quest_dict = dict(quest)
            
            # Get related choices if multiple-choice
            cursor.execute("SELECT * FROM choice WHERE question_id = ?", (quest["id"],))
            choices = cursor.fetchall()
            quest_dict["choices"] = [dict(c) for c in choices]
            
            question_list.append(quest_dict)
            
        quiz_dict["questions"] = question_list
        debug_data.append(quiz_dict)

    conn.close()
    return jsonify(debug_data)


@app.route("/start-quiz")
def start_quiz():

    if "role" not in session or session["role"] != "professor":
        return redirect(url_for("dashboard"))

    return render_template("start-quiz.html")

@app.route("/quiz-pin")
def quiz_pin():
    if "role" not in session or session["role"] != "student":
        return redirect(url_for("dashboard"))

    return render_template("take-quiz-pin.html")

@app.route("/take-quiz")
def take_quiz():
    if "role" not in session or session["role"] != "student":
        return redirect(url_for("dashboard"))

    return render_template("take-quiz.html")


if __name__ == "__main__":
    init_db()
    app.run(debug=True)