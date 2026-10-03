import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from core import config
from core.db import client, ensure_indexes
from core import storage
from seed import run_all_seeds

from routers import auth, uploads, reports, incidents, meta, notifications, admin, ai

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("addisfix")

app = FastAPI(title="AddisFix API", version="1.0.0")


@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_available": bool(config.EMERGENT_LLM_KEY and not config.EMERGENT_LLM_KEY.startswith("{"))}


for r in (auth.router, uploads.router, reports.router, incidents.router,
          meta.router, notifications.router, admin.router, ai.router):
    app.include_router(r)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    try:
        storage.init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await run_all_seeds()
    logger.info("AddisFix backend ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()
