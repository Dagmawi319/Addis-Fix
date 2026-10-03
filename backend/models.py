from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class ReportIn(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=5, max_length=2000)
    category: str
    subcategory: Optional[str] = None
    severity: str = "medium"
    image_ids: list[str] = []
    latitude: float
    longitude: float
    location_description: Optional[str] = ""

    @field_validator("severity")
    @classmethod
    def _sev(cls, v):
        if v not in ("low", "medium", "high"):
            raise ValueError("Invalid severity")
        return v


class StatusUpdateIn(BaseModel):
    status: str
    note: Optional[str] = None


class AssignIn(BaseModel):
    department: str
    staff_id: Optional[str] = None


class NoteIn(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


class ResolveIn(BaseModel):
    resolution_note: str = Field(min_length=1, max_length=2000)


class CategoryIn(BaseModel):
    name: str
    key: Optional[str] = None
    color: str = "#64748B"
    active: bool = True


class DepartmentIn(BaseModel):
    name: str
    key: Optional[str] = None
    description: Optional[str] = ""
    active: bool = True


class RoleUpdateIn(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def _role(cls, v):
        if v not in ("citizen", "authority", "admin"):
            raise ValueError("Invalid role")
        return v


class UserStatusIn(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _st(cls, v):
        if v not in ("active", "disabled"):
            raise ValueError("Invalid status")
        return v
