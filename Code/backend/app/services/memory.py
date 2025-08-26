import asyncio
from typing import Any, Dict, List, Optional

from langchain_core.runnables import RunnableConfig

from app.core.logging import logger


class MemoryTools:
    def __init__(self, store, profile_reflection_executor, main_reflection_executor):
        self.store = store
        self.profile_reflection_executor = profile_reflection_executor
        self.main_reflection_executor = main_reflection_executor

    def _extract_user_config(self, config: RunnableConfig) -> tuple[str, str]:
        configurable = config["configurable"]
        return configurable["user_id"], configurable["thread_id"]

    async def get_semantic_memory(self, config: RunnableConfig) -> Optional[Dict[str, Any]]:
        user_id, _ = self._extract_user_config(config)
        results = await self.store.asearch(
            (
                "users",
                user_id,
                "profile",
            ),  # name space prefix - positional argument it should match that in app.core.memory initialization
            limit=1,
        )
        return results[0].value if results else None

    async def get_episodic_memory(
        self, config: RunnableConfig, limit: int = 5
    ) -> List[Dict[str, Any]]:
        user_id, _ = self._extract_user_config(config)
        results = await self.store.asearch(
            (
                "memories",
                user_id,
                "episodic",
            ),  # name space prefix - positional argument it should match that in app.core.memory initialization
            limit=limit,
        )
        return [ep.value for ep in results]

    async def get_procedural_memory(self, limit: int = 10) -> List[Dict[str, Any]]:
        results = await self.store.asearch(
            (
                "sql_patterns",
            ),  # name space prefix - positional argument it should match that in app.core.memory initialization
            limit=limit,
        )
        return [pattern.value for pattern in results]

    async def get_user_context(self, config: RunnableConfig) -> Dict[str, Any]:
        try:
            tasks = [
                self.get_semantic_memory(config),
                self.get_episodic_memory(config),
                self.get_procedural_memory(),
            ]

            # Execute all tasks concurrently
            profile, episodes, patterns = await asyncio.gather(*tasks, return_exceptions=True)

            return {
                "user_profile": profile if not isinstance(profile, Exception) else None,
                "recent_episodes": episodes if not isinstance(episodes, Exception) else [],
                "sql_patterns": patterns if not isinstance(patterns, Exception) else [],
            }
        except Exception:
            return {
                "user_profile": None,
                "recent_episodes": [],
                "sql_patterns": [],
            }

    def save_semantic_memory(
        self, content: Dict[str, Any], config: RunnableConfig, delay_seconds: int = 3
    ) -> str:
        logger.info("Now saving semantic memory")
        user_id, thread_id = self._extract_user_config(config)
        self.profile_reflection_executor.submit(
            content,
            thread_id=thread_id,
            after_seconds=delay_seconds,
            config={"configurable": {"thread_id": thread_id, "user_id": user_id}},
        )
        return f"Semantic memory for user {user_id} has been scheduled for saving."

    def save_episodic_memory(
        self, content: Dict[str, Any], config: RunnableConfig, delay_seconds: int = 3
    ) -> str:
        logger.info("Now saving episodic memory")
        user_id, thread_id = self._extract_user_config(config)
        self.main_reflection_executor.submit(
            content,
            thread_id=thread_id,
            after_seconds=delay_seconds,
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": user_id,
                    "memory_type": "episodic",
                }
            },
        )

        return f"Episodic memory for user {user_id} has been scheduled for saving."

    def save_procedural_memory(
        self, content: Dict[str, Any], config: RunnableConfig, delay_seconds: int = 3
    ) -> str:
        user_id, thread_id = self._extract_user_config(config)
        self.main_reflection_executor.submit(
            content,
            thread_id=thread_id,
            after_seconds=delay_seconds,
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": user_id,
                    "memory_type": "procedural",
                }
            },
        )
        return "Procedural memory has been scheduled for saving."
