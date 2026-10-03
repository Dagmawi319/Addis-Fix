import uuid
import hashlib
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends, BackgroundTasks

from core import config
from core.db import db
from core import security as sec
from core.audit import log_audit
from core.mail import create_reset_token, send_password_reset_email
from models import RegisterIn, LoginIn, ForgotIn, ResetIn

router = APIRouter(prefix="/api/auth", tags=["auth"])

GENERIC_RESET = {"message": "If that email is registered, a reset link has been sent."}


def _public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "name": u.get("name"),
        "email": u.get("email"),
        "role": u.get("role"),
        "status": u.get("status", "active"),
        "picture": u.get("picture"),
        "notification_preferences": u.get("notification_preferences", {"inapp": True, "email": False}),
        "is_demo": u.get("is_demo", False),
        "created_at": u.get("created_at"),
    }


async def _create_user(name, email, password=None, role="citizen", picture=None):
    user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "name": name,
        "email": email.lower(),
        "password_hash": sec.hash_password(password) if password else None,
        "role": role,
        "status": "active",
        "picture": picture,
        "notification_preferences": {"inapp": True, "email": False},
        "token_version": 0,
        "is_demo": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return user


@router.post("/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "admin" if email == config.ADMIN_EMAIL else "citizen"
    user = await _create_user(payload.name, email, payload.password, role=role)
    access = sec.create_access_token(user["user_id"], email, 0)
    refresh = sec.create_refresh_token(user["user_id"], 0)
    sec.set_auth_cookies(response, access, refresh)
    await log_audit(user, "user.register", "user", user["user_id"])
    return _public_user(user)


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "?"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not sec.verify_password(payload.password, user.get("password_hash") or ""):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1},
             "$set": {"email": email,
                      "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Account disabled")

    await db.login_attempts.delete_many({"identifier": identifier})
    ver = user.get("token_version", 0)
    access = sec.create_access_token(user["user_id"], email, ver)
    refresh = sec.create_refresh_token(user["user_id"], ver)
    sec.set_auth_cookies(response, access, refresh)
    await log_audit(user, "user.login", "user", user["user_id"])
    return _public_user(user)


@router.post("/logout")
async def logout(response: Response, request: Request):
    user = await sec.get_optional_user(request)
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    sec.clear_auth_cookies(response)
    if user:
        await log_audit(user, "user.logout", "user", user["user_id"])
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(sec.get_current_user)):
    return _public_user(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    import jwt
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user or payload.get("ver", 0) != user.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Session expired")
    access = sec.create_access_token(user["user_id"], user["email"], user.get("token_version", 0))
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=1800, path="/")
    return _public_user(user)


@router.post("/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
            )
        r.raise_for_status()
        data = r.json()
    except Exception:
        raise HTTPException(status_code=401, detail="Google authentication failed")

    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        role = "admin" if email == config.ADMIN_EMAIL else "citizen"
        user = await _create_user(data.get("name", email), email, password=None,
                                  role=role, picture=data.get("picture"))
    elif data.get("picture") and not user.get("picture"):
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"picture": data["picture"]}})
        user["picture"] = data["picture"]

    session_token = data.get("session_token") or secrets_token()
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sec.set_session_cookie(response, session_token)
    await log_audit(user, "user.login_google", "user", user["user_id"])
    return _public_user(user)


def secrets_token():
    import secrets
    return secrets.token_urlsafe(32)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotIn, background_tasks: BackgroundTasks):
    email = payload.email.lower()
    now = datetime.now(timezone.utc)
    await db.password_reset_requests.insert_one({"email": email, "created_at": now})
    recent = await db.password_reset_requests.count_documents({
        "email": email, "created_at": {"$gt": now - timedelta(minutes=15)}})
    if recent > 5:
        return GENERIC_RESET
    user = await db.users.find_one({"email": email})
    if not user:
        return GENERIC_RESET
    token = await create_reset_token(user)
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return GENERIC_RESET


@router.post("/reset-password")
async def reset_password(payload: ResetIn):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    claimed = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": token_hash, "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True}},
    )
    if not claimed:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    await db.users.update_one(
        {"user_id": claimed["user_id"]},
        {"$set": {"password_hash": sec.hash_password(payload.password),
                  "updated_at": now.isoformat()},
         "$inc": {"token_version": 1}},
    )
    await db.password_reset_tokens.delete_many(
        {"user_id": claimed["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": claimed["email"]})
    return {"message": "Password updated. You can now sign in."}
