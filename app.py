from flask import Flask, request, redirect, session, render_template
import sqlite3
import cloudinary
import cloudinary.uploader
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

DB = "tms.db"

# Cloudinary (использует CLOUDINARY_URL из Render)
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

    # tests
    c.execute("""
    CREATE TABLE IF NOT EXISTS tests(
        id INTEGER PRIMARY KEY,
        title TEXT,
        steps TEXT,
        expected TEXT
    )
    """)

    def add(sql):
        try:
            c.execute(sql)
        except:
            pass

    add("ALTER TABLE tests ADD COLUMN status TEXT DEFAULT 'Failed'")
    add("ALTER TABLE tests ADD COLUMN priority TEXT DEFAULT 'Medium'")
    add("ALTER TABLE tests ADD COLUMN author TEXT")

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
            c.execute(
                "INSERT INTO users(username,password) VALUES (?,?)",
                (username, password)
            )
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
        user = c.execute(
            "SELECT * FROM users WHERE username=?",
            (username,)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user[2], password):
            session["user_id"] = user[0]
            session["username"] = user[1]
            return redirect("/")

        error = "Invalid username or password"

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

    status_filter = request.args.get("status")

    conn = get_conn()
    c = conn.cursor()

    if status_filter:
        tests = c.execute(
            "SELECT * FROM tests WHERE status=?",
            (status_filter,)
        ).fetchall()
    else:
        tests = c.execute("SELECT * FROM tests").fetchall()

    conn.close()

    return render_template("dashboard.html", tests=tests)


# ---------- CREATE ----------
@app.route("/create", methods=["GET","POST"])
def create():
    if not is_logged_in():
        return redirect("/login")

    if request.method == "POST":
        data = request.form

        steps = data["steps"]  # уже HTML из редактора

        conn = get_conn()
        c = conn.cursor()

        c.execute("""
        INSERT INTO tests(title,steps,expected,status,priority,author)
        VALUES (?,?,?,?,?,?)
        """, (
            data["title"],
            steps,
            data["expected"],
            data["status"],
            data["priority"],
            session["username"]
        ))

        conn.commit()
        conn.close()

        return redirect("/")

    return render_template("create.html")


# ---------- INIT ----------
init_db()