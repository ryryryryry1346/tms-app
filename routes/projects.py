from flask import Blueprint, render_template, request, redirect
from db import get_conn

project_bp = Blueprint("projects", __name__)

@project_bp.route("/")
def dashboard():
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT * FROM projects")
    projects = c.fetchall()

    project_id = request.args.get("project")

    if project_id:
        c.execute("SELECT * FROM sections WHERE project_id=%s", (project_id,))
        sections = c.fetchall()

        c.execute("SELECT * FROM tests WHERE project_id=%s", (project_id,))
        tests = c.fetchall()
    else:
        sections = []
        tests = []

    conn.close()

    return render_template("dashboard.html",
                           projects=projects,
                           sections=sections,
                           tests=tests,
                           project_id=project_id)


@project_bp.route("/create_project", methods=["GET","POST"])
def create_project():
    if request.method == "POST":
        conn = get_conn()
        c = conn.cursor()

        c.execute("INSERT INTO projects(name) VALUES (%s)",
                  (request.form["name"],))

        conn.commit()
        conn.close()

        return redirect("/")

    return render_template("create_project.html")