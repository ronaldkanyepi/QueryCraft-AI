from datetime import datetime

from fastmcp import FastMCP
from prompts import MCPPrompts
from resources import MCPResources
from starlette.responses import JSONResponse
from tools import MCPTools

from app.core.config import settings

mcp = FastMCP(
    name="TheAnalyst",
    instructions="""This server provides seamless interaction with the database and its also provide analytical capabilities""",
    version="1.0.1",
)

# ==================================================================================================Tools=============================================================================================
mcp.tool(
    MCPTools.list_tables,
    name="List Tables",
    description="Retrieve the names of all tables available in the connected database. Use this to understand what data structures exist.",
    tags={"tables", "schema"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)

mcp.tool(
    MCPTools.execute_sql_query,
    name="Execute Query",
    description="Execute a validated SQL query and return the resulting rows. Only use after the query is confirmed to be safe and syntactically correct.",
    tags={"sql", "execute"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)

mcp.tool(
    MCPTools.validate_sql_syntax,
    name="Validate SQL",
    description="Check whether a SQL statement is syntactically correct and safe to execute. Use this to catch issues before running the query.",
    tags={"sql", "validation"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)


# ==================================================================================================Resources==========================================================================================
@mcp.resource(
    uri="schema://database",
    name="Database Schema",
    description="The full SQL schema of the connected database, including table and column definitions. Useful for understanding the database structure.",
    tags={"schema", "metadata"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)
def database_schema() -> str:
    return MCPResources.get_database_schema()


@mcp.resource(
    uri="config://sql-patterns",
    name="SQL Query Patterns",
    description="Common SQL query templates and patterns, such as group-by or joins. Useful for guiding SQL generation and validation.",
    tags={"config", "sql", "patterns"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)
def sql_patterns() -> dict:
    return MCPResources.get_sql_patterns()


@mcp.resource(
    uri="config://chart-templates",
    name="Chart Templates",
    description="Predefined chart configuration templates that map SQL query results to visualizations like bar, line, or pie charts.",
    tags={"config", "charts", "templates"},
    meta={"version": settings.APP_VERSION, "author": settings.AUTHOR},
)
def chart_templates() -> dict:
    return MCPResources.get_chart_templates()


# ==================================================================================================Prompts=============================================================================================
@mcp.prompt(
    name="Triage System Prompt",
    description=(
        "System prompt used by the Triage Agent to classify the user's intent. "
        "It helps determine whether the input is a new query (handle_main_logic), "
        "requires clarification (need_clarification), modifies a previous query (handle_modification_intent), "
        "or is a follow-up question (handle_follow_up)."
    ),
)
def get_triage_system_prompt():
    return MCPPrompts.get_triage_prompt()


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request):
    return JSONResponse({"status": "healthy", "timestamp": datetime.now().isoformat()})


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http", host=settings.MCP_SERVER_HOST, port=settings.MCP_SERVER_PORT
    )
