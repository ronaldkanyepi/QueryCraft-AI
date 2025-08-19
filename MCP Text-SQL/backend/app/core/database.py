from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional, Union

import asyncpg
import sqlalchemy
from langchain_core.embeddings import Embeddings
from langchain_postgres.vectorstores import PGVector
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from loguru import logger
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from sqlalchemy import Engine, create_engine
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import settings

_pool: asyncpg.Pool | None = None


async def get_db_pool() -> asyncpg.Pool:
    """Get the pg connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            database=settings.DB_NAME,
        )
        logger.info("Database connection pool created using parsed URL components.")
    return _pool


async def close_db_pool():
    """Close the pg connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            yield conn
        finally:
            await conn.close()


def get_vectorstore_engine() -> Engine:
    engine = create_engine(settings.DATABASE_URL)
    return engine


DBConnection = Union[sqlalchemy.engine.Engine, str]


def get_vectorstore(
    collection_name: str = settings.DEFAULT_COLLECTION_NAME,
    embeddings: Embeddings = settings.DEFAULT_EMBEDDINGS,
    engine: Optional[Union[DBConnection, Engine, AsyncEngine]] = None,
    collection_metadata: Optional[dict[str, Any]] = None,
) -> PGVector:
    """Initializes and returns a PGVector store for a specific collection,
    using an existing engine or creating one from connection parameters.
    """
    if engine is None:
        engine = get_vectorstore_engine()

    store = PGVector(
        embeddings=embeddings,
        collection_name=collection_name,
        connection=engine,
        use_jsonb=True,
        collection_metadata=collection_metadata,
    )
    return store


@asynccontextmanager
async def database_lifespan() -> AsyncIterator[AsyncPostgresSaver]:
    uri = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

    pool = AsyncConnectionPool(conninfo=uri, kwargs={"autocommit": True, "row_factory": dict_row})
    async with pool:
        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()
        yield checkpointer
