import asyncio
import json

from fastapi import APIRouter, Depends
from langchain_core.runnables import RunnableConfig
from starlette.requests import Request
from starlette.responses import StreamingResponse

from app.core.auth import get_enhanced_user
from app.core.logging import logger
from app.schemas.chat import ChatRequest
from app.utils.util import Util

router = APIRouter()


@router.post("")
async def chat(
    request: Request,
    input: ChatRequest,
    user: dict = Depends(get_enhanced_user),
):
    logger.info(f"Received request: {input}")
    logger.info(f"Additional info: {user['additional_info']}")

    config = RunnableConfig(configurable={"thread_id": input.thread_id})
    return StreamingResponse(
        Util.stream_generator(input.messages, config),
        media_type="text/event-stream",
    )


@router.post("/test")
async def chat_endpoint(request: Request):
    logger.info("Chatbot is ready. Type 'exit' to end the conversation.")

    async def stream_steps():
        # Step 1: Thinking / Planning
        yield (
            json.dumps(
                {"type": "thinking", "content": "Planning execution steps using LangGraph..."}
            )
            + "\n"
        )
        await asyncio.sleep(1)

        # Step 2: Tool - SQL Generator
        yield json.dumps({"type": "tool", "content": "Calling tool: SQLGenerator"}) + "\n"
        await asyncio.sleep(1)

        sql = "SELECT * FROM orders WHERE created_at >= DATE('now', '-30 days')"
        yield (
            json.dumps({"type": "tool_result", "content": f"Tool SQLGenerator output:\n{sql}"})
            + "\n"
        )
        await asyncio.sleep(1)

        # Step 3: Tool - Query Executor
        yield json.dumps({"type": "tool", "content": "Calling tool: QueryExecutor"}) + "\n"
        await asyncio.sleep(1)

        data = [
            {"date": "2024-01-01", "total_orders": 45, "revenue": 2340},
            {"date": "2024-01-02", "total_orders": 52, "revenue": 2890},
        ]
        yield (
            json.dumps(
                {
                    "type": "tool_result",
                    "content": f"Tool QueryExecutor output: {len(data)} rows returned",
                }
            )
            + "\n"
        )
        await asyncio.sleep(1)

        # Step 4: Tool - Summarizer
        yield json.dumps({"type": "tool", "content": "Calling tool: ResultSummarizer"}) + "\n"
        await asyncio.sleep(1)

        summary = f"Total orders: {sum(d['total_orders'] for d in data)}, Revenue: ${sum(d['revenue'] for d in data)}"
        yield (
            json.dumps(
                {"type": "tool_result", "content": f"Tool ResultSummarizer output: {summary}"}
            )
            + "\n"
        )
        await asyncio.sleep(1)

        # Step 5: Final Output
        yield (
            json.dumps(
                {
                    "type": "final",
                    "content": "Workflow completed successfully.",
                    "data": {"sql": sql, "results": data, "summary": summary},
                }
            )
            + "\n"
        )

    return StreamingResponse(stream_steps(), media_type="text/plain")
