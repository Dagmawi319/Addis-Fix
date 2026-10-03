import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Response, Query

from core.db import db
from core import security as sec
from core import storage

router = APIRouter(prefix="/api", tags=["uploads"])

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 10 * 1024 * 1024


@router.post("/uploads")
async def upload(file: UploadFile = File(...), user: dict = Depends(sec.get_current_user)):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use JPEG, PNG, WEBP or GIF.")
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}[content_type]
    file_id = str(uuid.uuid4())
    path = f"{storage.config.APP_NAME}/uploads/{user['user_id']}/{file_id}.{ext}"
    try:
        result = storage.put_object(path, data, content_type)
    except Exception:
        raise HTTPException(status_code=503, detail="File storage is currently unavailable")
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "owner_id": user["user_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "content_type": content_type, "size": result.get("size", len(data))}


@router.get("/uploads/{file_id}/raw")
async def serve_file(file_id: str):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = storage.get_object(record["storage_path"])
    except Exception:
        raise HTTPException(status_code=503, detail="File storage is currently unavailable")
    return Response(content=data, media_type=record.get("content_type", ct),
                    headers={"Cache-Control": "public, max-age=86400"})
