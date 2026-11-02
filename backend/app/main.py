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

from pydantic import BaseModel, Field

from sqlalchemy import text

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from fastapi.middleware.cors import CORSMiddleware

from app.database import check_database_connection, engine

from app.routers.all_india import router as all_india_router

app = FastAPI(

    title="College Predictor API",

    description="Backend API for MHT-CET Engineering College Predictions",

    version="1.0.0",

)
app.include_router(all_india_router)

# Allow the local Next.js frontend to call this API.


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Normalize full address text in the Excel "Place" field to a city name.

# The same expression is used by the dropdown and prediction query so they match.

# -------------------------

# Student authentication

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

def hash_password(password: str) -> str:

    """Hash passwords with PBKDF2-HMAC-SHA256."""

    salt = secrets.token_bytes(16)

    iterations = 600_000

    digest = hashlib.pbkdf2_hmac(

        "sha256", password.encode("utf-8"), salt, iterations

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

        expected = base64.b64decode(digest_text)

        actual = hashlib.pbkdf2_hmac(

            "sha256", password.encode("utf-8"), salt, int(iterations)

        )

        return hmac.compare_digest(actual, expected)

    except (ValueError, TypeError):

        return False

def create_access_token(user_id: int, email: str, expires_minutes: int = 60 * 24) -> str:

    """Create a signed JWT-shaped bearer token using only Python's standard library.

    Set AUTH_SECRET_KEY in the backend environment for a stable, private signing key.

    The fallback is intended only for local development.

    """

    secret = os.getenv("AUTH_SECRET_KEY", "local-development-only-change-this-secret").encode("utf-8")

    now = int(datetime.now(timezone.utc).timestamp())

    header = {"alg": "HS256", "typ": "JWT"}

    payload = {

        "sub": str(user_id),

        "email": email,

        "iat": now,

        "exp": now + expires_minutes * 60,

    }

    def encode_part(value: dict) -> str:

        raw = json.dumps(value, separators=(",", ":")).encode("utf-8")

        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    signing_input = f"{encode_part(header)}.{encode_part(payload)}"

    signature = hmac.new(secret, signing_input.encode("ascii"), hashlib.sha256).digest()

    signature_text = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")

    return f"{signing_input}.{signature_text}"

def ensure_student_table():

    """Create the student account table if it is not already present."""

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

    """Create storage for hashed, expiring, one-time password reset tokens."""

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

def send_password_reset_email(email: str, token: str):

    """Send the reset link using SMTP configuration from environment variables."""

    smtp_host = os.getenv("SMTP_HOST", "").strip()

    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    smtp_username = os.getenv("SMTP_USERNAME", "").strip()

    smtp_password = os.getenv("SMTP_PASSWORD", "")

    from_email = os.getenv("RESET_EMAIL_FROM", smtp_username).strip()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    if not all([smtp_host, smtp_username, smtp_password, from_email]):

        raise RuntimeError("SMTP is not configured.")

    message = EmailMessage()

    message["Subject"] = "College Predictor password reset"

    message["From"] = from_email

    message["To"] = email

    message.set_content(

        "A password reset was requested for your College Predictor account.\n\n"

        f"Open this link within 15 minutes:\n"

        f"{frontend_url}/reset-password?token={token}\n\n"

        "If you did not request this, ignore this email."

    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:

        server.starttls()

        server.login(smtp_username, smtp_password)

        server.send_message(message)

@app.post("/auth/signup", status_code=201)

def signup_student(payload: SignupRequest):

    full_name = payload.full_name.strip()

    email = payload.email.strip().lower()

    mobile = payload.mobile.strip()

    if not re.fullmatch(r"[A-Za-z][A-Za-z\s.'-]{1,79}", full_name):

        raise HTTPException(status_code=422, detail="Please enter a valid full name.")

    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):

        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    if not re.fullmatch(r"[6-9]\d{9}", mobile):

        raise HTTPException(status_code=422, detail="Please enter a valid 10-digit Indian mobile number.")

    try:

        ensure_student_table()

        with engine.begin() as connection:

            connection.execute(text("""

                INSERT INTO student_users (full_name, email, mobile, password_hash)

                VALUES (:full_name, :email, :mobile, :password_hash)

            """), {

                "full_name": full_name,

                "email": email,

                "mobile": mobile,

                "password_hash": hash_password(payload.password),

            })

        return {"status": "success", "message": "Account created successfully. Please log in."}

    except IntegrityError:

        raise HTTPException(

            status_code=409,

            detail="This email address or mobile number is already registered.",

        )

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not create the account.")

@app.post("/auth/login")

def login_student(payload: LoginRequest):

    email = payload.email.strip().lower()

    try:

        ensure_student_table()

        with engine.connect() as connection:

            user = connection.execute(text("""

                SELECT id, full_name, email, mobile, password_hash

                FROM student_users

                WHERE email = :email

                LIMIT 1

            """), {"email": email}).mappings().first()

        if not user or not verify_password(payload.password, user["password_hash"]):

            raise HTTPException(status_code=401, detail="Incorrect email or password.")

        access_token = create_access_token(user["id"], user["email"])

        return {

            "status": "success",

            "message": "Credentials verified.",

            "access_token": access_token,

            "token": access_token,

            "token_type": "bearer",

            "expires_in": 86400,

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

        raise HTTPException(status_code=503, detail="Could not verify login. Check the database connection.")

@app.post("/auth/forgot-password")

def forgot_password(payload: ForgotPasswordRequest):

    email = payload.email.strip().lower()

    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):

        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    generic_response = {

        "status": "success",

        "message": "If an account exists for this email, password-reset instructions will be provided.",

    }

    try:

        ensure_student_table()

        ensure_password_reset_table()

        with engine.begin() as connection:

            user = connection.execute(text("""

                SELECT id FROM student_users WHERE email = :email LIMIT 1

            """), {"email": email}).mappings().first()

            if not user:

                return generic_response

            raw_token = secrets.token_urlsafe(32)

            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

            expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

            connection.execute(text("""

                UPDATE password_reset_tokens

                SET used_at = CURRENT_TIMESTAMP

                WHERE user_id = :user_id AND used_at IS NULL

            """), {"user_id": user["id"]})

            connection.execute(text("""

                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)

                VALUES (:user_id, :token_hash, :expires_at)

            """), {

                "user_id": user["id"],

                "token_hash": token_hash,

                "expires_at": expires_at,

            })

        # Only enable token-return mode for local development, never public deployment.

        if os.getenv("RESET_TOKEN_DEV_MODE", "").strip().lower() == "true":

            return {

                **generic_response,

                "reset_token": raw_token,

                "expires_in_minutes": 15,

            }

        send_password_reset_email(email, raw_token)

        return generic_response

    except HTTPException:

        raise

    except RuntimeError:

        raise HTTPException(

            status_code=503,

            detail="Password-reset email is not configured. Configure SMTP or enable RESET_TOKEN_DEV_MODE=true for local testing.",

        )

    except (SQLAlchemyError, OSError, smtplib.SMTPException, ValueError):

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

            reset_record = connection.execute(text("""

                SELECT id, user_id

                FROM password_reset_tokens

                WHERE token_hash = :token_hash

                  AND used_at IS NULL

                  AND expires_at > CURRENT_TIMESTAMP

                LIMIT 1

                FOR UPDATE

            """), {"token_hash": token_hash}).mappings().first()

            if not reset_record:

                raise HTTPException(

                    status_code=400,

                    detail="The reset token is invalid, expired, or already used.",

                )

            connection.execute(text("""

                UPDATE student_users

                SET password_hash = :password_hash

                WHERE id = :user_id

            """), {

                "password_hash": hash_password(payload.new_password),

                "user_id": reset_record["user_id"],

            })

            connection.execute(text("""

                UPDATE password_reset_tokens

                SET used_at = CURRENT_TIMESTAMP

                WHERE id = :token_id

            """), {"token_id": reset_record["id"]})

        return {"status": "success", "message": "Password reset successfully. Please log in."}

    except HTTPException:

        raise

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not reset the password.")

# City names are derived from the actual Place values in the college master data.

# CAP Round 1-4 cutoff tables hold college codes/names and cutoff values; the

# master-data Place field is the source for each college's city/location.

CITY_ALIASES = {
    # Renamed Maharashtra cities – keep only new names
    "OSMANABAD": "Dharashiv",
    "DHARASHIV": "Dharashiv",

    "AHMEDNAGAR": "Ahilyanagar",
    "AHILYANAGAR": "Ahilyanagar",

    "AURANGABAD": "Chhatrapati Sambhajinagar",
    "CHHATRAPATI SAMBHAJINAGAR": "Chhatrapati Sambhajinagar",
    "CHHATRAPATISAMBHAJINAGAR": "Chhatrapati Sambhajinagar",

    # Mumbai
    "BOMBAY": "Mumbai",
    "MUMBAI": "Mumbai",

    # Navi Mumbai
    "NAVI MUMBAI": "Navi Mumbai",
    "NEW MUMBAI": "Navi Mumbai",

    # Pimpri-Chinchwad
    "PIMPRI CHINCHWAD": "Pimpri-Chinchwad",
    "PIMPRI-CHINCHWAD": "Pimpri-Chinchwad",
}
# Common Maharashtra city/town names used to recognize a city inside a longer

# address such as "(Bk) Off Sinhgad Road Pune" or "Andheri(W) Mumbai".

# Unrecognized places are cleaned using address patterns below rather than

# returning the whole raw address unchanged.

KNOWN_CITIES = [

    "Chhatrapati Sambhajinagar", "Pimpri-Chinchwad", "Navi Mumbai",

    "Ahilyanagar", "Ahmednagar", "Dharashiv", "Osmanabad", "Chandrapur",

    "Bhandara", "Yavatmal", "Gadchiroli", "Washim", "Hingoli", "Nandurbar",

    "Sindhudurg", "Ratnagiri", "Sambhajinagar", "Amravati", "Akola",

    "Kolhapur", "Sangli", "Solapur", "Satara", "Sangamner", "Kopargaon",

    "Shrirampur", "Baramati", "Chakan", "Talegaon", "Lonavala", "Khed",

    "Maval", "Wagholi", "Hadapsar", "Pune", "Nashik", "Mumbai", "Nagpur",

    "Thane", "Vasai", "Virar", "Palghar", "Panvel", "Kalyan", "Dombivli",

    "Ulhasnagar", "Ambernath", "Badlapur", "Mira-Bhayandar", "Bhiwandi",

    "Jalgaon", "Dhule", "Nanded", "Latur", "Beed", "Parbhani", "Jalna",

    "Wardha", "Gondia", "Buldhana", "Malegaon", "Ichalkaranji", "Karad",

    "Trimbakeshwar", "Sinnar", "Manmad", "Shirdi", "Yeola", "Paithan",

    "Sillod", "Udgir", "Ambajogai", "Barshi", "Pandharpur", "Tasgaon",

    "Islampur", "Miraj", "Vita", "Phaltan", "Mahabaleshwar", "Chiplun",

    "Sawantwadi", "Vengurla", "Dapoli", "Alibag", "Pen", "Uran", "Karjat",

]

def normalize_city(place: str | None) -> str | None:

    """Convert a raw college address into a concise city/town label."""

    if not place or not str(place).strip():

        return None

    value = re.sub(r"\s+", " ", str(place)).strip(" ,.-")

    if not value:

        return None

    # If a known city occurs anywhere in the address, prefer that city label.

    # Longest names are checked first to avoid partial matches (e.g. Mumbai/Navi Mumbai).

    for name in sorted(KNOWN_CITIES, key=len, reverse=True):

        if re.search(r"(?<![A-Za-z])" + re.escape(name) + r"(?![A-Za-z])", value, re.I):

            return CITY_ALIASES.get(name.upper(), name)

    # Normalize common old/new district names even if they were not matched above.

    for alias, canonical in CITY_ALIASES.items():

        if re.search(r"(?<![A-Za-z])" + re.escape(alias) + r"(?![A-Za-z])", value, re.I):

            return canonical

    # Use explicit district/taluka values when no recognized city is present.

    match = re.search(r"(?i)\b(?:dist(?:rict)?|tal(?:uka)?|tq)\.?\s*[-:]?\s*([A-Za-z][A-Za-z .'-]{1,40})", value)

    if match:

        candidate = re.split(r"(?i)\b(?:maharashtra|india|pin\s*code)\b", match.group(1))[0].strip(" ,.-")

        candidate = re.sub(r"\s*\d{6}\b.*$", "", candidate).strip(" ,.-")

        if candidate:

            return candidate.title()

    # Last-resort cleanup for genuine small towns/villages in the source data.

    parts = [part.strip(" .,-") for part in value.split(",") if part.strip(" .,-")]

    candidate = parts[-1] if parts else value

    candidate = re.sub(r"(?i)^(?:at\s+)?(?:a\s*/\s*p\.?|a\s*&\s*p\.?|at\s*/\s*post|post|village|vill\.?|po\.?|tal\.?|dist\.?)\s*[-:]?\s*", "", candidate)

    candidate = re.sub(r"(?i)\b(maharashtra|india)\b", "", candidate)

    candidate = re.sub(r"\b\d{6}\b", "", candidate)

    candidate = re.sub(r"\s+", " ", candidate).strip(" ,.-")

    if not candidate or "@" in candidate or len(candidate) > 60:

        return None

    return candidate.title()

# -------------------------

# Admin dashboard and student prediction history

# -------------------------

def ensure_prediction_history_table():

    """Create storage for saved student prediction history when needed."""

    with engine.begin() as connection:

        connection.execute(text("""

            CREATE TABLE IF NOT EXISTS student_prediction_history (

                id BIGSERIAL PRIMARY KEY,

                student_id BIGINT NOT NULL

                    REFERENCES student_users(id) ON DELETE CASCADE,

                student_percentile NUMERIC(6,3),

                category VARCHAR(30) NOT NULL,

                branch TEXT NOT NULL,

                cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),

                city TEXT,

                predictions JSONB NOT NULL DEFAULT '[]'::jsonb,

                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

            )

        """))

# -------------------------

# Student saved college collections

# -------------------------



class PredictionHistoryRequest(BaseModel):
    student_percentile: float = Field(ge=0, le=100)
    category: str = Field(min_length=1, max_length=30)
    branch: str = Field(min_length=1, max_length=200)
    cap_round: int = Field(ge=1, le=4)
    city: str | None = None
    predictions: list[dict] = Field(default_factory=list)


@app.post("/prediction-history", status_code=201)
def save_student_prediction(
    payload: PredictionHistoryRequest,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    """Save history for the account represented by the verified bearer token."""
    student_id = get_authenticated_student_id(authorization)
    ensure_student_table()
    ensure_prediction_history_table()

    try:
        with engine.begin() as connection:
            student = connection.execute(
                text("SELECT id FROM student_users WHERE id = :student_id"),
                {"student_id": student_id},
            ).first()
            if not student:
                raise HTTPException(status_code=401, detail="Student account not found. Please log in again.")

            saved = connection.execute(text("""
                INSERT INTO student_prediction_history (
                    student_id, student_percentile, category, branch,
                    cap_round, city, predictions
                ) VALUES (
                    :student_id, :student_percentile, :category, :branch,
                    :cap_round, :city, CAST(:predictions AS JSONB)
                ) RETURNING id, created_at
            """), {
                "student_id": student_id,
                "student_percentile": payload.student_percentile,
                "category": payload.category.strip().upper(),
                "branch": payload.branch.strip(),
                "cap_round": payload.cap_round,
                "city": payload.city.strip() if payload.city else None,
                "predictions": json.dumps(payload.predictions),
            }).mappings().one()

        return {
            "status": "success",
            "message": "Prediction history saved successfully.",
            "history_id": saved["id"],
            "created_at": saved["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not save prediction history.")


@app.get("/prediction-history")
def get_student_prediction_history(
    authorization: str | None = Header(default=None, alias="Authorization"),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Return only the authenticated student's prediction history."""
    student_id = get_authenticated_student_id(authorization)
    ensure_student_table()
    ensure_prediction_history_table()
    try:
        with engine.connect() as connection:
            rows = connection.execute(text("""
                SELECT id, student_percentile, category, branch, cap_round,
                       city, predictions, created_at
                FROM student_prediction_history
                WHERE student_id = :student_id
                ORDER BY created_at DESC, id DESC
                LIMIT :limit
            """), {"student_id": student_id, "limit": limit}).mappings().all()
        history = []
        for row in rows:
            item = dict(row)
            if item.get("student_percentile") is not None:
                item["student_percentile"] = float(item["student_percentile"])
            if isinstance(item.get("created_at"), datetime):
                item["created_at"] = item["created_at"].isoformat()
            history.append(item)
        return {"status": "success", "history": history, "count": len(history)}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load prediction history.")
class SaveCollegeCollectionRequest(BaseModel):

    student_percentile: float = Field(ge=0, le=100)

    category: str = Field(min_length=1, max_length=30)

    branch: str = Field(min_length=1, max_length=200)

    cap_round: int = Field(ge=1, le=4)

    city: str | None = Field(default=None, max_length=150)

    predictions: list[dict] = Field(min_length=1, max_length=1000)

def get_authenticated_student_id(authorization: str | None) -> int:

    """Validate a bearer token issued by create_access_token()."""

    if not authorization or not authorization.startswith("Bearer "):

        raise HTTPException(status_code=401, detail="Please log in to continue.")

    token = authorization[7:].strip()

    try:

        header_part, payload_part, signature_part = token.split(".")

        signing_input = f"{header_part}.{payload_part}"

        secret = os.getenv(

            "AUTH_SECRET_KEY", "local-development-only-change-this-secret"

        ).encode("utf-8")

        expected_signature = base64.urlsafe_b64encode(

            hmac.new(secret, signing_input.encode("ascii"), hashlib.sha256).digest()

        ).rstrip(b"=").decode("ascii")

        if not hmac.compare_digest(signature_part, expected_signature):

            raise ValueError("Invalid token signature")

        payload_bytes = base64.urlsafe_b64decode(

            payload_part + "=" * (-len(payload_part) % 4)

        )

        payload = json.loads(payload_bytes.decode("utf-8"))

        if int(payload["exp"]) <= int(datetime.now(timezone.utc).timestamp()):

            raise ValueError("Expired token")

        student_id = int(payload["sub"])

        if student_id <= 0:

            raise ValueError("Invalid student ID")

        return student_id

    except (ValueError, KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError):

        raise HTTPException(status_code=401, detail="Invalid or expired login. Please log in again.")

def ensure_saved_collections_table():

    """Create storage for student-saved prediction result collections."""

    with engine.begin() as connection:

        connection.execute(text("""

            CREATE TABLE IF NOT EXISTS student_saved_collections (

                id BIGSERIAL PRIMARY KEY,

                student_id BIGINT NOT NULL

                    REFERENCES student_users(id) ON DELETE CASCADE,

                title VARCHAR(120) NOT NULL DEFAULT 'My Saved Colleges',

                student_percentile NUMERIC(6,3) NOT NULL,

                category VARCHAR(30) NOT NULL,

                branch VARCHAR(200) NOT NULL,

                cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),

                city VARCHAR(150),

                predictions JSONB NOT NULL DEFAULT '[]'::jsonb,

                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

            )

        """))

@app.post("/saved-college-collections", status_code=201)

def save_college_collection(

    payload: SaveCollegeCollectionRequest,

    authorization: str | None = Header(default=None, alias="Authorization"),

):

    """Save all current prediction results for the authenticated student."""

    student_id = get_authenticated_student_id(authorization)

    ensure_student_table()

    ensure_saved_collections_table()

    try:

        with engine.begin() as connection:

            student_exists = connection.execute(

                text("SELECT id FROM student_users WHERE id = :student_id"),

                {"student_id": student_id},

            ).first()

            if not student_exists:

                raise HTTPException(status_code=401, detail="Student account no longer exists. Please log in again.")

            saved = connection.execute(text("""

                INSERT INTO student_saved_collections (

                    student_id, student_percentile, category, branch,

                    cap_round, city, predictions

                ) VALUES (

                    :student_id, :percentile, :category, :branch,

                    :cap_round, :city, CAST(:predictions AS JSONB)

                ) RETURNING id, created_at

            """), {

                "student_id": student_id,

                "percentile": payload.student_percentile,

                "category": payload.category.strip().upper(),

                "branch": payload.branch.strip(),

                "cap_round": payload.cap_round,

                "city": payload.city.strip() if payload.city else None,

                "predictions": json.dumps(payload.predictions),

            }).mappings().one()

        return {

            "status": "success",

            "collection_id": saved["id"],

            "message": "All matching colleges have been saved.",

            "saved_colleges": len(payload.predictions),

            "created_at": saved["created_at"].isoformat(),

        }

    except HTTPException:

        raise

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not save colleges. Please try again.")

@app.get("/saved-college-collections")

def get_saved_collections(

    authorization: str | None = Header(default=None, alias="Authorization"),

):

    """Return saved collections belonging only to the authenticated student."""

    student_id = get_authenticated_student_id(authorization)

    ensure_saved_collections_table()

    try:

        with engine.connect() as connection:

            rows = connection.execute(text("""

                SELECT id, title, student_percentile, category, branch,

                       cap_round, city, predictions, created_at

                FROM student_saved_collections

                WHERE student_id = :student_id

                ORDER BY created_at DESC, id DESC

            """), {"student_id": student_id}).mappings().all()

        collections = []

        for row in rows:

            item = dict(row)

            item["student_percentile"] = float(item["student_percentile"])

            if isinstance(item.get("created_at"), datetime):

                item["created_at"] = item["created_at"].isoformat()

            collections.append(item)

        return {"status": "success", "collections": collections}

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not retrieve saved colleges.")

@app.delete("/saved-college-collections/{collection_id}")

def delete_saved_collection(

    collection_id: int,

    authorization: str | None = Header(default=None, alias="Authorization"),

):

    """Delete a saved collection only if it belongs to the authenticated student."""

    if collection_id <= 0:

        raise HTTPException(status_code=422, detail="Invalid collection ID.")

    student_id = get_authenticated_student_id(authorization)

    ensure_saved_collections_table()

    try:

        with engine.begin() as connection:

            result = connection.execute(text("""

                DELETE FROM student_saved_collections

                WHERE id = :collection_id AND student_id = :student_id

            """), {"collection_id": collection_id, "student_id": student_id})

            if result.rowcount == 0:

                raise HTTPException(status_code=404, detail="Saved collection not found.")

        return {"status": "success", "message": "Saved collection deleted."}

    except HTTPException:

        raise

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not delete the saved collection.")

def verify_admin_api_key(provided_key: str | None):

    expected_key = os.getenv("ADMIN_API_KEY", "")

    if len(expected_key) < 32:

        raise HTTPException(

            status_code=503,

            detail="Admin API key is not configured on the backend. Set ADMIN_API_KEY in the backend environment.",

        )

    if not provided_key or not secrets.compare_digest(provided_key, expected_key):

        raise HTTPException(status_code=401, detail="Administrator access required.")

@app.get("/admin/students")

def admin_get_students(

    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),

):

    """Return student accounts, prediction history, and saved collections for admin UI."""

    verify_admin_api_key(x_admin_key)

    ensure_student_table()

    ensure_prediction_history_table()

    ensure_saved_collections_table()

    try:

        with engine.connect() as connection:

            students = connection.execute(text("""

                SELECT s.id, s.full_name, s.email, s.mobile, s.created_at,

                       (SELECT COUNT(*) FROM student_prediction_history h

                        WHERE h.student_id = s.id) AS prediction_count,

                       (SELECT COUNT(*) FROM student_saved_collections sc

                        WHERE sc.student_id = s.id) AS saved_collection_count,

                       (SELECT COALESCE(SUM(jsonb_array_length(sc.predictions)), 0)

                        FROM student_saved_collections sc

                        WHERE sc.student_id = s.id) AS saved_college_count

                FROM student_users s

                ORDER BY s.created_at DESC, s.id DESC

            """)).mappings().all()

            history = connection.execute(text("""

                SELECT id, student_id, student_percentile, category,

                       branch, cap_round, city, predictions, created_at

                FROM student_prediction_history

                ORDER BY created_at DESC, id DESC

            """)).mappings().all()

            saved_rows = connection.execute(text("""

                SELECT id, student_id, title, student_percentile, category,

                       branch, cap_round, city, predictions, created_at

                FROM student_saved_collections

                ORDER BY created_at DESC, id DESC

            """)).mappings().all()

        history_by_student = {}

        for item in history:

            record = dict(item)

            sid = record["student_id"]

            if isinstance(record.get("created_at"), datetime):

                record["created_at"] = record["created_at"].isoformat()

            if record.get("student_percentile") is not None:

                record["student_percentile"] = float(record["student_percentile"])

            history_by_student.setdefault(sid, []).append(record)

        saved_by_student = {}

        for item in saved_rows:

            record = dict(item)

            sid = record["student_id"]

            record["student_percentile"] = float(record["student_percentile"])

            if isinstance(record.get("created_at"), datetime):

                record["created_at"] = record["created_at"].isoformat()

            saved_by_student.setdefault(sid, []).append(record)

        student_list = []

        for item in students:

            record = dict(item)

            sid = record["id"]

            if isinstance(record.get("created_at"), datetime):

                record["created_at"] = record["created_at"].isoformat()

            record["prediction_count"] = int(record["prediction_count"])

            record["saved_collection_count"] = int(record["saved_collection_count"])

            record["saved_college_count"] = int(record["saved_college_count"])

            record["prediction_history"] = history_by_student.get(sid, [])

            record["saved_collections"] = saved_by_student.get(sid, [])

            student_list.append(record)

        return {

            "status": "success",

            "total_students": len(student_list),

            "students": student_list,

        }

    except SQLAlchemyError:

        raise HTTPException(status_code=503, detail="Could not retrieve admin student records.")

@app.get("/")

def home():

    return {

        "message": "College Predictor API is running!",

        "project": "College Predictor",

        "status": "success",

    }

@app.get("/health")

def health_check():

    return {

        "status": "healthy",

        "database": "connected through health check endpoint",

    }

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

            detail=(

                "Database connection failed. "

                "Check backend/.env and PostgreSQL."

            ),

        )

@app.get("/colleges")

def list_colleges(

    search: str | None = None,

    limit: int = Query(default=20, ge=1, le=100),

    offset: int = Query(default=0, ge=0),

):

    try:

        if search and search.strip():

            sql = text("""

                SELECT

                    institute_code,

                    institute_name,

                    master_data ->> 'Status' AS college_status,

                    master_data ->> 'Place' AS location,

                    master_data ->> 'Fees' AS fees

                FROM colleges

                WHERE

                    institute_name ILIKE :pattern

                    OR COALESCE(master_data ->> 'Place', '')

                        ILIKE :pattern

                    OR COALESCE(master_data ->> 'Status', '')

                        ILIKE :pattern

                ORDER BY institute_name

                LIMIT :limit OFFSET :offset

            """)

            params = {

                "pattern": f"%{search.strip()}%",

                "limit": limit,

                "offset": offset,

            }

        else:

            sql = text("""

                SELECT

                    institute_code,

                    institute_name,

                    master_data ->> 'Status' AS college_status,

                    master_data ->> 'Place' AS location,

                    master_data ->> 'Fees' AS fees

                FROM colleges

                ORDER BY institute_name

                LIMIT :limit OFFSET :offset

            """)

            params = {

                "limit": limit,

                "offset": offset,

            }

        with engine.connect() as connection:

            rows = connection.execute(

                sql, params

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

@app.get("/categories")

def list_categories():

    """Return every distinct category code present in the cutoff dataset."""

    try:

        sql = text("""

            SELECT DISTINCT category_code

            FROM cutoff_values

            WHERE category_code IS NOT NULL

              AND BTRIM(category_code) <> ''

            ORDER BY category_code

        """)

        with engine.connect() as connection:

            rows = connection.execute(sql).scalars().all()

        categories = [str(value).strip().upper() for value in rows if value]

        return {

            "count": len(categories),

            "categories": categories,

        }

    except SQLAlchemyError:

        raise HTTPException(

            status_code=503,

            detail="Could not retrieve admission categories from the database.",

        )

@app.get("/cities")

def list_cities():

    """Return unique city/town labels derived from actual college Place values."""

    try:

        with engine.connect() as connection:

            places = connection.execute(text("""

                SELECT master_data ->> 'Place' AS place

                FROM colleges

                WHERE NULLIF(BTRIM(master_data ->> 'Place'), '') IS NOT NULL

            """)).scalars().all()

        cities = sorted(

            {city for place in places if (city := normalize_city(place))},

            key=str.casefold,

        )

        return {"count": len(cities), "cities": cities}

    except SQLAlchemyError:

        raise HTTPException(

            status_code=503,

            detail="Could not retrieve cities from the college data.",

        )

@app.get("/branches")

def list_branches(

    search: str | None = None,

    limit: int = Query(default=50, ge=1, le=100),

    offset: int = Query(default=0, ge=0),

):

    try:

        pattern = (

            f"%{search.strip()}%"

            if search and search.strip()

            else None

        )

        sql = text("""

            SELECT

                b.branch_name,

                COUNT(DISTINCT cb.college_id) AS college_count

            FROM branches b

            JOIN college_branches cb

                ON b.id = cb.branch_id

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

@app.get("/colleges/{institute_code}/details")

def get_college_details(institute_code: str):

    """Return college master-data details and available branches."""

    try:

        college_sql = text("""

            SELECT

                institute_code,

                institute_name,

                master_data

            FROM colleges

            WHERE

                CAST(institute_code AS TEXT) = :code

                OR LTRIM(CAST(institute_code AS TEXT), '0')

                    = LTRIM(:code, '0')

            LIMIT 1

        """)

        branches_sql = text("""

            SELECT DISTINCT

                b.branch_code,

                b.branch_name

            FROM colleges c

            JOIN college_branches cb

                ON cb.college_id = c.id

            JOIN branches b

                ON b.id = cb.branch_id

            WHERE

                CAST(c.institute_code AS TEXT) = :code

                OR LTRIM(CAST(c.institute_code AS TEXT), '0')

                    = LTRIM(:code, '0')

            ORDER BY b.branch_name

        """)

        with engine.connect() as connection:

            college = connection.execute(

                college_sql,

                {"code": institute_code.strip()},

            ).mappings().first()

            if college is None:

                raise HTTPException(

                    status_code=404,

                    detail="College not found in the database.",

                )

            branches = connection.execute(

                branches_sql,

                {"code": institute_code.strip()},

            ).mappings().all()

        master_data = college["master_data"] or {}

        # Support JSON values returned as strings as well as dictionaries.

        if isinstance(master_data, str):

            import json

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

            detail="The stored master-data record could not be read.",

        )

@app.get("/cutoffs")

def search_cutoffs(

    branch: str | None = None,

    category: str | None = None,

    cap_round: int | None = Query(default=None, ge=1, le=4),

    academic_year: str = Query(default="2025", pattern=r"^(2025|2026)$"),

    limit: int = Query(default=20, ge=1, le=100),

    offset: int = Query(default=0, ge=0),

):

    try:

        branch_pattern = (

            f"%{branch.strip()}%"

            if branch and branch.strip()

            else None

        )

        category_code = (

            category.strip().upper()

            if category and category.strip()

            else None

        )

        sql = text(f"""

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

            JOIN cap_cutoffs cc

                ON cv.cap_cutoff_id = cc.id

            JOIN college_branches cb

                ON cc.college_branch_id = cb.id

            JOIN colleges c

                ON cb.college_id = c.id

            JOIN branches b

                ON cb.branch_id = b.id

            WHERE

                (

                    CAST(:branch_pattern AS TEXT) IS NULL

                    OR b.branch_name ILIKE :branch_pattern

                )

                AND (

                    CAST(:category_code AS TEXT) IS NULL

                    OR cv.category_code = :category_code

                )

                AND (

                    CAST(:cap_round AS SMALLINT) IS NULL

                    OR cc.cap_round = :cap_round

                )

                AND cc.academic_year = :academic_year

            ORDER BY

                cv.percentile DESC NULLS LAST,

                c.institute_name,

                b.branch_name

            LIMIT :limit OFFSET :offset

        """)

        with engine.connect() as connection:

            rows = connection.execute(

                sql,

                {

                    "branch_pattern": branch_pattern,

                    "category_code": category_code,

                    "cap_round": cap_round,

                    "academic_year": academic_year,

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

@app.get("/predict")

def predict_colleges(

    percentile: float = Query(ge=0, le=100),

    category: str = Query(min_length=1),

    branch: str = Query(min_length=1),

    cap_round: int = Query(ge=1, le=4),

    academic_year: str = Query(default="2025", pattern=r"^(2025|2026)$"),

    limit: int = Query(default=50, ge=1, le=50),

    city: str | None = Query(default=None),

):

    """Return relevant preliminary college matches using historical cutoffs.

    Relevance window follows the requested example: for a 50 percentile

    student, show historical cutoffs from 10 to 70. The window moves with

    the student's percentile and is not an admission-probability estimate.

    """

    try:

        normalized_category = category.strip().upper()

        normalized_branch = branch.strip()

        # Map current official city names to legacy names used in some Place records.
        # This keeps the dropdown on the new names while matching older college data.
        CITY_SEARCH_ALIASES = {
            "chhatrapati sambhajinagar": "aurangabad",
            "dharashiv": "osmanabad",
            "ahilyanagar": "ahmednagar",
        }

        selected_city = city.strip() if city and city.strip() else None
        legacy_city = (
            CITY_SEARCH_ALIASES.get(selected_city.casefold())
            if selected_city
            else None
        )
        city_pattern = f"%{selected_city}%" if selected_city else None
        legacy_city_pattern = f"%{legacy_city}%" if legacy_city else None

        # Dynamic relevance window. Example: percentile 50 -> cutoff range 10-70.

        # New logic: show colleges within ±10 percentile points
        cutoff_min = max(0.0, percentile - 10.0)
        cutoff_max = min(100.0, percentile + 10.0)

        sql = text(f"""

            SELECT

                c.institute_code,

                c.institute_name,

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

            JOIN cap_cutoffs cc

                ON cv.cap_cutoff_id = cc.id

            JOIN college_branches cb

                ON cc.college_branch_id = cb.id

            JOIN colleges c

                ON cb.college_id = c.id

            JOIN branches b

                ON cb.branch_id = b.id

            WHERE b.branch_name = :branch

              AND cv.category_code = :category

              AND cc.cap_round = :cap_round

              AND cc.academic_year = :academic_year

              AND cv.percentile IS NOT NULL

              AND (
                    CAST(:city_pattern AS TEXT) IS NULL
                    OR COALESCE(c.master_data ->> 'Place', '') ILIKE :city_pattern
                    OR (
                        CAST(:legacy_city_pattern AS TEXT) IS NOT NULL
                        AND COALESCE(c.master_data ->> 'Place', '') ILIKE :legacy_city_pattern
                    )
              )

            ORDER BY cv.percentile DESC, c.institute_name

        """)

        with engine.connect() as connection:

            rows = connection.execute(

                sql,

                {

                    "branch": normalized_branch,

                    "category": normalized_category,

                    "cap_round": cap_round,

                    "academic_year": academic_year,

                    "city_pattern": city_pattern,
                    "legacy_city_pattern": legacy_city_pattern,

                },

            ).mappings().all()

        predictions = []

        for row in rows:

            cutoff = float(row["cutoff_percentile"])

            # Keep only cutoffs in the relevant window for this student's score.

            if cutoff < cutoff_min or cutoff > cutoff_max:

                continue

            difference = float(percentile) - cutoff

            if difference >= 2.0:

                chance_label = "More Chance"

                chance_order = 0

            elif difference >= -1.5:

                chance_label = "Moderate"

                chance_order = 1

            else:

                chance_label = "Low Chances"

                chance_order = 2

            predictions.append({

                "institute_code": row["institute_code"],

                "college_name": row["institute_name"],

                "branch_name": row["branch_name"],

                "cap_round": row["cap_round"],

                "status": row["status"],

                "level": row["level"],

                "stage": row["stage"],

                "category": row["category_code"],

                "historical_closing_rank": row["closing_rank"],

                "historical_cutoff_percentile": cutoff,

                "student_percentile": float(percentile),

                "percentile_difference": round(difference, 4),

                "prediction": chance_label,

                "historical_cutoff": row["original_value"],

                "_chance_order": chance_order,

            })

        # Show better cutoff-based matches first, then the closest cutoff in each group.

        predictions.sort(

            key=lambda item: (

                item["_chance_order"],

                abs(item["percentile_difference"]),

                -item["historical_cutoff_percentile"],

                str(item["college_name"]),

            )

        )

        predictions = predictions[:limit]

        for item in predictions:

            item.pop("_chance_order", None)

        return {

            "student_percentile": float(percentile),

            "category": normalized_category,

            "branch": normalized_branch,

            "cap_round": cap_round,

            "academic_year": academic_year,

            "cutoff_range": {

                "minimum_percentile": round(cutoff_min, 2),

                "maximum_percentile": round(cutoff_max, 2),

            },

            "total_results": len(predictions),

            "limit": limit,

            "notice": (

                f"Preliminary labels are based on {academic_year} historical cutoffs and a relevance window. "

                "They are not admission guarantees or statistically validated probabilities."

            ),

            "predictions": predictions,

        }

    except SQLAlchemyError:

        raise HTTPException(

            status_code=503,

            detail="Could not generate predictions from the database.",

        )
