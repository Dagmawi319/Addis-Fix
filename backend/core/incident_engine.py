import math
import uuid
from datetime import datetime, timezone
from core.db import db

HIGH_CONFIDENCE_METERS = 75
POSSIBLE_MATCH_METERS = 250
SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3}


def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def next_incident_code() -> str:
    count = await db.incidents.count_documents({})
    return f"INC-{1000 + count + 1}"


def _now():
    return datetime.now(timezone.utc).isoformat()


async def _add_status_history(incident_id, from_status, to_status, actor, note=None):
    await db.status_history.insert_one({
        "id": str(uuid.uuid4()),
        "incident_id": incident_id,
        "from_status": from_status,
        "to_status": to_status,
        "actor_id": actor.get("user_id") if actor else None,
        "actor_role": actor.get("role") if actor else "system",
        "note": note,
        "created_at": _now(),
    })


async def process_report(report: dict) -> dict:
    """Decide whether a new report links to an existing incident or creates a new one.
    Returns {incident_id, linked, distance, suggestion}. Reports are never deleted."""
    cat = report["category"]
    lat, lng = report["latitude"], report["longitude"]
    candidates = await db.incidents.find(
        {"category": cat, "status": {"$nin": ["resolved", "rejected"]}},
        {"_id": 0},
    ).to_list(300)

    best, best_d = None, float("inf")
    for c in candidates:
        if c.get("latitude") is None or c.get("longitude") is None:
            continue
        d = haversine(lat, lng, c["latitude"], c["longitude"])
        if d < best_d:
            best, best_d = c, d

    if best and best_d <= HIGH_CONFIDENCE_METERS:
        inc_id = best["incident_id"]
        update = {
            "$addToSet": {"report_ids": report["report_id"]},
            "$set": {"updated_at": _now()},
        }
        if SEVERITY_RANK.get(report["severity"], 0) > SEVERITY_RANK.get(best.get("severity", "low"), 0):
            update["$set"]["severity"] = report["severity"]
        await db.incidents.update_one({"incident_id": inc_id}, update)
        return {"incident_id": inc_id, "linked": True, "distance": round(best_d, 1),
                "suggestion": None}

    # create a new incident
    code = await next_incident_code()
    inc_id = f"inc_{uuid.uuid4().hex[:12]}"
    suggestion = None
    if best and best_d <= POSSIBLE_MATCH_METERS:
        suggestion = {
            "incident_id": best["incident_id"],
            "code": best.get("code"),
            "distance": round(best_d, 1),
            "reason": "Nearby location + same category",
        }
    doc = {
        "incident_id": inc_id,
        "code": code,
        "title": report["title"],
        "description": report["description"],
        "category": cat,
        "severity": report["severity"],
        "latitude": lat,
        "longitude": lng,
        "location_description": report.get("location_description", ""),
        "representative_image_id": (report.get("image_ids") or [None])[0],
        "report_ids": [report["report_id"]],
        "confirmation_count": 0,
        "follower_count": 0,
        "assigned_department": None,
        "assigned_staff": None,
        "status": "reported",
        "possible_duplicates": [suggestion] if suggestion else [],
        "resolution_note": None,
        "is_demo": report.get("is_demo", False),
        "created_at": _now(),
        "updated_at": _now(),
        "verified_at": None,
        "assigned_at": None,
        "resolved_at": None,
    }
    await db.incidents.insert_one(doc)
    await _add_status_history(inc_id, None, "reported", None, "Incident created from report")
    return {"incident_id": inc_id, "linked": False, "distance": round(best_d, 1) if best else None,
            "suggestion": suggestion}


ALLOWED_TRANSITIONS = {
    "reported": ["under_review", "rejected"],
    "under_review": ["verified", "rejected"],
    "verified": ["assigned", "rejected"],
    "assigned": ["in_progress", "rejected"],
    "in_progress": ["resolved", "rejected"],
    "resolved": [],
    "rejected": [],
}


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, [])
