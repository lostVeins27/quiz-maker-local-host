from flask import Flask, render_template, redirect, url_for, request, jsonify, session
import sqlite3
import random

app = Flask(__name__)
app.secret_key = "asdfasdfasdfgsjhdafgjkxcgvjasdouryehrkjshdf"

def init_db():
    """Automatically creates database tables and test user if they don't exist"""
    conn = sqlite3.connect("quizdb.db")
    cursor = conn.cursor()

    # Create users table
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

    # Create quiz table (Added pin and is_active columns)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        professor_email TEXT,
        pin TEXT UNIQUE,
        is_active INTEGER DEFAULT 0,
        duration_minutes INTEGER DEFAULT 0,
        started_at TEXT
    )
    """)

    # Safety check for existing tables
    try:
        cursor.execute("ALTER TABLE quiz ADD COLUMN duration_minutes INTEGER DEFAULT 0;")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE quiz ADD COLUMN started_at TEXT;")
    except sqlite3.OperationalError:
        pass

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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS submission (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER,
        student_email TEXT,
        student_name TEXT,
        score INTEGER,
        total_points INTEGER,
        time_taken INTEGER DEFAULT 0,
        time_finished TEXT,
        FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
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

def check_and_expire_quizzes():
    """Automatically deactivates timed quizzes whose duration has elapsed."""
    import datetime
    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id, duration_minutes, started_at FROM quiz WHERE is_active = 1 AND duration_minutes > 0 AND started_at IS NOT NULL")
    active_quizzes = cursor.fetchall()

    now = datetime.datetime.now()
    for q in active_quizzes:
        try:
            started = datetime.datetime.fromisoformat(q["started_at"])
            duration = int(q["duration_minutes"])
            expiry = started + datetime.timedelta(minutes=duration)
            if now >= expiry:
                cursor.execute("UPDATE quiz SET is_active = 0 WHERE id = ?", (q["id"],))
        except Exception:
            pass

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

def generate_unique_pin():
    """Generates a random 5-digit PIN that isn't already assigned to a quiz."""
    conn = sqlite3.connect("quizdb.db")
    cursor = conn.cursor()
    while True:
        pin = str(random.randint(10000, 99999))
        cursor.execute("SELECT id FROM quiz WHERE pin = ?", (pin,))
        if not cursor.fetchone():
            conn.close()
            return pin

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

            return jsonify({"success": True})
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

        conn = sqlite3.connect("quizdb.db")
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()

        if existing_user:
            conn.close()
            return jsonify({"success": False, "message": "Email already exists!"}), 400

        cursor.execute("""
                INSERT INTO users (first_name, middle_name, last_name, email, password, role)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
            (first_name, middle_name, last_name, email, password, role),
        )
        
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

# --- API ENDPOINTS ---

@app.route("/api/quizzes", methods=["GET"])
def api_get_quizzes():
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    check_and_expire_quizzes()

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quiz WHERE professor_email = ? ORDER BY id DESC", (session.get("user_email"),))
    quizzes = cursor.fetchall()

    result = []
    for q in quizzes:
        quiz_id = q["id"]
        cursor.execute("SELECT COUNT(*) as count FROM question WHERE quiz_id = ?", (quiz_id,))
        q_count = cursor.fetchone()["count"]

        pin = q["pin"]
        if not pin:
            pin = generate_unique_pin()
            cursor.execute("UPDATE quiz SET pin = ? WHERE id = ?", (pin, quiz_id))
            conn.commit()

        result.append({
            "id": quiz_id,
            "title": q["title"],
            "description": q["description"],
            "pin": pin,
            "isActive": bool(q["is_active"]),
            "durationMinutes": q["duration_minutes"] or 0,
            "questionCount": q_count
        })

    conn.close()
    return jsonify({"success": True, "quizzes": result})

@app.route("/quizzes", methods=["GET"])
def get_professor_quizzes():
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    professor_email = session.get("user_email")
    
    try:
        conn = sqlite3.connect("quizdb.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM quiz WHERE professor_email = ? ORDER BY id DESC", (professor_email,))
        quizzes = cursor.fetchall()

        quiz_list = []
        for q in quizzes:
            quiz_id = q["id"]
            
            cursor.execute("SELECT COUNT(*) as count FROM submission WHERE quiz_id = ?", (quiz_id,))
            sub_row = cursor.fetchone()
            submitted_count = sub_row["count"] if sub_row else 0

            cursor.execute("SELECT COUNT(*) as count FROM question WHERE quiz_id = ?", (quiz_id,))
            count_row = cursor.fetchone()
            question_count = count_row["count"] if count_row else 0

            quiz_list.append({
                "id": quiz_id,
                "title": q["title"],
                "description": q["description"],
                "questionCount": question_count,
                "submittedCount": submitted_count,
                "isActive": bool(q["is_active"])
            })

        conn.close()
        return jsonify({"success": True, "quizzes": quiz_list})

    except Exception as e:
        print(f"--- DEBUG ERROR in get_professor_quizzes --- {e}")
        return jsonify({"success": False, "message": "Database error while loading results."}), 500

@app.route("/api/quiz/<int:quiz_id>/toggle-active", methods=["POST"])
def toggle_quiz_active(quiz_id):
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json() or {}
    is_active = 1 if data.get("isActive") else 0
    duration_minutes = int(data.get("durationMinutes", 0)) if is_active else 0

    conn = sqlite3.connect("quizdb.db")
    cursor = conn.cursor()

    if is_active:
        import datetime
        started_at = datetime.datetime.now().isoformat()
        cursor.execute(
            "UPDATE quiz SET is_active = 1, duration_minutes = ?, started_at = ? WHERE id = ?",
            (duration_minutes, started_at, quiz_id)
        )
    else:
        cursor.execute(
            "UPDATE quiz SET is_active = 0, duration_minutes = 0, started_at = NULL WHERE id = ?",
            (quiz_id,)
        )

    conn.commit()
    conn.close()

    return jsonify({"success": True})

@app.route("/api/quiz/<int:quiz_id>/details", methods=["GET"])
def get_quiz_details(quiz_id):
    if "user_email" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quiz WHERE id = ?", (quiz_id,))
    quiz = cursor.fetchone()
    if not quiz:
        conn.close()
        return jsonify({"success": False, "message": "Quiz not found"}), 404

    cursor.execute("SELECT * FROM question WHERE quiz_id = ? ORDER BY question_number ASC", (quiz_id,))
    questions = cursor.fetchall()

    question_list = []
    for q in questions:
        q_id = q["id"]
        cursor.execute("SELECT label, text FROM choice WHERE question_id = ? ORDER BY id ASC", (q_id,))
        choices = cursor.fetchall()

        choice_texts = [c["text"] for c in choices]
        
        answer_val = q["correct_answer"]
        if q["type"] == "multiple-choice" and choices:
            answer_index = 0
            for i, c in enumerate(choices):
                if c["label"] == q["correct_answer"]:
                    answer_index = i
                    break
            answer_val = answer_index

        question_list.append({
            "id": q_id,
            "text": q["text"],
            "type": q["type"],
            "choices": choice_texts,
            "answer": answer_val
        })

    conn.close()
    return jsonify({
        "success": True,
        "quiz": {
            "id": quiz["id"],
            "title": quiz["title"],
            "description": quiz["description"],
            "questions": question_list
        }
    })

@app.route("/quizzes/<int:quiz_id>/results", methods=["GET"])
def get_quiz_results(quiz_id):
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    try:
        check_and_expire_quizzes()

        conn = sqlite3.connect("quizdb.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM quiz WHERE id = ?", (quiz_id,))
        quiz = cursor.fetchone()

        if not quiz:
            conn.close()
            return jsonify({"success": False, "message": "Quiz not found."}), 404

        is_active = bool(quiz["is_active"])
        status_str = "active" if is_active else "inactive"

        import datetime
        time_remaining_seconds = -1
        if is_active and quiz["duration_minutes"] and int(quiz["duration_minutes"]) > 0:
            try:
                started = datetime.datetime.fromisoformat(quiz["started_at"])
                duration_secs = int(quiz["duration_minutes"]) * 60
                elapsed = (datetime.datetime.now() - started).total_seconds()
                time_remaining_seconds = max(0, int(duration_secs - elapsed))
            except Exception:
                pass

        cursor.execute("SELECT student_email, student_name, score, total_points, time_taken, time_finished FROM submission WHERE quiz_id = ? ORDER BY id DESC", (quiz_id,))
        submissions = cursor.fetchall()

        results_list = []
        for sub in submissions:
            results_list.append({
                "email": sub["student_email"],
                "name": sub["student_name"],
                "score": sub["score"],
                "total": sub["total_points"],
                "timeTaken": sub["time_taken"] or 0,
                "timeFinished": sub["time_finished"]
            })

        conn.close()

        return jsonify({
            "success": True,
            "quiz": {
                "title": quiz["title"],
                "status": status_str,
                "timeRemainingSeconds": time_remaining_seconds
            },
            "results": results_list
        })

    except Exception as e:
        print(f"--- DEBUG ERROR in get_quiz_results --- {e}")
        return jsonify({"success": False, "message": "Database error while loading results."}), 500

@app.route("/quizzes/<int:quiz_id>/results/<student_email>", methods=["DELETE"])
def allow_student_retake(quiz_id, student_email):
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    try:
        conn = sqlite3.connect("quizdb.db")
        cursor = conn.cursor()

        cursor.execute("DELETE FROM submission WHERE quiz_id = ? AND student_email = ?", (quiz_id, student_email))
        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        print(f"--- DEBUG ERROR in allow_student_retake --- {e}")
        return jsonify({"success": False, "message": "Database error while allowing retake."}), 500

@app.route("/quizzes/<int:quiz_id>", methods=["GET", "PUT", "DELETE"])
def handle_quiz(quiz_id):
    if "role" not in session or session["role"] != "professor":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    try:
        conn = sqlite3.connect("quizdb.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")

        cursor.execute("SELECT * FROM quiz WHERE id = ?", (quiz_id,))
        quiz = cursor.fetchone()
        if not quiz:
            conn.close()
            return jsonify({"success": False, "message": "Quiz not found."}), 404

        if request.method == "GET":
            quiz_data = {
                "id": quiz["id"],
                "title": quiz["title"],
                "description": quiz["description"] or "",
                "questions": []
            }

            cursor.execute("SELECT * FROM question WHERE quiz_id = ? ORDER BY question_number", (quiz_id,))
            questions = cursor.fetchall()

            for quest in questions:
                q_type = quest["type"]
                if q_type == "multiple-choice":
                    q_type = "multiple_choice"

                q_dict = {
                    "type": q_type,
                    "text": quest["text"],
                    "correctAnswer": quest["correct_answer"]
                }

                if q_type == "multiple_choice":
                    cursor.execute("SELECT label, text FROM choice WHERE question_id = ?", (quest["id"],))
                    choices = cursor.fetchall()
                    q_dict["choices"] = {c["label"]: c["text"] for c in choices}

                quiz_data["questions"].append(q_dict)

            conn.close()
            return jsonify({"success": True, "quiz": quiz_data})

        elif request.method == "DELETE":
            cursor.execute("DELETE FROM quiz WHERE id = ?", (quiz_id,))
            conn.commit()
            conn.close()
            return jsonify({"success": True})

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

            cursor.execute(
                "UPDATE quiz SET title = ?, description = ? WHERE id = ?",
                (title, description, quiz_id)
            )

            cursor.execute("DELETE FROM question WHERE quiz_id = ?", (quiz_id,))

            for idx, q in enumerate(questions, start=1):
                q_type = q.get("type")
                if q_type == "multiple_choice":
                    q_type = "multiple-choice"

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

                if q_type == "multiple-choice":
                    choices = q.get("choices", {})
                    if isinstance(choices, dict):
                        for label, text in choices.items():
                            cursor.execute("INSERT INTO choice (question_id, label, text) VALUES (?, ?, ?)", (question_id, label, text))
                    elif isinstance(choices, list):
                        for choice in choices:
                            cursor.execute("INSERT INTO choice (question_id, label, text) VALUES (?, ?, ?)", (question_id, choice.get("label"), choice.get("text")))

            conn.commit()
            conn.close()
            return jsonify({"success": True})

    except Exception as e:
        print(f"--- DEBUG ERROR in handle_quiz --- {e}")
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

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

            pin = generate_unique_pin()
            cursor.execute(
                """
                INSERT INTO quiz (title, description, professor_email, pin, is_active)
                VALUES (?, ?, ?, ?, 0)
                """,
                (title, description, professor_email, pin)
            )
            quiz_id = cursor.lastrowid

            for q in questions:
                q_number = q.get("number")
                q_text = q.get("text", "").strip()
                q_type = q.get("type", "")
                correct_answer = q.get("correctAnswer", "").strip()

                cursor.execute(
                    """
                    INSERT INTO question (quiz_id, question_number, text, type, correct_answer)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (quiz_id, q_number, q_text, q_type, correct_answer)
                )
                question_id = cursor.lastrowid

                if q_type == "multiple-choice":
                    choices = q.get("choices", [])
                    for choice in choices:
                        if isinstance(choice, dict):
                            choice_label = choice.get("label", "")
                            choice_text = choice.get("text", "").strip()
                        else:
                            continue

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
            return jsonify({"success": False, "message": f"Database error while saving quiz: {str(e)}"}), 500

    return render_template("create-quiz.html")

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

