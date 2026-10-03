import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-insecure-secret")
JWT_ALGORITHM = "HS256"

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "gpt-4o-mini")

EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "AddisFix")

INTEGRATION_PROXY_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"

APP_NAME = "addisfix"

ROLES = ("citizen", "authority", "admin")
