import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .migrations import ensure_schema_upgrades
from .routers import (
    admin,
    auth,
    categories,
    dashboard,
    expenses,
    items,
    trash,
    users,
)
from .seed import seed_admin

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Sistema de Controle Financeiro", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, users, items, expenses, trash, categories, dashboard, admin):
    app.include_router(r.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_schema_upgrades(engine)
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

if FRONTEND_DIR.exists():
    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        return FileResponse(FRONTEND_DIR / "favicon.svg", media_type="image/svg+xml")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")

    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
