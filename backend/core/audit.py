import uuid
from datetime import datetime, timezone
from core.db import db


async def log_audit(actor: dict, action: str, target_type: str = None,
                    target_id: str = None, metadata: dict = None):
    doc = {
        "id": str(uuid.uuid4()),
        "actor_id": actor.get("user_id") if actor else None,
        "actor_name": actor.get("name") if actor else "system",
        "actor_role": actor.get("role") if actor else "system",
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.audit_logs.insert_one(doc)


async def notify(user_id: str, ntype: str, title: str, message: str,
                 incident_id: str = None, report_id: str = None):
    if not user_id:
        return
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "message": message,
        "incident_id": incident_id,
        "report_id": report_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)


async def notify_followers(incident_id: str, ntype: str, title: str, message: str, exclude: str = None):
    cursor = db.follows.find({"incident_id": incident_id}, {"_id": 0, "user_id": 1})
    async for f in cursor:
        uid = f["user_id"]
        if uid == exclude:
            continue
        await notify(uid, ntype, title, message, incident_id=incident_id)
