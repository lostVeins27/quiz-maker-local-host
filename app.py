from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3

app = Flask(__name__)
app.secret_key = "akdfjhkcjvhzxchjviaushdfjasdfhaskdfhkashkixchvh"

DB = "quizdb.db"

def init_db():
    """Automatically creates the database table and test user if they don't exist"""
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    
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
    
    # Check if test user already exists, if not, insert them
    cursor.execute("SELECT * FROM users WHERE email = ?", ('email@example.com',))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (first_name, middle_name, last_name, email, password, role)
        VALUES ('John', 'M', 'Doe', 'email@example.com', 'passwordtesting', 'Student')
        """)
        print("Test user inserted successfully!")
        
    conn.commit()
    conn.close()

# Run table creation when app boots up
init_db()

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_by_email(email):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    return user

@app.route("/")
def login_page():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("dashboard.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify(success=False, message="Invalid request data"), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = get_user_by_email(email)

    if user and user["password"] == password:
        session["user_id"] = user["id"]
        return jsonify(success=True, redirect=url_for("dashboard"))

    return jsonify(success=False, message="Invalid email or password"), 401

if __name__ == "__main__":
    app.run(debug=True)