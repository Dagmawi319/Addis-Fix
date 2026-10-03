import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends

from core import config
from core.db import db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, token_version: int = 0) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "ver": token_version,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    payload = {
        "sub": user_id,
        "ver": token_version,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=True,
                        samesite="none", max_age=1800, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


def set_session_cookie(response, session_token: str):
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


def clear_auth_cookies(response):
    for k in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(k, path="/")


async def _user_from_jwt(token: str):
    payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    if payload.get("type") != "access":
        return None
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        return None
    if payload.get("ver", 0) != user.get("token_version", 0):
        return None
    return user


async def _user_from_session(session_token: str):
    sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


async def _resolve_user(request: Request):
    token = request.cookies.get("access_token")
    bearer = None
    ah = request.headers.get("Authorization", "")
    if ah.startswith("Bearer "):
        bearer = ah[7:]
    user = None
    for t in (token, bearer):
        if not t:
            continue
        try:
            user = await _user_from_jwt(t)
        except Exception:
            user = None
        if user:
            return user
    st = request.cookies.get("session_token") or bearer
    if st:
        user = await _user_from_session(st)
    return user


async def get_current_user(request: Request) -> dict:
    user = await _resolve_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Account disabled")
    user.pop("password_hash", None)
    return user


async def get_optional_user(request: Request):
    try:
        user = await _resolve_user(request)
        if user:
            user.pop("password_hash", None)
        return user
    except Exception:
        return None


def require_roles(*roles):
    allowed = set(roles)
    allowed.add("admin")

    async def dependency(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency
