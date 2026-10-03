from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query

from core.db import db
from core import security as sec
from core.audit import log_audit
from models import RoleUpdateIn, UserStatusIn

router = APIRouter(prefix="/api", tags=["admin"])

STATUSES = ["reported", "under_review", "verified", "assigned", "in_progress", "resolved", "rejected"]
SEVERITIES = ["low", "medium", "high"]


@router.get("/authority/stats")
async def authority_stats(user: dict = Depends(sec.require_roles("authority"))):
    total_reports = await db.reports.count_documents({})
    awaiting = await db.reports.count_documents({"review_state": "pending"})
    by_status = {s: await db.incidents.count_documents({"status": s}) for s in STATUSES}
    by_severity = {s: await db.incidents.count_documents({"severity": s}) for s in SEVERITIES}
    cats = await db.categories.find({}, {"_id": 0, "key": 1, "name": 1, "color": 1}).to_list(100)
    by_category = []
    for c in cats:
        n = await db.incidents.count_documents({"category": c["key"]})
        if n:
            by_category.append({"key": c["key"], "name": c["name"], "color": c["color"], "count": n})
    recent = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    queue = await db.incidents.find({"status": {"$in": ["reported", "under_review", "verified"]}},
                                    {"_id": 0, "possible_duplicates": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {
        "total_reports": total_reports,
        "awaiting_review": awaiting,
        "total_incidents": await db.incidents.count_documents({}),
        "by_status": by_status,
        "by_severity": by_severity,
        "by_category": by_category,
        "recent_reports": recent,
        "assignment_queue": queue,
    }


@router.get("/admin/stats")
async def admin_stats(user: dict = Depends(sec.require_roles("admin"))):
    total = await db.incidents.count_documents({})
    open_count = await db.incidents.count_documents(
        {"status": {"$in": ["reported", "under_review", "verified", "assigned"]}})
    in_progress = await db.incidents.count_documents({"status": "in_progress"})
    resolved = await db.incidents.count_documents({"status": "resolved"})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_week = await db.incidents.count_documents({"created_at": {"$gt": week_ago}})
    priority = await db.incidents.find(
        {"status": {"$nin": ["resolved", "rejected"]}},
        {"_id": 0, "possible_duplicates": 0}).sort([("severity", -1), ("created_at", -1)]).limit(8).to_list(8)
    for p in priority:
        p["report_count"] = len(p.get("report_ids", []))
    return {
        "total_incidents": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "new_this_week": new_week,
        "total_users": await db.users.count_documents({}),
        "total_reports": await db.reports.count_documents({}),
        "priority_incidents": priority,
    }


@router.get("/admin/users")
async def list_users(q: str = Query(None), role: str = Query(None),
                     user: dict = Depends(sec.require_roles("admin"))):
    query = {}
    if role:
        query["role"] = role
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}},
                        {"email": {"$regex": q, "$options": "i"}}]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0, "token_version": 0}) \
        .sort("created_at", -1).to_list(500)
    return users


@router.patch("/admin/users/{user_id}/role")
async def set_role(user_id: str, payload: RoleUpdateIn, user: dict = Depends(sec.require_roles("admin"))):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": payload.role},
                                                     "$inc": {"token_version": 1}})
    await log_audit(user, "admin.role_change", "user", user_id, {"role": payload.role})
    return {"user_id": user_id, "role": payload.role}


@router.patch("/admin/users/{user_id}/status")
async def set_user_status(user_id: str, payload: UserStatusIn, user: dict = Depends(sec.require_roles("admin"))):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["email"] == user["email"]:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")
    await db.users.update_one({"user_id": user_id}, {"$set": {"status": payload.status},
                                                     "$inc": {"token_version": 1}})
    await log_audit(user, "admin.user_status", "user", user_id, {"status": payload.status})
    return {"user_id": user_id, "status": payload.status}


@router.get("/admin/audit-logs")
async def audit_logs(action: str = Query(None), q: str = Query(None),
                     page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
                     user: dict = Depends(sec.require_roles("admin"))):
    query = {}
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if q:
        query["$or"] = [{"actor_name": {"$regex": q, "$options": "i"}},
                        {"target_id": {"$regex": q, "$options": "i"}}]
    total = await db.audit_logs.count_documents(query)
    items = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1) \
        .skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit}
