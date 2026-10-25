from flask import Flask, render_template, redirect, url_for, request, jsonify
import sqlite3

app = Flask(__name__)

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



@app.route("/")
def home():
    return redirect(url_for("login_page"))

@app.route("/login", methods = ["GET", "POST"])
def login_page():

    if request.method == "POST":
        name = request.form["email"]
        return redirect(url_for("dashboard", name = "testing"))
    else:
        return render_template("login.html")

@app.route("/signup", methods = ["GET", "POST"])
def signup_page():

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

@app.route("/dashboard")
def dashboard():

    return render_template("professor_dashboard.html", name = "Guest")

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
            f"<li><strong>{user[1]} {user[2]}</strong> — {user[3]} ({user[4]}) password = {user[5]}</li> "
        )
    html += "</ul><br><a href='/login'>Go to Login</a> </ul><br><a href='/signup'>Go to Signup</a>"

    return html

if __name__ == "__main__":
    init_db()
    app.run(debug=True)