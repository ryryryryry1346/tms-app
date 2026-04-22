from db import get_conn

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS projects(
        id SERIAL PRIMARY KEY,
        name TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS sections(
        id SERIAL PRIMARY KEY,
        name TEXT,
        project_id INTEGER
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
        project_id INTEGER
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS test_runs(
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        name TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS test_run_items(
        id SERIAL PRIMARY KEY,
        run_id INTEGER,
        test_id INTEGER,
        status TEXT
    )
    """)

    conn.commit()
    conn.close()