import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query

from core.db import db
from core import security as sec
from core.ai import analyze_image
from core.storage import get_object
from core.audit import log_audit, notify
from core.incident_engine import process_report
from models import ReportIn

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _now():
    return datetime.now(timezone.utc).isoformat()


async def _enrich(report: dict) -> dict:
    report.pop("_id", None)
    if report.get("ai_analysis_id"):
        ai = await db.ai_analyses.find_one({"id": report["ai_analysis_id"]}, {"_id": 0})
        report["ai_analysis"] = ai
    inc = await db.incidents.find_one({"incident_id": report.get("incident_id")},
                                      {"_id": 0, "incident_id": 1, "code": 1, "status": 1, "title": 1})
    report["incident"] = inc
    return report


@router.post("")
async def create_report(payload: ReportIn, user: dict = Depends(sec.get_current_user)):
    cat = await db.categories.find_one({"key": payload.category, "active": True})
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category")

    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    report = {
        "report_id": report_id,
        "reporter_id": user["user_id"],
        "reporter_name": user["name"],
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "subcategory": payload.subcategory,
        "severity": payload.severity,
        "image_ids": payload.image_ids,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "location_description": payload.location_description or "",
        "status": "submitted",
        "incident_id": None,
        "ai_analysis_id": None,
        "review_state": "pending",
        "is_demo": False,
        "created_at": _now(),
        "updated_at": _now(),
    }

    # AI analysis (server-side, assistive only, truthful fallback).
    # Reuse a preview analysis for this image if one exists to avoid a duplicate model call.
    ai_id = None
    if payload.image_ids:
        existing = await db.ai_analyses.find_one(
            {"file_id": payload.image_ids[0]}, {"_id": 0}, sort=[("created_at", -1)])
        if existing:
            ai_id = existing["id"]
            await db.ai_analyses.update_one({"id": ai_id}, {"$set": {"report_id": report_id}})
    if not ai_id:
        ai_result = {"available": False, "message": "AI analysis is currently unavailable."}
        if payload.image_ids:
            f = await db.files.find_one({"id": payload.image_ids[0], "is_deleted": False}, {"_id": 0})
            if f:
                try:
                    data, _ = get_object(f["storage_path"])
                    ai_result = await analyze_image(data, f["content_type"])
                except Exception:
                    ai_result = {"available": False, "message": "AI analysis is currently unavailable."}
        ai_id = str(uuid.uuid4())
        await db.ai_analyses.insert_one({"id": ai_id, "report_id": report_id,
                                         "file_id": (payload.image_ids or [None])[0],
                                         "created_at": _now(), **ai_result})
    report["ai_analysis_id"] = ai_id

    await db.reports.insert_one(dict(report))

    match = await process_report(report)
    await db.reports.update_one({"report_id": report_id},
                                {"$set": {"incident_id": match["incident_id"], "updated_at": _now()}})
    report["incident_id"] = match["incident_id"]

    await log_audit(user, "report.create", "report", report_id,
                    {"incident_id": match["incident_id"], "linked": match["linked"]})
    await notify(user["user_id"], "report_received", "Report received",
                 f"Your report '{payload.title}' was received and is being processed.",
                 incident_id=match["incident_id"], report_id=report_id)

    out = await _enrich(await db.reports.find_one({"report_id": report_id}))
    out["match"] = match
    return out


@router.get("/mine")
async def my_reports(status: str = Query(None), user: dict = Depends(sec.get_current_user)):
    q = {"reporter_id": user["user_id"]}
    if status:
        q["status"] = status
    reports = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for r in reports:
        await _enrich(r)
    return reports


@router.get("/{report_id}")
async def get_report(report_id: str, user: dict = Depends(sec.get_current_user)):
    report = await db.reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if user["role"] == "citizen" and report["reporter_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    return await _enrich(report)


# Authority/admin: list and review reports
@router.get("")
async def list_reports(
    status: str = Query(None), category: str = Query(None), q: str = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(sec.require_roles("authority")),
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"location_description": {"$regex": q, "$options": "i"}}]
    total = await db.reports.count_documents(query)
    items = await db.reports.find(query, {"_id": 0}).sort("created_at", -1) \
        .skip((page - 1) * limit).limit(limit).to_list(limit)
    for r in items:
        if r.get("ai_analysis_id"):
            r["ai_analysis"] = await db.ai_analyses.find_one({"id": r["ai_analysis_id"]}, {"_id": 0})
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.patch("/{report_id}/review")
async def review_report(report_id: str, body: dict,
                        user: dict = Depends(sec.require_roles("authority"))):
    state = body.get("review_state")
    if state not in ("verified", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid review state")
    report = await db.reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    new_status = {"verified": "verified", "rejected": "rejected", "pending": "under_review"}[state]
    await db.reports.update_one({"report_id": report_id},
                                {"$set": {"review_state": state, "status": new_status, "updated_at": _now()}})
    await log_audit(user, f"report.{state}", "report", report_id)
    await notify(report["reporter_id"], f"report_{state}",
                 f"Report {state}", f"Your report '{report['title']}' was marked {state}.",
                 incident_id=report.get("incident_id"), report_id=report_id)
    return {"message": "Updated", "review_state": state}