@app.route("/take-quiz/verify-pin", methods=["POST"])
def verify_quiz_pin():
    if "role" not in session or session["role"] != "student":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    check_and_expire_quizzes()

    data = request.get_json() or {}
    pin = data.get("pin", "").strip()
    student_email = session.get("user_email")

    if not pin:
        return jsonify({"success": False, "message": "PIN is required."}), 400

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quiz WHERE pin = ?", (pin,))
    quiz = cursor.fetchone()

    if not quiz:
        conn.close()
        return jsonify({"success": False, "message": "Invalid PIN. Quiz not found."}), 400

    if not quiz["is_active"]:
        conn.close()
        return jsonify({"success": False, "message": "This quiz is currently inactive or has expired."}), 400

    quiz_id = quiz["id"]
    cursor.execute("SELECT id FROM submission WHERE quiz_id = ? AND student_email = ?", (quiz_id, student_email))
    existing_submission = cursor.fetchone()
    conn.close()

    if existing_submission:
        return jsonify({
            "success": False, 
            "message": "You have already completed this quiz. Please ask your professor for a retake test."
        }), 400

    return jsonify({"success": True})

@app.route("/take-quiz/load", methods=["POST"])
def load_take_quiz():
    if "role" not in session or session["role"] != "student":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    check_and_expire_quizzes()

    data = request.get_json() or {}
    pin = data.get("pin", "").strip()

    if not pin:
        return jsonify({"success": False, "message": "PIN is required."}), 400

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quiz WHERE pin = ?", (pin,))
    quiz = cursor.fetchone()

    if not quiz:
        conn.close()
        return jsonify({"success": False, "message": "Quiz not found."}), 404

    if not quiz["is_active"]:
        conn.close()
        return jsonify({"success": False, "message": "This quiz is currently inactive or has expired."}), 403

    import datetime
    time_remaining_seconds = -1
    if quiz["duration_minutes"] and quiz["started_at"]:
        try:
            started = datetime.datetime.fromisoformat(quiz["started_at"])
            duration_secs = int(quiz["duration_minutes"]) * 60
            elapsed = (datetime.datetime.now() - started).total_seconds()
            time_remaining_seconds = max(0, int(duration_secs - elapsed))
            if time_remaining_seconds <= 0:
                cursor.execute("UPDATE quiz SET is_active = 0 WHERE id = ?", (quiz["id"],))
                conn.commit()
                conn.close()
                return jsonify({"success": False, "message": "This timed quiz has expired."}), 403
        except Exception:
            pass

    quiz_id = quiz["id"]
    cursor.execute("SELECT * FROM question WHERE quiz_id = ? ORDER BY question_number ASC", (quiz_id,))
    questions = cursor.fetchall()

    question_list = []
    for q in questions:
        q_id = q["id"]
        q_type = q["type"]
        if q_type == "multiple_choice":
            q_type = "multiple-choice"

        q_dict = {
            "text": q["text"],
            "type": q_type
        }

        if q_type == "multiple-choice":
            cursor.execute("SELECT label, text FROM choice WHERE question_id = ? ORDER BY id ASC", (q_id,))
            choices = cursor.fetchall()
            q_dict["choices"] = [{"label": c["label"], "text": c["text"]} for c in choices]
        else:
            q_dict["choices"] = []

        question_list.append(q_dict)

    conn.close()
    return jsonify({
        "success": True,
        "quiz": {
            "title": quiz["title"],
            "description": quiz["description"] or "",
            "timeRemainingSeconds": time_remaining_seconds,
            "questions": question_list
        }
    })

