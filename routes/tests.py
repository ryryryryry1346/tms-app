from flask import Blueprint, request, redirect, render_template, jsonify
from db import get_conn

test_bp = Blueprint("tests", __name__)

@test_bp.route("/create_test", methods=["GET","POST"])
def create_test():
    conn = get_conn()
    c = conn.cursor()

    if request.method == "POST":
        c.execute("""
        INSERT INTO tests(title,steps,expected,status,section_id,project_id)
        VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            request.form["title"],
            request.form["steps"],
            request.form["expected"],
            request.form["status"],
            request.form["section_id"],
            request.form["project_id"]
        ))

        conn.commit()
        conn.close()
        return redirect("/")

    c.execute("SELECT * FROM sections")
    sections = c.fetchall()

    conn.close()
    return render_template("create_test.html", sections=sections)


@test_bp.route("/test/<int:id>")
def test_page(id):
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT * FROM tests WHERE id=%s", (id,))
    t = c.fetchone()

    conn.close()

    return render_template("test.html", t=t)


@test_bp.route("/set_status", methods=["POST"])
def set_status():
    data = request.json

    conn = get_conn()
    c = conn.cursor()

    c.execute("UPDATE tests SET status=%s WHERE id=%s",
              (data["status"], data["id"]))

    conn.commit()
    conn.close()

    return jsonify({"ok": True})