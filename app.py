from flask import Flask, request, redirect, session, render_template, jsonify
import sqlite3
import cloudinary
import cloudinary.uploader
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

DB = "tms.db"

# Cloudinary
cloudinary.config(secure=True)


# ---------- DB ----------
def get_conn():
    return sqlite3.connect(DB)


def init_db():
    conn = get_conn()
    c = conn.cursor()

    # users
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    # sections
    c.execute("""
    CREATE TABLE IF NOT EXISTS sections(
        id INTEGER PRIMARY KEY,
        name TEXT
    )
    """)

    # tests
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

    # default sections
    if c.execute("SELECT COUNT(*) FROM sections").fetchone()[0] == 0:
        c.execute("INSERT INTO sections (name) VALUES ('Auth')")
        c.execute("INSERT INTO sections (name) VALUES ('Profile')")
        c.execute("INSERT INTO sections (name) VALUES ('Payments')")

    conn.commit()
    conn.close()


# ---------- AUTH ----------
def is_logged_in():
    return "user_id" in session


# ---------- REGISTER ----------
@app.route("/register", methods=["GET","POST"])
def register():
    error = None

    if request.method == "POST":
        username = request.form["username"]
        password = generate_password_hash(request.form["password"])

        conn = get_conn()
        c = conn.cursor()

        try:
            c.execute("INSERT INTO users(username,password) VALUES (?,?)", (username, password))
            conn.commit()
        except:
            error = "User already exists"

        conn.close()

        if not error:
            return redirect("/login")

    return render_template("register.html", error=error)


# ---------- LOGIN ----------
@app.route("/login", methods=["GET","POST"])
def login():
    error = None

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = get_conn()
        c = conn.cursor()
        user = c.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        conn.close()

        if user and check_password_hash(user[2], password):
            session["user_id"] = user[0]
            session["username"] = user[1]
            return redirect("/")

        error = "Invalid credentials"

    return render_template("login.html", error=error)


# ---------- LOGOUT ----------
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


# ---------- CREATE ----------
@app.route("/create", methods=["GET","POST"])
def create():
    if not is_logged_in():
        return redirect("/login")

    conn = get_conn()
    c = conn.cursor()

    if request.method == "POST":
        data = request.form

        c.execute("""
        INSERT INTO tests(title,steps,expected,status,section_id,author)
        VALUES (?,?,?,?,?,?)
        """, (
            data["title"],
            data["steps"],
            data["expected"],
            data["status"],
            data["section_id"],
            session["username"]
        ))

        conn.commit()
        conn.close()

        return redirect("/")

    sections = c.execute("SELECT * FROM sections").fetchall()
    conn.close()

    return render_template("create.html", sections=sections)


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