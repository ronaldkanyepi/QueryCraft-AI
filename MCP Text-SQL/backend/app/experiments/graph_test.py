from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.graph import StateGraph,START,END
from langchain_mcp_adapters.resources import load_mcp_resources,convert_mcp_resource_to_langchain_blob
from langchain_mcp_adapters.prompts import load_mcp_prompt,convert_mcp_prompt_message_to_langchain_message
from typing import Annotated, Sequence, TypedDict, List
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from app.core.config import settings
from app.utils.util import Util
import asyncio
from app.agent.state import AgentState
from rich.table import Table
from rich.console import Console
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore
console = Console()
from loguru import logger

from app.utils.util import Util

# if __name__ == "__main__":
    # graph = builder()
    # config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    #
    # print("AI Assistant is ready. Type 'quit' to exit.")
    # while True:
    #     user_input = input("You: ")
    #     if user_input.lower() == "quit":
    #         break
    #
    #     events = graph.stream(
    #         {"messages": [HumanMessage(content=user_input)]},
    #         config=config,
    #         version='v1'
    #     )
    #     for event in events:
    #         for value in event.values():
    #             if isinstance(value, dict) and "messages" in value:
    #                 last_message = value["messages"][-1]
    #                 if isinstance(last_message, AIMessage):
    #                     print(f"AI: {last_message.content}")



async def main():
    client = Util.get_mcp_client()
    tools = await client.get_tools()
    print(tools)

    formatted = await Util.get_formatted_prompt(
        client=client,
        server_name=settings.MCP_SERVER_NAME,
        prompt_name="Triage System Prompt"
    )

    data = await Util.get_resource_data(
        client=client,
        server_name=settings.MCP_SERVER_NAME,
        uri="schema://database"
    )

    print(data)

    print(formatted)

    table = Table(title="Registered MCP Tools")
    table.add_column("Name", style="cyan", no_wrap=True,overflow="ellipsis")
    table.add_column("Description", style="magenta", no_wrap=True,overflow="ellipsis")

    for tool in tools:
        name = getattr(tool, "name", "—")
        description = getattr(tool, "description", "—")

        table.add_row(name, description)

    console.print(table)

if __name__ == "__main__":
        asyncio.run(main())