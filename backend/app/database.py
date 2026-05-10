"""
SQLite persistence layer for user-created data.
Stores local_users and local_businesses created via the API.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "lantern.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS local_users (
                username    TEXT PRIMARY KEY,
                password    TEXT NOT NULL,
                name        TEXT NOT NULL,
                user_id     TEXT UNIQUE NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id        TEXT PRIMARY KEY,
                coldstart_json TEXT NOT NULL,
                updated_at     TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS local_businesses (
                business_id TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category    TEXT NOT NULL,
                city        TEXT NOT NULL,
                neighborhood TEXT NOT NULL,
                address     TEXT NOT NULL,
                rating      REAL NOT NULL DEFAULT 0.0,
                price_range INTEGER NOT NULL DEFAULT 2,
                lat         REAL NOT NULL DEFAULT 39.9526,
                lng         REAL NOT NULL DEFAULT -75.1652,
                created_by  TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                user_id     TEXT NOT NULL,
                business_id TEXT NOT NULL,
                stars       INTEGER NOT NULL,
                text        TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL,
                PRIMARY KEY (user_id, business_id)
            )
        """)
        conn.commit()
