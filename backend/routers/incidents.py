from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.db import db
from core import security as sec
from core.audit import log_audit, notify, notify_followers
from core.incident_engine import can_transition, _add_status_history, ALLOWED_TRANSITIONS
from models import StatusUpdateIn, AssignIn, NoteIn, ResolveIn

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _public_incident(inc: dict) -> dict:
    inc.pop("_id", None)
    inc.pop("possible_duplicates", None)
    return inc


@router.get("")
async def list_incidents(
    category: str = Query(None), severity: str = Query(None), status: str = Query(None),
    q: str = Query(None), page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
):
    query = {}
    if category:
        query["category"] = category
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}},
            {"location_description": {"$regex": q, "$options": "i"}},
        ]
    total = await db.incidents.count_documents(query)
    items = await db.incidents.find(query, {"_id": 0, "possible_duplicates": 0}) \
        .sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/{incident_id}")
async def get_incident(incident_id: str, request: Request):
    inc = await db.incidents.find_one({"incident_id": incident_id})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc = _public_incident(inc)
    history = await db.status_history.find({"incident_id": incident_id}, {"_id": 0}) \
        .sort("created_at", 1).to_list(100)
    inc["timeline"] = history
    inc["report_count"] = len(inc.get("report_ids", []))
    user = await sec.get_optional_user(request)
    if user:
        inc["confirmed_by_me"] = bool(await db.confirmations.find_one(
            {"incident_id": incident_id, "user_id": user["user_id"]}))
        inc["following"] = bool(await db.follows.find_one(
            {"incident_id": incident_id, "user_id": user["user_id"]}))
    return inc


@router.get("/{incident_id}/full")
async def incident_full(incident_id: str, user: dict = Depends(sec.require_roles("authority"))):
    inc = await db.incidents.find_one({"incident_id": incident_id}, {"_id": 0})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    reports = await db.reports.find({"incident_id": incident_id}, {"_id": 0}).to_list(200)
    for r in reports:
        if r.get("ai_analysis_id"):
            r["ai_analysis"] = await db.ai_analyses.find_one({"id": r["ai_analysis_id"]}, {"_id": 0})
    notes = await db.incident_notes.find({"incident_id": incident_id}, {"_id": 0}) \
        .sort("created_at", -1).to_list(100)
    history = await db.status_history.find({"incident_id": incident_id}, {"_id": 0}) \
        .sort("created_at", 1).to_list(100)
    return {"incident": inc, "reports": reports, "notes": notes, "timeline": history,
            "allowed_transitions": ALLOWED_TRANSITIONS.get(inc["status"], [])}


@router.post("/{incident_id}/confirm")
async def confirm(incident_id: str, user: dict = Depends(sec.get_current_user)):
    inc = await db.incidents.find_one({"incident_id": incident_id})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    existing = await db.confirmations.find_one({"incident_id": incident_id, "user_id": user["user_id"]})
    if existing:
        return {"confirmed": True, "confirmation_count": inc.get("confirmation_count", 0)}
    await db.confirmations.insert_one({
        "incident_id": incident_id, "user_id": user["user_id"], "created_at": _now()})
    await db.incidents.update_one({"incident_id": incident_id}, {"$inc": {"confirmation_count": 1}})
    await log_audit(user, "incident.confirm", "incident", incident_id)
    return {"confirmed": True, "confirmation_count": inc.get("confirmation_count", 0) + 1}


@router.post("/{incident_id}/follow")
async def follow(incident_id: str, user: dict = Depends(sec.get_current_user)):
    inc = await db.incidents.find_one({"incident_id": incident_id})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    existing = await db.follows.find_one({"incident_id": incident_id, "user_id": user["user_id"]})
    if not existing:
        await db.follows.insert_one({"incident_id": incident_id, "user_id": user["user_id"],
                                     "created_at": _now()})
        await db.incidents.update_one({"incident_id": incident_id}, {"$inc": {"follower_count": 1}})
    return {"following": True}


@router.delete("/{incident_id}/follow")
async def unfollow(incident_id: str, user: dict = Depends(sec.get_current_user)):
    res = await db.follows.delete_one({"incident_id": incident_id, "user_id": user["user_id"]})
    if res.deleted_count:
        await db.incidents.update_one({"incident_id": incident_id, "follower_count": {"$gt": 0}},
                                      {"$inc": {"follower_count": -1}})
    return {"following": False}


@router.patch("/{incident_id}/status")
async def update_status(incident_id: str, payload: StatusUpdateIn,
                        user: dict = Depends(sec.require_roles("authority"))):
    inc = await db.incidents.find_one({"incident_id": incident_id})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    current = inc["status"]
    target = payload.status
    if not can_transition(current, target):
        raise HTTPException(status_code=400, detail=f"Cannot move from {current} to {target}")
    updates = {"status": target, "updated_at": _now()}
    if target == "verified":
        updates["verified_at"] = _now()
    if target == "resolved":
        updates["resolved_at"] = _now()
        if payload.note:
            updates["resolution_note"] = payload.note
    await db.incidents.update_one({"incident_id": incident_id}, {"$set": updates})
    await _add_status_history(incident_id, current, target, user, payload.note)
    await log_audit(user, "incident.status_change", "incident", incident_id,
                    {"from": current, "to": target})
    await notify_followers(incident_id, "incident_status",
                           f"Incident {inc.get('code')} updated",
                           f"Status changed to {target.replace('_', ' ')}.")
    return {"status": target}


@router.post("/{incident_id}/assign")
async def assign(incident_id: str, payload: AssignIn,
                 user: dict = Depends(sec.require_roles("authority"))):
    inc = await db.incidents.find_one({"incident_id": incident_id})
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    dept = await db.departments.find_one({"key": payload.department, "active": True})
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department")
    updates = {"assigned_department": payload.department, "assigned_staff": payload.staff_id,
               "assigned_at": _now(), "updated_at": _now()}
    if inc["status"] == "verified":
        updates["status"] = "assigned"
    await db.incidents.update_one({"incident_id": incident_id}, {"$set": updates})
    if inc["status"] == "verified":
        await _add_status_history(incident_id, "verified", "assigned", user,
                                  f"Assigned to {dept['name']}")
    await log_audit(user, "incident.assign", "incident", incident_id, {"department": payload.department})
    await notify_followers(incident_id, "incident_assigned",
                           f"Incident {inc.get('code')} assigned",
                           f"Assigned to {dept['name']}.")
    return {"assigned_department": payload.department, "status": updates.get("status", inc["status"])}


@router.get("/{incident_id}/notes")
async def get_notes(incident_id: str, user: dict = Depends(sec.require_roles("authority"))):
    notes = await db.incident_notes.find({"incident_id": incident_id}, {"_id": 0}) \
        .sort("created_at", -1).to_list(100)
    return notes


@router.post("/{incident_id}/notes")
async def add_note(incident_id: str, payload: NoteIn,
                   user: dict = Depends(sec.require_roles("authority"))):
    import uuid
    note = {"id": str(uuid.uuid4()), "incident_id": incident_id, "note": payload.note,
            "author_id": user["user_id"], "author_name": user["name"], "created_at": _now()}
    await db.incident_notes.insert_one(dict(note))
    await log_audit(user, "incident.note", "incident", incident_id)
    note.pop("_id", None)
    return note
