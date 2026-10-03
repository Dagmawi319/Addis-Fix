from motor.motor_asyncio import AsyncIOMotorClient
from core import config

client = AsyncIOMotorClient(config.MONGO_URL)
db = client[config.DB_NAME]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("role")
    await db.user_sessions.create_index("session_token")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.reports.create_index("report_id", unique=True)
    await db.reports.create_index("reporter_id")
    await db.reports.create_index("status")
    await db.reports.create_index("incident_id")
    await db.reports.create_index("category")
    await db.incidents.create_index("incident_id", unique=True)
    await db.incidents.create_index("status")
    await db.incidents.create_index("category")
    await db.incidents.create_index([("latitude", 1), ("longitude", 1)])
    await db.confirmations.create_index([("incident_id", 1), ("user_id", 1)], unique=True)
    await db.follows.create_index([("incident_id", 1), ("user_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.status_history.create_index("incident_id")
    await db.audit_logs.create_index([("created_at", -1)])
    await db.categories.create_index("key", unique=True)
    await db.departments.create_index("key", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("email")
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
