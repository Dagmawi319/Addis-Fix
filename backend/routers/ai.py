import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core import security as sec
from core.ai import analyze_image, ai_available
from core.storage import get_object

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
async def status():
    return {"available": ai_available()}


@router.post("/analyze/{file_id}")
async def analyze(file_id: str, user: dict = Depends(sec.get_current_user)):
    f = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, _ = get_object(f["storage_path"])
        result = await analyze_image(data, f["content_type"])
    except Exception:
        result = {"available": False, "message": "AI analysis is currently unavailable."}
    ai_id = str(uuid.uuid4())
    await db.ai_analyses.insert_one({
        "id": ai_id, "file_id": file_id, "report_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(), **result})
    return {"id": ai_id, **result}
