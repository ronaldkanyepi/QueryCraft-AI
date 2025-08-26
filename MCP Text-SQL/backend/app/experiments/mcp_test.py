import asyncio
import json

from rich.console import Console
from rich.table import Table

from app.core.config import settings
from app.utils.util import Util

console = Console()


async def main():
    client = Util.get_mcp_client()
    tools = await client.get_tools()
    print(tools)

    list_tables_tool = next((tool for tool in tools if tool.name == "List Tables"), None)
    if list_tables_tool:
        all_tables_summary = await list_tables_tool.arun({})
    else:
        all_tables_summary = "Unable to retrieve table list"
    print(all_tables_summary)

    validate_sql_tool = next((tool for tool in tools if tool.name == "Validate SQL"), None)
    if validate_sql_tool:
        validation_result = await validate_sql_tool.arun(
            {"query": "SELECT * FROM items ORDER BY id_ DESC LIMIT 10;"}
        )

        parsed_result = json.loads(validation_result)
        print(parsed_result["valid"])

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
