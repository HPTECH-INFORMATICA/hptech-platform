from sqlalchemy import create_engine, text

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"connect_timeout": 5},
    pool_pre_ping=True,
    pool_timeout=5,
)


def test_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return True
