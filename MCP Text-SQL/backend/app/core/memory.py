from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from langgraph.checkpoint.postgres.aio import (
    AsyncPostgresSaver,  # short-term memory : checkpoints -> resume conversations
)
from langgraph.store.postgres.aio import (
    AsyncPostgresStore,  # long-term memory : semantic, procedural and episodic
)
from langmem import ReflectionExecutor, create_memory_store_manager
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.core.config import settings
from app.core.logging import logger
import os

_pool: asyncpg.Pool | None = None

os.environ["OPENAI_API_KEY"] = settings.LLM_API_KEY

@asynccontextmanager
async def init_memory() -> AsyncGenerator[dict[str, AsyncPostgresSaver], None]:
    uri = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    pool = AsyncConnectionPool(conninfo=uri, kwargs={"autocommit": True, "row_factory": dict_row})
    async with pool:
        checkpointer = AsyncPostgresSaver(pool)
        store = AsyncPostgresStore(pool, index={"embed": settings.DEFAULT_EMBEDDINGS, "dims": 1536})
        await checkpointer.setup()
        await store.setup()

        # create a memory manager
        memory_manager = create_memory_store_manager(
            settings.LLM_MODEL_NAME,
            namespace=("memories",),
            store=store,
        )

        # this is to allow memory saving to run in the background
        reflection_executor = ReflectionExecutor(memory_manager)
        logger.info("Agent memory initialized")

        yield {
            "checkpointer": checkpointer,
            "store": store,
            "reflection_executor": reflection_executor,
        }
