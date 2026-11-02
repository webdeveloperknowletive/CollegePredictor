
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database import check_database_connection, engine


app = FastAPI(
    title="College Predictor API",
    description="Backend API for MHT-CET Engineering College Predictions",
    version="1.1.0",
)


# CORS: allow the local Next.js frontend to use GET and POST endpoints.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Request models
# -------------------------

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=255)
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


# -------------------------
# Password hashing
# -------------------------

def hash_password(password: str) -> str:
    """Hash passwords using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    iterations = 600_000

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )

    return (
        f"pbkdf2_sha256${iterations}$"
        f"{base64.b64encode(salt).decode()}$"
        f"{base64.b64encode(digest).decode()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = stored_hash.split("$")

        if algorithm != "pbkdf2_sha256":
            return False

        salt = base64.b64decode(salt_text)
        expected_digest = base64.b64decode(digest_text)

        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )

        return hmac.compare_digest(actual_digest, expected_digest)

    except (ValueError, TypeError):
        return False


# -------------------------
# Student account table
# -------------------------

def ensure_student_table():
    """Create the student account table if it does not exist."""
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS student_users (
                id BIGSERIAL PRIMARY KEY,
                full_name VARCHAR(80) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                mobile VARCHAR(10) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))


def ensure_password_reset_table():
    """Create storage for hashed, expiring, one-time reset tokens."""
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL
                    REFERENCES student_users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))


def send_password_reset_email(email: str, token: str) -> None:
    """Send a reset link using SMTP settings from the environment."""
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("RESET_EMAIL_FROM", smtp_username).strip()
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    if not smtp_host or not smtp_username or not smtp_password or not from_email:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, "
            "SMTP_PASSWORD, and RESET_EMAIL_FROM in backend/.env."
        )

    reset_url = f"{frontend_url}/reset-password?token={token}"
    message = EmailMessage()
    message["Subject"] = "College Predictor password reset"
    message["From"] = from_email
    message["To"] = email
    message.set_content(
        "We received a request to reset your College Predictor password.\n\n"
        f"Open this link within 15 minutes to choose a new password:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)


# -------------------------
# General and health routes
# -------------------------

@app.get("/")
def home():
    return {
        "message": "College Predictor API is running!",
        "project": "College Predictor",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health_check():
    try:
        database_name = check_database_connection()
        return {
            "status": "success",
            "database": database_name,
            "message": "PostgreSQL connected successfully",
        }
    except (SQLAlchemyError, OSError):
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check backend/.env and PostgreSQL.",
        )


# -------------------------
# Student signup and login
# -------------------------

@app.post("/auth/signup", status_code=201)
def signup_student(payload: SignupRequest):
    full_name = payload.full_name.strip()
    email = payload.email.strip().lower()
    mobile = payload.mobile.strip()

    if not re.fullmatch(r"[A-Za-z][A-Za-z\s.'-]{1,79}", full_name):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid full name.",
        )

    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address.",
        )

    if not re.fullmatch(r"[6-9]\d{9}", mobile):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid 10-digit Indian mobile number.",
        )

    try:
        ensure_student_table()
        password_hash = hash_password(payload.password)

        with engine.begin() as connection:
            connection.execute(
                text("""
                    INSERT INTO student_users
                        (full_name, email, mobile, password_hash)
                    VALUES
                        (:full_name, :email, :mobile, :password_hash)
                """),
                {
                    "full_name": full_name,
                    "email": email,
                    "mobile": mobile,
                    "password_hash": password_hash,
                },
            )

        return {
            "status": "success",
            "message": "Account created successfully. Please log in.",
        }

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="This email address or mobile number is already registered.",
        )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not create the account. Check the database connection and permissions.",
        )


@app.post("/auth/login")
def login_student(payload: LoginRequest):
    email = payload.email.strip().lower()

    try:
        ensure_student_table()

        with engine.connect() as connection:
            user = connection.execute(
                text("""
                    SELECT id, full_name, email, mobile, password_hash
                    FROM student_users
                    WHERE email = :email
                    LIMIT 1
                """),
                {"email": email},
            ).mappings().first()

        if not user or not verify_password(
            payload.password,
            user["password_hash"],
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password.",
            )

        return {
            "status": "success",
            "message": "Credentials verified.",
            "student": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "mobile": user["mobile"],
            },
        }

    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not verify login. Check the database connection.",
        )


@app.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    generic_response = {
        "status": "success",
        "message": (
            "If an account exists for this email, password-reset instructions "
            "will be provided."
        ),
    }

    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    try:
        ensure_student_table()
        ensure_password_reset_table()

        with engine.begin() as connection:
            user = connection.execute(
                text("""
                    SELECT id
                    FROM student_users
                    WHERE email = :email
                    LIMIT 1
                """),
                {"email": email},
            ).mappings().first()

            if not user:
                return generic_response

            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

            connection.execute(
                text("""
                    UPDATE password_reset_tokens
                    SET used_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND used_at IS NULL
                """),
                {"user_id": user["id"]},
            )
            connection.execute(
                text("""
                    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                    VALUES (:user_id, :token_hash, :expires_at)
                """),
                {
                    "user_id": user["id"],
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                },
            )

        # Local testing only: the token is returned to the developer.
        # Keep this disabled on any publicly accessible deployment.
        if os.getenv("RESET_TOKEN_DEV_MODE", "").strip().lower() == "true":
            return {
                "status": "success",
                "message": "Development reset token generated. Use it on the reset-password page.",
                "reset_token": raw_token,
                "expires_in_minutes": 15,
            }

        send_password_reset_email(email, raw_token)
        return generic_response

    except HTTPException:
        raise
    except RuntimeError as exc:
        # Do not expose account-specific details. Log the configuration problem server-side.
        print(f"Password-reset email configuration error: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Password-reset email is not configured. Set SMTP settings or enable local development mode.",
        )
    except (SQLAlchemyError, OSError, smtplib.SMTPException, ValueError) as exc:
        print(f"Password-reset request failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Password reset is temporarily unavailable. Please try again later.",
        )


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()

    try:
        ensure_student_table()
        ensure_password_reset_table()

        with engine.begin() as connection:
            reset_record = connection.execute(
                text("""
                    SELECT id, user_id
                    FROM password_reset_tokens
                    WHERE token_hash = :token_hash
                      AND used_at IS NULL
                      AND expires_at > CURRENT_TIMESTAMP
                    LIMIT 1
                    FOR UPDATE
                """),
                {"token_hash": token_hash},
            ).mappings().first()

            if not reset_record:
                raise HTTPException(
                    status_code=400,
                    detail="The reset token is invalid, expired, or already used.",
                )

            connection.execute(
                text("""
                    UPDATE student_users
                    SET password_hash = :password_hash
                    WHERE id = :user_id
                """),
                {
                    "password_hash": hash_password(payload.new_password),
                    "user_id": reset_record["user_id"],
                },
            )
            connection.execute(
                text("""
                    UPDATE password_reset_tokens
                    SET used_at = CURRENT_TIMESTAMP
                    WHERE id = :token_id
                """),
                {"token_id": reset_record["id"]},
            )

        return {
            "status": "success",
            "message": "Password updated successfully. You can now log in.",
        }

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"Password-reset update failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Could not reset the password. Please try again.",
        )


# -------------------------
# College list and search
# -------------------------

@app.get("/colleges")
def list_colleges(
    search: str | None = None,
    city: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        pattern = f"%{search.strip()}%" if search and search.strip() else None
        city_pattern = f"%{city.strip()}%" if city and city.strip() else None

        sql = text("""
            SELECT
                institute_code,
                institute_name,
                master_data ->> 'Status' AS college_status,
                master_data ->> 'Place' AS location,
                master_data ->> 'Fees' AS fees
            FROM colleges
            WHERE
                (
                    CAST(:pattern AS TEXT) IS NULL
                    OR institute_name ILIKE :pattern
                    OR COALESCE(master_data ->> 'Place', '') ILIKE :pattern
                    OR COALESCE(master_data ->> 'Status', '') ILIKE :pattern
                )
                AND (
                    CAST(:city_pattern AS TEXT) IS NULL
                    OR COALESCE(master_data ->> 'Place', '') ILIKE :city_pattern
                )
            ORDER BY institute_name
            LIMIT :limit OFFSET :offset
        """)

        with engine.connect() as connection:
            rows = connection.execute(
                sql,
                {
                    "pattern": pattern,
                    "city_pattern": city_pattern,
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()

        return {
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "colleges": [dict(row) for row in rows],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve colleges from the database.",
        )


@app.get("/cities")
def list_cities():
    try:
        sql = text("""
            SELECT DISTINCT TRIM(master_data ->> 'Place') AS city
            FROM colleges
            WHERE NULLIF(TRIM(master_data ->> 'Place'), '') IS NOT NULL
            ORDER BY city
        """)

        with engine.connect() as connection:
            rows = connection.execute(sql).mappings().all()

        return {
            "count": len(rows),
            "cities": [row["city"] for row in rows],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve cities from the database.",
        )


@app.get("/categories")
def list_categories():
    try:
        sql = text("""
            SELECT DISTINCT category_code
            FROM cutoff_values
            WHERE NULLIF(TRIM(category_code), '') IS NOT NULL
            ORDER BY category_code
        """)

        with engine.connect() as connection:
            rows = connection.execute(sql).mappings().all()

        return {
            "count": len(rows),
            "categories": [row["category_code"] for row in rows],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve categories from the database.",
        )


# -------------------------
# Available engineering branches
# -------------------------

@app.get("/branches")
def list_branches(
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        pattern = f"%{search.strip()}%" if search and search.strip() else None

        sql = text("""
            SELECT
                b.branch_name,
                COUNT(DISTINCT cb.college_id) AS college_count
            FROM branches b
            JOIN college_branches cb ON b.id = cb.branch_id
            WHERE
                CAST(:pattern AS TEXT) IS NULL
                OR b.branch_name ILIKE :pattern
            GROUP BY b.branch_name
            ORDER BY b.branch_name
            LIMIT :limit OFFSET :offset
        """)

        with engine.connect() as connection:
            rows = connection.execute(
                sql,
                {
                    "pattern": pattern,
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()

        return {
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "branches": [dict(row) for row in rows],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve branches from the database.",
        )


# -------------------------
# College details
# -------------------------

@app.get("/colleges/{institute_code}/details")
def get_college_details(institute_code: str):
    try:
        college_sql = text("""
            SELECT institute_code, institute_name, master_data
            FROM colleges
            WHERE CAST(institute_code AS TEXT) = :code
               OR LTRIM(CAST(institute_code AS TEXT), '0') = LTRIM(:code, '0')
            LIMIT 1
        """)

        branches_sql = text("""
            SELECT DISTINCT b.branch_code, b.branch_name
            FROM colleges c
            JOIN college_branches cb ON cb.college_id = c.id
            JOIN branches b ON b.id = cb.branch_id
            WHERE CAST(c.institute_code AS TEXT) = :code
               OR LTRIM(CAST(c.institute_code AS TEXT), '0') = LTRIM(:code, '0')
            ORDER BY b.branch_name
        """)

        with engine.connect() as connection:
            college = connection.execute(
                college_sql, {"code": institute_code.strip()}
            ).mappings().first()

            if college is None:
                raise HTTPException(status_code=404, detail="College not found.")

            branches = connection.execute(
                branches_sql, {"code": institute_code.strip()}
            ).mappings().all()

        master_data = college["master_data"] or {}

        if isinstance(master_data, str):
            master_data = json.loads(master_data)

        return {
            "institute_code": college["institute_code"],
            "college_name": college["institute_name"],
            "details": master_data,
            "branches": [dict(branch) for branch in branches],
        }

    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve college details from the database.",
        )
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=500,
            detail="The stored college details could not be read.",
        )


# -------------------------
# Historical CAP cutoff search
# -------------------------

@app.get("/cutoffs")
def search_cutoffs(
    branch: str | None = None,
    category: str | None = None,
    cap_round: int | None = Query(default=None, ge=1, le=4),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        branch_pattern = f"%{branch.strip()}%" if branch and branch.strip() else None
        category_code = category.strip().upper() if category and category.strip() else None

        sql = text("""
            SELECT
                c.institute_code,
                c.institute_name,
                b.branch_code,
                b.branch_name,
                cc.academic_year,
                cc.cap_round,
                cc.status,
                cc.level,
                cc.stage,
                cv.category_code,
                cv.closing_rank,
                cv.percentile,
                cv.original_value
            FROM cutoff_values cv
            JOIN cap_cutoffs cc ON cv.cap_cutoff_id = cc.id
            JOIN college_branches cb ON cc.college_branch_id = cb.id
            JOIN colleges c ON cb.college_id = c.id
            JOIN branches b ON cb.branch_id = b.id
            WHERE
                (CAST(:branch_pattern AS TEXT) IS NULL OR b.branch_name ILIKE :branch_pattern)
                AND (CAST(:category_code AS TEXT) IS NULL OR cv.category_code = :category_code)
                AND (CAST(:cap_round AS SMALLINT) IS NULL OR cc.cap_round = :cap_round)
            ORDER BY cv.percentile DESC NULLS LAST, c.institute_name, b.branch_name
            LIMIT :limit OFFSET :offset
        """)

        with engine.connect() as connection:
            rows = connection.execute(
                sql,
                {
                    "branch_pattern": branch_pattern,
                    "category_code": category_code,
                    "cap_round": cap_round,
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()

        return {
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "filters": {
                "branch": branch,
                "category": category_code,
                "cap_round": cap_round,
            },
            "cutoffs": [dict(row) for row in rows],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve cutoff records from the database.",
        )


# -------------------------
# College predictions
# -------------------------

@app.get("/predict")
def predict_colleges(
    percentile: float = Query(ge=0, le=100),
    category: str = Query(min_length=1),
    branch: str = Query(min_length=1),
    cap_round: int = Query(ge=1, le=4),
    city: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
):
    try:
        city_pattern = f"%{city.strip()}%" if city and city.strip() else None

        sql = text("""
            SELECT
                c.institute_code,
                c.institute_name,
                c.master_data ->> 'Place' AS location,
                b.branch_name,
                cc.cap_round,
                cc.status,
                cc.level,
                cc.stage,
                cv.category_code,
                cv.closing_rank,
                cv.percentile AS cutoff_percentile,
                cv.original_value
            FROM cutoff_values cv
            JOIN cap_cutoffs cc ON cv.cap_cutoff_id = cc.id
            JOIN college_branches cb ON cc.college_branch_id = cb.id
            JOIN colleges c ON cb.college_id = c.id
            JOIN branches b ON cb.branch_id = b.id
            WHERE
                b.branch_name ILIKE :branch
                AND cv.category_code = :category
                AND cc.cap_round = :cap_round
                AND cv.percentile IS NOT NULL
                AND (
                    CAST(:city_pattern AS TEXT) IS NULL
                    OR COALESCE(c.master_data ->> 'Place', '') ILIKE :city_pattern
                )
            ORDER BY cv.percentile DESC
            LIMIT :limit
        """)

        with engine.connect() as connection:
            rows = connection.execute(
                sql,
                {
                    "branch": f"%{branch.strip()}%",
                    "category": category.strip().upper(),
                    "cap_round": cap_round,
                    "city_pattern": city_pattern,
                    "limit": limit,
                },
            ).mappings().all()

        predictions = []

        for row in rows:
            cutoff = float(row["cutoff_percentile"])
            difference = percentile - cutoff

            if difference >= 2:
                chance_label = "Safe"
            elif difference >= -1.5:
                chance_label = "Moderate"
            else:
                chance_label = "Ambitious"

            predictions.append({
                "institute_code": row["institute_code"],
                "college_name": row["institute_name"],
                "location": row["location"],
                "branch_name": row["branch_name"],
                "cap_round": row["cap_round"],
                "status": row["status"],
                "level": row["level"],
                "stage": row["stage"],
                "category": row["category_code"],
                "historical_closing_rank": row["closing_rank"],
                "historical_cutoff_percentile": cutoff,
                "student_percentile": percentile,
                "percentile_difference": round(difference, 4),
                "prediction": chance_label,
                "historical_cutoff": row["original_value"],
            })

        return {
            "student_percentile": percentile,
            "category": category.strip().upper(),
            "branch": branch,
            "cap_round": cap_round,
            "city": city,
            "total_results": len(predictions),
            "notice": (
                "Preliminary estimates based on historical cutoffs. "
                "These are not admission guarantees."
            ),
            "predictions": predictions,
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not generate predictions from the database.",
        )

    
# ============================================================
# ADMIN DASHBOARD AND STUDENT PREDICTION HISTORY
# Add this block at the bottom of app/main.py
# ============================================================

class PredictionHistoryRequest(BaseModel):
    student_id: int = Field(gt=0)
    student_percentile: float = Field(ge=0, le=100)
    category: str = Field(min_length=1, max_length=30)
    branch: str = Field(min_length=1, max_length=200)
    cap_round: int = Field(ge=1, le=4)
    city: str | None = None
    predictions: list[dict] = Field(default_factory=list)


def ensure_prediction_history_table():
    """Create prediction-history storage without modifying existing tables."""
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS student_prediction_history (
                id BIGSERIAL PRIMARY KEY,
                student_id BIGINT NOT NULL
                    REFERENCES student_users(id) ON DELETE CASCADE,
                student_percentile NUMERIC(6, 3) NOT NULL,
                category VARCHAR(30) NOT NULL,
                branch VARCHAR(200) NOT NULL,
                cap_round SMALLINT NOT NULL,
                city VARCHAR(150),
                predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))


def verify_admin_api_key(provided_key: str | None):
    expected_key = os.getenv("ADMIN_API_KEY", "")

    if not expected_key or len(expected_key) < 32:
        raise HTTPException(
            status_code=503,
            detail="Admin API key is not configured on the backend.",
        )

    if not provided_key or not secrets.compare_digest(
        provided_key, expected_key
    ):
        raise HTTPException(
            status_code=401,
            detail="Administrator access required.",
        )


@app.post("/prediction-history")
def save_student_prediction(
    payload: PredictionHistoryRequest,
):
    """Save a prediction result for a registered student."""
    try:
        ensure_student_table()
        ensure_prediction_history_table()

        with engine.begin() as connection:
            student = connection.execute(
                text("""
                    SELECT id
                    FROM student_users
                    WHERE id = :student_id
                """),
                {"student_id": payload.student_id},
            ).first()

            if not student:
                raise HTTPException(
                    status_code=404,
                    detail="Student account not found.",
                )

            connection.execute(
                text("""
                    INSERT INTO student_prediction_history (
                        student_id,
                        student_percentile,
                        category,
                        branch,
                        cap_round,
                        city,
                        predictions
                    )
                    VALUES (
                        :student_id,
                        :percentile,
                        :category,
                        :branch,
                        :cap_round,
                        :city,
                        CAST(:predictions AS JSONB)
                    )
                """),
                {
                    "student_id": payload.student_id,
                    "percentile": payload.student_percentile,
                    "category": payload.category.strip().upper(),
                    "branch": payload.branch.strip(),
                    "cap_round": payload.cap_round,
                    "city": payload.city,
                    "predictions": json.dumps(payload.predictions),
                },
            )

        return {
            "status": "success",
            "message": "Prediction history saved.",
        }

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"Saving prediction history failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Could not save prediction history.",
        )


@app.get("/admin/students")
def admin_get_students(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
):
    """Return student profiles and their saved prediction history."""
    verify_admin_api_key(x_admin_key)

    try:
        ensure_student_table()
        ensure_prediction_history_table()

        with engine.connect() as connection:
            students = connection.execute(text("""
                SELECT
                    s.id,
                    s.full_name,
                    s.email,
                    s.mobile,
                    s.created_at,
                    COUNT(h.id) AS prediction_count
                FROM student_users s
                LEFT JOIN student_prediction_history h
                    ON h.student_id = s.id
                GROUP BY
                    s.id, s.full_name, s.email, s.mobile, s.created_at
                ORDER BY s.created_at DESC, s.id DESC
            """)).mappings().all()

            history = connection.execute(text("""
                SELECT
                    id,
                    student_id,
                    student_percentile,
                    category,
                    branch,
                    cap_round,
                    city,
                    predictions,
                    created_at
                FROM student_prediction_history
                ORDER BY created_at DESC, id DESC
            """)).mappings().all()

        history_by_student = {}

        for item in history:
            record = dict(item)
            student_id = record["student_id"]

            if isinstance(record.get("created_at"), datetime):
                record["created_at"] = record["created_at"].isoformat()

            if isinstance(record.get("student_percentile"), (int, float)):
                record["student_percentile"] = float(
                    record["student_percentile"]
                )

            history_by_student.setdefault(student_id, []).append(record)

        student_list = []

        for student in students:
            record = dict(student)
            student_id = record["id"]

            if isinstance(record.get("created_at"), datetime):
                record["created_at"] = record["created_at"].isoformat()

            record["prediction_count"] = int(record["prediction_count"])
            record["prediction_history"] = history_by_student.get(
                student_id, []
            )
            student_list.append(record)

        return {
            "status": "success",
            "total_students": len(student_list),
            "students": student_list,
        }

    except SQLAlchemyError as exc:
        print(f"Admin student query failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve admin student records.",
        )

