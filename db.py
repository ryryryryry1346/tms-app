import psycopg2, os

def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))