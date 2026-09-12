import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import auth, dev, listings, renter, social
from seed import ensure_seeded

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ensure_seeded(keep=os.environ.get("SUBSWIPE_KEEP_DB") == "1")
    yield


app = FastAPI(title="SubSwipe API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

for r in (auth.router, renter.router, listings.router, social.router, dev.router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"ok": True}
