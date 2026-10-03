import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core import security as sec
from core.audit import log_audit
from models import CategoryIn, DepartmentIn

router = APIRouter(prefix="/api", tags=["meta"])


def _slug(name: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in name.lower()).strip("_")


@router.get("/categories")
async def list_categories(all: bool = False):
    q = {} if all else {"active": True}
    return await db.categories.find(q, {"_id": 0}).sort("name", 1).to_list(100)


@router.post("/categories")
async def create_category(payload: CategoryIn, user: dict = Depends(sec.require_roles("admin"))):
    key = payload.key or _slug(payload.name)
    if await db.categories.find_one({"key": key}):
        raise HTTPException(status_code=400, detail="Category key already exists")
    doc = {"id": str(uuid.uuid4()), "key": key, "name": payload.name, "color": payload.color,
           "active": payload.active, "is_demo": False,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.categories.insert_one(dict(doc))
    await log_audit(user, "category.create", "category", key)
    doc.pop("_id", None)
    return doc


@router.put("/categories/{key}")
async def update_category(key: str, payload: CategoryIn, user: dict = Depends(sec.require_roles("admin"))):
    res = await db.categories.update_one(
        {"key": key},
        {"$set": {"name": payload.name, "color": payload.color, "active": payload.active}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Category not found")
    await log_audit(user, "category.update", "category", key)
    return await db.categories.find_one({"key": key}, {"_id": 0})


@router.get("/departments")
async def list_departments(all: bool = False):
    q = {} if all else {"active": True}
    return await db.departments.find(q, {"_id": 0}).sort("name", 1).to_list(100)


@router.post("/departments")
async def create_department(payload: DepartmentIn, user: dict = Depends(sec.require_roles("admin"))):
    key = payload.key or _slug(payload.name)
    if await db.departments.find_one({"key": key}):
        raise HTTPException(status_code=400, detail="Department key already exists")
    doc = {"id": str(uuid.uuid4()), "key": key, "name": payload.name,
           "description": payload.description, "active": payload.active, "is_demo": False,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.departments.insert_one(dict(doc))
    await log_audit(user, "department.create", "department", key)
    doc.pop("_id", None)
    return doc


@router.put("/departments/{key}")
async def update_department(key: str, payload: DepartmentIn, user: dict = Depends(sec.require_roles("admin"))):
    res = await db.departments.update_one(
        {"key": key},
        {"$set": {"name": payload.name, "description": payload.description, "active": payload.active}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Department not found")
    await log_audit(user, "department.update", "department", key)
    return await db.departments.find_one({"key": key}, {"_id": 0})
