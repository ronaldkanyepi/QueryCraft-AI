import asyncio

from rich.console import Console
from rich.table import Table

from app.core.config import settings
from app.utils.util import Util

console = Console()


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
        client=client, server_name=settings.MCP_SERVER_NAME, prompt_name="Triage System Prompt"
    )

    data = await Util.get_resource_data(
        client=client, server_name=settings.MCP_SERVER_NAME, uri="schema://database"
    )

    print(data)

    print(formatted)

    table = Table(title="Registered MCP Tools")
    table.add_column("Name", style="cyan", no_wrap=True, overflow="ellipsis")
    table.add_column("Description", style="magenta", no_wrap=True, overflow="ellipsis")

    for tool in tools:
        name = getattr(tool, "name", "—")
        description = getattr(tool, "description", "—")

        table.add_row(name, description)

    console.print(table)


if __name__ == "__main__":
    asyncio.run(main())