@app.route("/take-quiz/submit", methods=["POST"])
def submit_take_quiz():
    if "role" not in session or session["role"] != "student":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json() or {}
    pin = data.get("pin", "").strip()
    answers = data.get("answers", [])
    time_taken = int(data.get("timeTaken", 0))
    student_email = session.get("user_email")

    if not pin:
        return jsonify({"success": False, "message": "PIN is required."}), 400

    conn = sqlite3.connect("quizdb.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, is_active FROM quiz WHERE pin = ?", (pin,))
    quiz = cursor.fetchone()

    if not quiz:
        conn.close()
        return jsonify({"success": False, "message": "Quiz not found."}), 404

    if not quiz["is_active"]:
        conn.close()
        return jsonify({"success": False, "message": "This quiz is no longer active."}), 403

    quiz_id = quiz["id"]

    cursor.execute("SELECT first_name, last_name FROM users WHERE email = ?", (student_email,))
    user = cursor.fetchone()
    student_name = f"{user['first_name']} {user['last_name']}" if user else student_email

    cursor.execute("SELECT id, correct_answer, type FROM question WHERE quiz_id = ? ORDER BY question_number ASC", (quiz_id,))
    questions = cursor.fetchall()
    
    score = 0
    total_points = len(questions)

    answer_map = {item.get("number"): str(item.get("answer", "")).strip().lower() for item in answers}

    for idx, q in enumerate(questions, start=1):
        correct = str(q["correct_answer"] or "").strip().lower()
        student_ans = answer_map.get(idx, "")

        if student_ans == correct and student_ans != "":
            score += 1

    import datetime
    time_finished = datetime.datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO submission (quiz_id, student_email, student_name, score, total_points, time_taken, time_finished)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (quiz_id, student_email, student_name, score, total_points, time_taken, time_finished))

    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/student/results", methods=["GET"])
