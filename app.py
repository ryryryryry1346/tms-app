from flask import Flask, request, redirect, session, render_template, send_from_directory
import sqlite3, os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "secret123"

DB = "tms.db"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png","jpg","jpeg","gif","mp4"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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
        try: c.execute(sql)
        except: pass

    add("ALTER TABLE tests ADD COLUMN status TEXT DEFAULT 'Failed'")
    add("ALTER TABLE tests ADD COLUMN priority TEXT DEFAULT 'Medium'")

    conn.commit()
    conn.close()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS


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
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER, filename))

                # вставляем в текст
                steps += f"\nuploads/{filename}"

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


# ---------- FILES ----------
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ---------- RUN ----------
if __name__ == "__main__":
    init_db()