import os
from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = os.environ.get("SUBSWIPE_DB", os.path.join(os.path.dirname(__file__), "subswipe.db"))
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


def create_db() -> None:
    SQLModel.metadata.create_all(engine)


def drop_db() -> None:
    SQLModel.metadata.drop_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine, expire_on_commit=False) as session:
        yield session