def get_student_results():
    if "role" not in session or session["role"] != "student":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    student_email = session.get("user_email")

    try:
        conn = sqlite3.connect("quizdb.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT s.id, s.quiz_id, q.title as quizTitle, s.score, s.total_points as totalQuestions, 
                   s.time_taken as timeTaken, s.time_finished as submittedAt
            FROM submission s
            JOIN quiz q ON s.quiz_id = q.id
            WHERE s.student_email = ?
            ORDER BY s.id DESC
        """, (student_email,))
        
        rows = cursor.fetchall()
        results = []
        for row in rows:
            results.append({
                "id": row["id"],
                "quizTitle": row["quizTitle"],
                "score": row["score"],
                "totalQuestions": row["totalQuestions"],
                "timeTaken": row["timeTaken"],
                "submittedAt": row["submittedAt"]
            })

        conn.close()
        return jsonify(results)

    except Exception as e:
        print(f"--- DEBUG ERROR in get_student_results --- {e}")
        return jsonify({"success": False, "message": "Database error."}), 500

@app.route("/api/student/results/<int:result_id>", methods=["DELETE"])
def delete_student_result(result_id):
    if "role" not in session or session["role"] != "student":
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    student_email = session.get("user_email")

    try:
        conn = sqlite3.connect("quizdb.db")
        cursor = conn.cursor()

        cursor.execute("DELETE FROM submission WHERE id = ? AND student_email = ?", (result_id, student_email))
        conn.commit()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print(f"--- DEBUG ERROR in delete_student_result --- {e}")
        return jsonify({"success": False, "message": "Database error while deleting."}), 500

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)