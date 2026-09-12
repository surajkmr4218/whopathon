from fastapi import APIRouter
from sqlmodel import Session

from database import create_db, drop_db, engine
from seed import run

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/reset")
def reset():
    drop_db()
    create_db()
    with Session(engine) as s:
        run(s)
    return {"ok": True}
