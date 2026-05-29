import os
import sqlite3
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Connection configuration
IS_POSTGRES = False
pg_pool = None
sqlite_path = "fraud_detection.db"

# Check if NeonDB/Postgres is configured and not placeholder
is_pg_configured = (
    DATABASE_URL.startswith("postgres") and
    "YOUR_PASSWORD" not in DATABASE_URL and
    "YOUR-HOST" not in DATABASE_URL
)

if is_pg_configured:
    try:
        # Create a connection pool for Postgres
        pg_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20, dsn=DATABASE_URL
        )
        IS_POSTGRES = True
        print("[DATABASE] Connected successfully to NeonDB PostgreSQL pool.")
    except Exception as e:
        print(f"[DATABASE] NeonDB PostgreSQL connection failed: {e}. Falling back to SQLite.")
        IS_POSTGRES = False
else:
    print("[DATABASE] NeonDB PostgreSQL not configured or placeholder detected. Using SQLite fallback.")
    IS_POSTGRES = False


def get_connection():
    """
    Returns a database connection and a boolean indicating if it is Postgres.
    """
    if IS_POSTGRES and pg_pool:
        return pg_pool.getconn(), True
    else:
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn, False


def release_connection(conn):
    """
    Releases a connection back to the pool or closes it.
    """
    if IS_POSTGRES and pg_pool:
        pg_pool.putconn(conn)
    else:
        conn.close()


def execute_write(query: str, params: tuple = None) -> int:
    """
    Executes an INSERT, UPDATE, or DELETE query and returns the affected row count or last inserted ID.
    """
    conn, is_pg = get_connection()
    try:
        cursor = conn.cursor()
        # Translate dialect if falling back to SQLite
        if not is_pg:
            query = query.replace("%s", "?")
            query = query.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
            query = query.replace("DOUBLE PRECISION", "REAL")
            # SQLite does not support returning clause in simple executions
            if "RETURNING" in query.upper():
                query = query.split("RETURNING")[0].strip()
        
        cursor.execute(query, params or ())
        
        last_id = None
        if not is_pg:
            last_id = cursor.lastrowid
        else:
            try:
                # If RETURNING was used, get it
                if "RETURNING" in query.upper():
                    last_id = cursor.fetchone()[0]
            except Exception:
                pass
                
        conn.commit()
        cursor.close()
        return last_id or 1
    except Exception as e:
        conn.rollback()
        print(f"[DATABASE ERROR] Write query failed: {e}")
        raise e
    finally:
        release_connection(conn)


def execute_read(query: str, params: tuple = None) -> list:
    """
    Executes a SELECT query and returns the rows as a list of dicts.
    """
    conn, is_pg = get_connection()
    try:
        cursor = conn.cursor()
        if not is_pg:
            query = query.replace("%s", "?")
            
        cursor.execute(query, params or ())
        
        if is_pg:
            # Postgres cursors don't return dictionary by default unless RealDictCursor is used.
            # We map columns manually for standard behavior.
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            results = [dict(zip(columns, row)) for row in rows]
        else:
            rows = cursor.fetchall()
            results = [dict(row) for row in rows]
            
        cursor.close()
        return results
    except Exception as e:
        print(f"[DATABASE ERROR] Read query failed: {e}")
        raise e
    finally:
        release_connection(conn)


def init_db():
    """
    Initializes database tables on startup if they don't exist.
    """
    print("[DATABASE] Running database schema migrations...")
    
    # Transactions Table
    if IS_POSTGRES:
        create_transactions_table = """
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            amount DOUBLE PRECISION,
            features TEXT,
            fraud_probability DOUBLE PRECISION,
            prediction VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Pending Review',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL
        );
        """
        create_audit_logs_table = """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            transaction_id INTEGER,
            action TEXT,
            actor VARCHAR(100) DEFAULT 'System',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        create_batch_jobs_table = """
        CREATE TABLE IF NOT EXISTS batch_jobs (
            task_id VARCHAR(100) PRIMARY KEY,
            status VARCHAR(50),
            total_records INTEGER DEFAULT 0,
            processed_records INTEGER DEFAULT 0,
            progress_percent INTEGER DEFAULT 0,
            results_file TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    else:
        # SQLite dialect
        create_transactions_table = """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL,
            features TEXT,
            fraud_probability REAL,
            prediction TEXT,
            status TEXT DEFAULT 'Pending Review',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL
        );
        """
        create_audit_logs_table = """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER,
            action TEXT,
            actor TEXT DEFAULT 'System',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        create_batch_jobs_table = """
        CREATE TABLE IF NOT EXISTS batch_jobs (
            task_id TEXT PRIMARY KEY,
            status TEXT,
            total_records INTEGER DEFAULT 0,
            processed_records INTEGER DEFAULT 0,
            progress_percent INTEGER DEFAULT 0,
            results_file TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """

    conn, is_pg = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(create_transactions_table)
        cursor.execute(create_audit_logs_table)
        cursor.execute(create_batch_jobs_table)
        conn.commit()
        cursor.close()
        print("[DATABASE] Database tables initialized successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[DATABASE ERROR] Failed to initialize database: {e}")
        raise e
    finally:
        release_connection(conn)
