from flask import Flask, request, redirect, session, render_template, jsonify
import os
import psycopg2
import cloudinary
import cloudinary.uploader
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

cloudinary.config(secure=True)


def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS sections(
        id SERIAL PRIMARY KEY,
        name TEXT
    )
    """)

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

    # дефолт секции
    c.execute("SELECT COUNT(*) FROM sections")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Auth",))
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Profile",))
        c.execute("INSERT INTO sections (name) VALUES (%s)", ("Payments",))

    conn.commit()
    conn.close()


def is_logged_in():
    return "user_id" in session


# ---------- AUTH ----------
@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()

        c.execute("SELECT * FROM users WHERE username=%s",
                  (request.form["username"],))
        user = c.fetchone()

        conn.close()

        if user and check_password_hash(user[2], request.form["password"]):
            session["user_id"] = user[0]
            return redirect("/")

    return render_template("login.html")


@app.route("/register", methods=["GET","POST"])
def register():
    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()

        try:
            c.execute("INSERT INTO users(username,password) VALUES (%s,%s)",
                      (request.form["username"],
                       generate_password_hash(request.form["password"])))
            conn.commit()
        except:
            pass

        conn.close()
        return redirect("/login")

    return render_template("register.html")


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

    c.execute("SELECT * FROM tests ORDER BY id DESC")
    tests = c.fetchall()

    conn.close()

    return render_template("dashboard.html",
                           sections=sections,
                           tests=tests)


# ---------- TEST PAGE ----------
@app.route("/test/<int:id>")
def test_page(id):
    if not is_logged_in():
        return redirect("/login")

    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT * FROM tests WHERE id=%s", (id,))
    test = c.fetchone()

    conn.close()

    return render_template("test.html", t=test)


# ---------- CREATE ----------
@app.route("/create", methods=["GET","POST"])
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
            "user"
        ))

        conn.commit()
        conn.close()
        return redirect("/")

    c.execute("SELECT * FROM sections")
    sections = c.fetchall()
    conn.close()

    return render_template("create.html", sections=sections)


# ---------- STATUS ----------
@app.route("/set_status", methods=["POST"])
def set_status():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("UPDATE tests SET status=%s WHERE id=%s",
              (data["status"], data["id"]))

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