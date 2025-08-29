import asyncio

from app.core.logging import logger
from app.services.embbedings import Collection, CollectionsManager

SYSTEM_COLLECTIONS = [
    {"name": "database_schema", "metadata": {"description": "Database schema reference"}},
    {"name": "sql_queries", "metadata": {"description": "Few-shot SQL examples"}},
]
system_id = "root"


async def create_system_collections():
    existing = [c for c in await CollectionsManager(user_id=system_id).list()]
    for c in SYSTEM_COLLECTIONS:
        if not any(col["name"] == c["name"] for col in existing):
            await CollectionsManager(user_id=system_id).create(c["name"], c["metadata"])
            logger.info(f"Created System Collection: {c['name']}")
    print(await get_root_collection_by_name("database_schema"))


async def get_root_collection_by_name(name: str) -> Collection:
    manager = CollectionsManager(user_id=system_id)
    collections = await manager.list()
    col = next((c for c in collections if c["name"] == name), None)
    if not col:
        logger.error(f"System collection : '{name}' not found")
    return Collection(collection_id=col["uuid"], user_id=system_id)


if __name__ == "__main__":
    asyncio.run(create_system_collections())
