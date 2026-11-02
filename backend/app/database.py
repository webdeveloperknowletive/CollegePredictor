
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load the .env file from the backend folder explicitly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE, override=False)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        f"DATABASE_URL is missing. Check this file: {ENV_FILE}"
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)



def check_database_connection():
    try:
        with engine.connect() as connection:
            return connection.execute(
                text("SELECT current_database()")
            ).scalar_one()
    except Exception as exc:
        print(
            f"Database connection error: "
            f"{type(exc).__name__}: {exc}",
            flush=True,
        )
        raise
