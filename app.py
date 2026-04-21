from flask import Flask, request, redirect, session, render_template, jsonify
import os
import psycopg2
import cloudinary
import cloudinary.uploader
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

# Cloudinary
cloudinary.config(secure=True)


# ---------- DB ----------
def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def init_db():
    conn = get_conn()
    c = conn.cursor()

    # USERS
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    # SECTIONS
    c.execute("""
    CREATE TABLE IF NOT EXISTS sections(
        id SERIAL PRIMARY KEY,
        name TEXT
    )
    """)

    # TESTS
    c.execute("""
    CREATE TABLE IF NOT EXISTS tests(
        id SERIAL PRIMARY KEY,
        title TEXT,
        steps TEXT,
        expected TEXT,
        status TEXT,
        section_id INTEGER,
        author TEXT
    )
    """)

    # TEST RUNS
    c.execute("""
    CREATE TABLE IF NOT EXISTS test_runs(
        id SERIAL PRIMARY KEY,
        test_id INTEGER,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # DEFAULT SECTIONS
    c.execute("SELECT COUNT(*) FROM sections")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Auth",))
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Profile",))
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Payments",))

    conn.commit()
    conn.close()


# ---------- AUTH ----------
def is_logged_in():
    return "user_id" in session


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None

    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()

        try:
            c.execute(
                "INSERT INTO users(username,password) VALUES (%s,%s)",
                (request.form["username"], generate_password_hash(request.form["password"]))
            )
            conn.commit()
        except:
            error = "User already exists"

        conn.close()

        if not error:
            return redirect("/login")

    return render_template("register.html", error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()

        c.execute(
            "SELECT * FROM users WHERE username=%s",
            (request.form["username"],)
        )
        user = c.fetchone()

        conn.close()

        if user and check_password_hash(user[2], request.form["password"]):
            session["user_id"] = user[0]
            session["username"] = user[1]
            return redirect("/")

        error = "Invalid credentials"

    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# ---------- DASHBOARD ----------
@app.route("/")
def index():
    if not is_logged_in():
        return redirect("/login")

    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT * FROM sections")
    sections = c.fetchall()

    c.execute("SELECT * FROM tests")
    tests = c.fetchall()

    c.execute("SELECT * FROM test_runs ORDER BY created_at DESC")
    runs = c.fetchall()

    conn.close()

    return render_template("dashboard.html", sections=sections, tests=tests, runs=runs)


# ---------- CREATE ----------
@app.route("/create", methods=["GET", "POST"])
def create():
    if not is_logged_in():
        return redirect("/login")

    conn = get_conn()
    c = conn.cursor()

    if request.method == "POST":
        c.execute("""
        INSERT INTO tests(title,steps,expected,status,section_id,author)
        VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            request.form["title"],
            request.form["steps"],
            request.form["expected"],
            request.form["status"],
            request.form["section_id"],
            session["username"]
        ))

        conn.commit()
        conn.close()

        return redirect("/")

    c.execute("SELECT * FROM sections")
    sections = c.fetchall()

    conn.close()

    return render_template("create.html", sections=sections)


# ---------- UPDATE ----------
@app.route("/update_test", methods=["POST"])
def update_test():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    UPDATE tests
    SET title=%s, steps=%s, expected=%s, status=%s
    WHERE id=%s
    """, (
        data["title"],
        data["steps"],
        data["expected"],
        data["status"],
        data["id"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"ok": True})


# ---------- MOVE ----------
@app.route("/move_test", methods=["POST"])
def move_test():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute(
        "UPDATE tests SET section_id=%s WHERE id=%s",
        (data["section_id"], data["id"])
    )

    conn.commit()
    conn.close()

    return jsonify({"ok": True})


# ---------- RUN TEST ----------
@app.route("/run_test", methods=["POST"])
def run_test():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    INSERT INTO test_runs(test_id,status)
    VALUES (%s,%s)
    """, (
        data["test_id"],
        data["status"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"ok": True})


# ---------- UPLOAD ----------
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")

    if file:
        result = cloudinary.uploader.upload(file)
        return jsonify({"url": result["secure_url"]})

    return jsonify({"error": "no file"}), 400


# ---------- INIT ----------
init_db()


if __name__ == "__main__":
    app.run(debug=True)