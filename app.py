from flask import Flask, request, redirect, session, render_template
import sqlite3, os
import cloudinary
import cloudinary.uploader

app = Flask(__name__)
app.secret_key = "secret123"

DB = "tms.db"

# --- Cloudinary ---
# берёт настройки из CLOUDINARY_URL (ты уже добавил в Render)
cloudinary.config(secure=True)


# ---------- DB ----------
def get_conn():
    return sqlite3.connect(DB)


def init_db():
    conn = get_conn()
    c = conn.cursor()

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

    conn.commit()
    conn.close()


# ---------- AUTH ----------
def is_logged_in():
    return "user" in session


# ---------- LOGIN ----------
@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        session["user"] = request.form["username"]
        return redirect("/")
    return "<form method=post><input name=username><button>Login</button></form>"


# ---------- DASHBOARD ----------
@app.route("/")
def index():
    if not is_logged_in():
        return redirect("/login")

    status_filter = request.args.get("status")

    conn = get_conn()
    c = conn.cursor()

    if status_filter:
        tests = c.execute("SELECT * FROM tests WHERE status=?", (status_filter,)).fetchall()
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
        files = request.files.getlist("files")

        steps = data["steps"]

        for file in files:
            if file and file.filename:
                # загружаем в Cloudinary
                result = cloudinary.uploader.upload(file)
                url = result["secure_url"]

                # добавляем ссылку в steps
                steps += f"\n{url}"

        conn = get_conn()
        c = conn.cursor()

        c.execute("""
        INSERT INTO tests(title,steps,expected,status,priority)
        VALUES (?,?,?,?,?)
        """, (
            data["title"],
            steps,
            data["expected"],
            data["status"],
            data["priority"]
        ))

        conn.commit()
        conn.close()

        return redirect("/")

    return render_template("create.html")


# ---------- INIT DB ДЛЯ RENDER ----------
init_db()