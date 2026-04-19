from flask import Flask, request, redirect, session, render_template, jsonify
import sqlite3
import cloudinary
import cloudinary.uploader
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

DB = "tms.db"

cloudinary.config(secure=True)


def get_conn():
    return sqlite3.connect(DB)


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS sections(
        id INTEGER PRIMARY KEY,
        name TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS tests(
        id INTEGER PRIMARY KEY,
        title TEXT,
        steps TEXT,
        expected TEXT,
        status TEXT,
        section_id INTEGER,
        author TEXT
    )
    """)

    if c.execute("SELECT COUNT(*) FROM sections").fetchone()[0] == 0:
        c.execute("INSERT INTO sections (name) VALUES ('Auth')")
        c.execute("INSERT INTO sections (name) VALUES ('Profile')")
        c.execute("INSERT INTO sections (name) VALUES ('Payments')")

    conn.commit()
    conn.close()


def is_logged_in():
    return "user_id" in session


# ---------- AUTH ----------
@app.route("/register", methods=["GET","POST"])
def register():
    error = None
    if request.method == "POST":
        try:
            conn = get_conn()
            c = conn.cursor()
            c.execute(
                "INSERT INTO users(username,password) VALUES (?,?)",
                (request.form["username"], generate_password_hash(request.form["password"]))
            )
            conn.commit()
            conn.close()
            return redirect("/login")
        except:
            error = "User exists"
    return render_template("register.html", error=error)


@app.route("/login", methods=["GET","POST"])
def login():
    error = None
    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()
        user = c.execute(
            "SELECT * FROM users WHERE username=?",
            (request.form["username"],)
        ).fetchone()
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

    sections = c.execute("SELECT * FROM sections").fetchall()
    tests = c.execute("SELECT * FROM tests").fetchall()

    conn.close()

    return render_template("dashboard.html", sections=sections, tests=tests)


# ---------- UPDATE SECTION (drag drop) ----------
@app.route("/move_test", methods=["POST"])
def move_test():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("UPDATE tests SET section_id=? WHERE id=?", (
        data["section_id"],
        data["id"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"ok": True})


# ---------- UPDATE INLINE ----------
@app.route("/update_test", methods=["POST"])
def update_test():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    UPDATE tests SET title=?, steps=?, expected=?, status=?
    WHERE id=?
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


# ---------- UPLOAD ----------
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if file:
        result = cloudinary.uploader.upload(file)
        return jsonify({"url": result["secure_url"]})
    return jsonify({"error": "no file"}), 400


init_db()