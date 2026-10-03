from fastapi import APIRouter, Depends, Query
from core.db import db
from core import security as sec

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(unread: bool = Query(False), user: dict = Depends(sec.get_current_user)):
    q = {"user_id": user["user_id"]}
    if unread:
        q["read"] = False
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    count = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread_count": count}


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(sec.get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["user_id"]},
                                      {"$set": {"read": True}})
    return {"ok": True}


@router.post("/read-all")
async def mark_all(user: dict = Depends(sec.get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"], "read": False},
                                       {"$set": {"read": True}})
    return {"ok": True}
