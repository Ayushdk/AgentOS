from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from .config import settings


@lru_cache
def engine():
    return create_engine(
        settings().database_url,
        pool_size=3,
        max_overflow=1,
        pool_pre_ping=True,
        connect_args={"options": "-c timezone=UTC -c statement_timeout=10000"},
    )


@contextmanager
def transaction():
    with Session(engine(), expire_on_commit=False) as session:
        with session.begin():
            yield session
