import uuid
import logging
from datetime import datetime, timezone, timedelta

from core import config
from core.db import db
from core import security as sec
from core.incident_engine import next_incident_code

logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    ("roads", "Roads", "#EF4444"),
    ("potholes", "Potholes", "#F97316"),
    ("waste", "Waste", "#10B981"),
    ("water", "Water", "#06B6D4"),
    ("drainage", "Drainage", "#3B82F6"),
    ("streetlights", "Streetlights", "#8B5CF6"),
    ("electricity", "Electricity", "#F59E0B"),
    ("traffic", "Traffic", "#EC4899"),
    ("sidewalks", "Sidewalks", "#14B8A6"),
    ("public_property", "Public Property", "#A855F7"),
    ("illegal_dumping", "Illegal Dumping", "#84CC16"),
    ("environmental", "Environmental", "#22C55E"),
    ("other", "Other", "#64748B"),
]

DEFAULT_DEPARTMENTS = [
    ("roads", "Roads", "Road surface and pavement works"),
    ("waste_management", "Waste Management", "Garbage collection and dumping"),
    ("water", "Water", "Water supply and leakage"),
    ("drainage", "Drainage", "Storm drains and sewage"),
    ("street_lighting", "Street Lighting", "Public lighting maintenance"),
    ("traffic", "Traffic", "Traffic signals and signage"),
    ("public_works", "Public Works", "General infrastructure"),
    ("environmental", "Environmental Services", "Environmental and sanitation"),
]


async def seed_meta():
    for key, name, color in DEFAULT_CATEGORIES:
        await db.categories.update_one(
            {"key": key},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "key": key, "name": name, "color": color,
                              "active": True, "is_demo": False,
                              "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True)
    for key, name, desc in DEFAULT_DEPARTMENTS:
        await db.departments.update_one(
            {"key": key},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "key": key, "name": name, "description": desc,
                              "active": True, "is_demo": False,
                              "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True)


async def seed_admin():
    existing = await db.users.find_one({"email": config.ADMIN_EMAIL})
    now = datetime.now(timezone.utc).isoformat()
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": "AddisFix Admin",
            "email": config.ADMIN_EMAIL,
            "password_hash": sec.hash_password(config.ADMIN_PASSWORD),
            "role": "admin", "status": "active", "picture": None,
            "notification_preferences": {"inapp": True, "email": False},
            "token_version": 0, "is_demo": False, "created_at": now, "updated_at": now,
        })
    else:
        updates = {"role": "admin"}
        if not sec.verify_password(config.ADMIN_PASSWORD, existing.get("password_hash") or ""):
            updates["password_hash"] = sec.hash_password(config.ADMIN_PASSWORD)
        await db.users.update_one({"email": config.ADMIN_EMAIL}, {"$set": updates})


def _now_iso(days_ago=0, hours_ago=0):
    return (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)).isoformat()


DEMO_USERS = [
    ("Abebe Kebede", "demo.abebe@addisfix.demo", "citizen"),
    ("Sara Tesfaye", "demo.sara@addisfix.demo", "citizen"),
    ("Dawit Alemu", "demo.dawit@addisfix.demo", "citizen"),
    ("Hanna Girma", "demo.authority@addisfix.demo", "authority"),
]

# (title, category, severity, lat, lng, location, status, desc, reports, confirmations)
DEMO_INCIDENTS = [
    ("Large pothole on Bole Road", "potholes", "high", 9.0105, 38.7612, "Bole, Addis Ababa",
     "in_progress", "A large, deep pothole on the main lane causing hazard to vehicles.", 37, 32),
    ("Overflowing waste container", "waste", "high", 9.0125, 38.7470, "Meskel Square",
     "verified", "Waste container overflowing onto the sidewalk for several days.", 24, 18),
    ("Water leak on main pipe", "water", "medium", 9.0215, 38.7560, "Addis Ketema",
     "assigned", "Continuous water leakage flooding the road near the junction.", 19, 11),
    ("Broken streetlight", "streetlights", "medium", 9.0050, 38.7700, "Megenagna",
     "reported", "Streetlight not working, area very dark at night.", 12, 7),
    ("Damaged sidewalk", "sidewalks", "low", 9.0300, 38.7400, "Lideta",
     "resolved", "Cracked and uneven sidewalk making walking difficult.", 7, 5),
    ("Blocked storm drain", "drainage", "high", 8.9980, 38.7800, "Kirkos",
     "under_review", "Storm drain fully blocked, risk of flooding in rainy season.", 9, 4),
]

