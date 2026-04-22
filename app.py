from flask import Flask
from routes.projects import project_bp
from routes.tests import test_bp
from routes.runs import run_bp
from models import init_db

app = Flask(__name__)
app.secret_key = "secret123"

app.register_blueprint(project_bp)
app.register_blueprint(test_bp)
app.register_blueprint(run_bp)

init_db()

if __name__ == "__main__":
    app.run(debug=True)