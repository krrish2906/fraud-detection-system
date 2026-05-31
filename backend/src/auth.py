import os
import hashlib
import jwt
import datetime
from typing import Optional
from fastapi import Header, HTTPException

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-fraud-guard-x921")
JWT_ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    """
    Hashes a password securely using PBKDF2-HMAC-SHA256.
    Returns a salt and hash joined by a '$'.
    """
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifies a password against its salt-based PBKDF2 hash.
    """
    try:
        salt, original_hash = hashed_password.split("$")
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return new_hash == original_hash
    except (ValueError, AttributeError):
        return False


def generate_token(user_id: int, username: str) -> str:
    """
    Generates a JWT token containing user info, valid for 7 days.
    """
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT token. Returns payload or None if invalid.
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_current_user(authorization: Optional[str] = Header(None)) -> int:
    """
    FastAPI Dependency to enforce authentication via Bearer token.
    Returns the authenticated user_id integer.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing")
        
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
        
    try:
        token = authorization.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid authorization token format")
        
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
    return payload["user_id"]