STATUS_FLOW = ["reported", "under_review", "verified", "assigned", "in_progress", "resolved"]


async def seed_demo():
    if await db.incidents.count_documents({"is_demo": True}) > 0:
        return
    # demo users
    user_ids = []
    for name, email, role in DEMO_USERS:
        u = await db.users.find_one({"email": email})
        if not u:
            uid = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": uid, "name": name, "email": email,
                "password_hash": sec.hash_password("Demo@2026"), "role": role,
                "status": "active", "picture": None,
                "notification_preferences": {"inapp": True, "email": False},
                "token_version": 0, "is_demo": True,
                "created_at": _now_iso(20), "updated_at": _now_iso(20)})
            user_ids.append(uid)
        else:
            user_ids.append(u["user_id"])

    for idx, (title, cat, sev, lat, lng, loc, status, desc, reps, confs) in enumerate(DEMO_INCIDENTS):
        inc_id = f"inc_{uuid.uuid4().hex[:12]}"
        code = await next_incident_code()
        created = _now_iso(days_ago=10 - idx)
        await db.incidents.insert_one({
            "incident_id": inc_id, "code": code, "title": title, "description": desc,
            "category": cat, "severity": sev, "latitude": lat, "longitude": lng,
            "location_description": loc, "representative_image_id": None,
            "report_ids": [], "confirmation_count": confs, "follower_count": max(2, confs // 4),
            "assigned_department": cat if status in ("assigned", "in_progress", "resolved") else None,
            "assigned_staff": None, "status": status, "possible_duplicates": [],
            "resolution_note": "Issue addressed by the assigned team." if status == "resolved" else None,
            "is_demo": True, "created_at": created, "updated_at": _now_iso(hours_ago=2),
            "verified_at": _now_iso(days_ago=8 - idx) if STATUS_FLOW.index(status if status in STATUS_FLOW else "reported") >= 2 else None,
            "assigned_at": _now_iso(days_ago=6 - idx) if status in ("assigned", "in_progress", "resolved") else None,
            "resolved_at": _now_iso(days_ago=1) if status == "resolved" else None,
        })
        # status history up to current
        if status in STATUS_FLOW:
            flow = STATUS_FLOW[: STATUS_FLOW.index(status) + 1]
        else:
            flow = ["reported"]
        prev = None
        for i, s in enumerate(flow):
            await db.status_history.insert_one({
                "id": str(uuid.uuid4()), "incident_id": inc_id, "from_status": prev,
                "to_status": s, "actor_id": None, "actor_role": "system" if i == 0 else "authority",
                "note": None, "created_at": _now_iso(days_ago=10 - idx - i)})
            prev = s
        # a couple of demo reports per incident
        report_ids = []
        for j in range(min(3, reps)):
            rid = f"rep_{uuid.uuid4().hex[:12]}"
            report_ids.append(rid)
            reporter = user_ids[(idx + j) % len(user_ids)]
            await db.reports.insert_one({
                "report_id": rid, "reporter_id": reporter, "reporter_name": "Demo Citizen",
                "title": title, "description": desc, "category": cat, "subcategory": None,
                "severity": sev, "image_ids": [], "latitude": lat + j * 0.0002, "longitude": lng + j * 0.0002,
                "location_description": loc, "status": "verified" if status != "reported" else "submitted",
                "incident_id": inc_id, "ai_analysis_id": None,
                "review_state": "verified" if status != "reported" else "pending",
                "is_demo": True, "created_at": _now_iso(days_ago=10 - idx),
                "updated_at": _now_iso(days_ago=9 - idx)})
        await db.incidents.update_one({"incident_id": inc_id}, {"$set": {"report_ids": report_ids}})
    logger.info("Demo data seeded")


async def run_all_seeds():
    await seed_meta()
    await seed_admin()
    await seed_demo()
