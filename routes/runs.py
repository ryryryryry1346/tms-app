from flask import Blueprint, request, render_template, redirect
from db import get_conn

run_bp = Blueprint("runs", __name__)

@run_bp.route("/create_run", methods=["POST"])
def create_run():
    conn = get_conn()
    c = conn.cursor()

    c.execute("INSERT INTO test_runs(project_id,name) VALUES (%s,%s)",
              (request.form["project_id"], request.form["name"]))

    conn.commit()
    conn.close()

    return redirect("/")


@run_bp.route("/run/<int:run_id>")
def run_page(run_id):
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    SELECT t.id, t.title
    FROM tests t
    JOIN test_runs r ON t.project_id=r.project_id
    WHERE r.id=%s
    """, (run_id,))

    tests = c.fetchall()

    conn.close()

    return render_template("run.html", tests=tests, run_id=run_id)