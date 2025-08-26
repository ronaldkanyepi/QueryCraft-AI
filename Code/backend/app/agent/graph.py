import json
import os

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from rich.console import Console

from app.agent.state import AgentState
from app.core.app_state import app_state
from app.core.config import settings
from app.core.logging import logger
from app.core.memory import init_in_memory_tools
from app.services.embbedings import Collection
from app.utils.util import Util

console = Console()

client = Util.get_mcp_client()
os.environ["OPENAI_API_KEY"] = settings.LLM_API_KEY
llm = init_chat_model(settings.LLM_MODEL_NAME)


async def triage_node(state: AgentState) -> dict:
    system_prompt = await Util.get_formatted_prompt(
        client=client, server_name=settings.MCP_SERVER_NAME, prompt_name="Triage System Prompt"
    )
    messages_for_llm = [SystemMessage(content=system_prompt)] + state["messages"]
    response = await llm.ainvoke(messages_for_llm)
    logger.warning(response)
    return {"decision": response.content}


async def clarification_node(state: AgentState, config: RunnableConfig) -> dict:
    memory_tools = app_state.memory_tools
    clarification_count = state.get("clarification_count", 0) + 1

    if clarification_count > 3:
        return {
            **state,
            "messages": [
                AIMessage(
                    content="I'm having trouble understanding your request. Please ask a specific question about your data and I'll be happy to help!"
                )
            ],
            "clarification_count": clarification_count,
            "decision": "end_conversation",
        }

    context = await memory_tools.get_user_context(config)
    user_profile = context.get("user_profile")
    recent_episodes = context.get("recent_episodes", [])
    sql_patterns = context.get("sql_patterns", [])

    formatted_profile = Util.format_to_yaml(user_profile, "User profile not available.")
    formatted_episodes = Util.format_to_yaml(recent_episodes, "No recent interactions found.")
    formatted_patterns = Util.format_to_yaml(sql_patterns, "No common patterns available.")

    last_user_message = state["messages"][-1].content if state["messages"] else ""

    clarification_prompt = f"""
    The user said: "{last_user_message}"

    This input is ambiguous for a data analysis assistant that helps with SQL queries.

    Synthesize the user's message with the provided memories to understand their likely intent.

    <user_profile>
    {formatted_profile}
    </user_profile>

    <recent_interactions>
    {formatted_episodes}
    </recent_interactions>

    <common_sql_patterns>
    {formatted_patterns}
    </common_sql_patterns>

    Based on all the context above, generate a clarifying question that:
    - Addresses the user by name if available (e.g., "Hi Ron, I'd be happy to help...")
    - References what they said specifically
    - Proactively suggests likely options based on their profile, past queries, and common patterns.
    - Sounds natural and conversational
    - Is concise (1-2 sentences max)
    - Helps narrow down what data they want to query

    Examples of good clarifying questions:
    - "Hi Ronald, I'd be happy to help with customer data! Based on your role in sales, are you looking for new leads, overall sales activity, or something else?"
    - "Ron, I can get that user information for you. Building on our last query about user sign-ups, are you now looking for their activity levels, or perhaps demographic details?"

    Clarifying question:
    """

    clarification_messages = [SystemMessage(content=clarification_prompt)]
    clarification_response = await llm.ainvoke(clarification_messages)

    return {
        **state,
        "messages": [AIMessage(content=clarification_response.content)],
        "clarification_count": clarification_count,
        "decision": None,
    }


def follow_up_node(state: AgentState) -> dict:
    return {
        **state,
        "messages": [
            AIMessage(
                content="Hey, I'm Simba the analysts I can only assist with questions about your data. How can I help you query or analyze your database?"
            )
        ],
    }


def handle_modification_node(state: AgentState) -> dict:
    return {
        **state,
        "messages": [
            AIMessage(
                content="Hey, I'm Simba the analyst. I can help you explore and analyze your data, but I can't make any changes to the database (like insert, update, or delete). How can I help you query your data instead?"
            )
        ],
    }


def route_after_triage(state: AgentState):
    decision = state.get("decision", "").strip()
    logger.warning(f"Triage decision: '{decision}'")
    return decision


async def generate_sql_node(state: AgentState, config: RunnableConfig) -> dict:
    last_user_message = state["messages"][-1].content if state["messages"] else ""

    schema_collection = Collection(
        collection_id="70849634-6458-490b-adb7-4f1cb389cc93",
        user_id="334438404911529987",
    )

    response = await schema_collection.search_min(last_user_message, limit=2)

    if isinstance(response, list):
        results = "\n\n".join(response)
    relevant_schema = Util.clean_page_content_string(results)
    mcp_tools = await client.get_tools()
    list_tables_tool = next((tool for tool in mcp_tools if tool.name == "List Tables"), None)
    if list_tables_tool:
        all_tables_summary = await list_tables_tool.arun({})
    else:
        all_tables_summary = "Unable to retrieve table list"

    sql_generation_prompt = f"""

    You are an expert PostgreSQL analyst. Your task is to write a SQL query based on the user's question and the provided database schema.

    STRICT RULES:
    - You MUST only use columns and tables explicitly listed in <relevant_schema>.
    - Do NOT invent or assume columns such as "id", "name", "created_at", "updated_at" unless they appear in <relevant_schema>.
    - Fix the specific validation error mentioned above.
    - Before finalizing the query, double-check that every column is present in <relevant_schema>.

    CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
    - Output ONLY raw SQL text - no formatting, no markdown, no code blocks
    - Do NOT use backticks (`) anywhere in your response
    - Do NOT wrap your response in ```sql or ``` or any similar markers
    - Do NOT include comments that start with --

    IMPORTANT:
    - Output ONLY the raw SQL query, without any Markdown, without ```sql or ``` fences, and without extra commentary.
    - Do not wrap the query in quotes or backticks.

    Examples:
    BAD: SELECT "id", "name" FROM "items";
    GOOD: SELECT id, name FROM items;
    BAD: ```sql SELECT id, name FROM items```;
    GOOD: SELECT id, name FROM items;

    <relevant_schema>
    {relevant_schema}
    </relevant_schema>

    <all_tables>
    {all_tables_summary}
    </all_tables>

    <user_question>
    {last_user_message}
    </user_question>

    SQL Query:
    """

    prompt_messages = [SystemMessage(content=sql_generation_prompt)]
    sql_response = await llm.ainvoke(prompt_messages)
    generated_sql = sql_response.content.strip()

    # memory_tools.save_semantic_memory(content={"messages": state['messages']}, config=config)
    # memory_tools.save_episodic_memory(content={"messages": state['messages']}, config=config)
    state["generated_sql"] = generated_sql
    print(generated_sql)
    return {**state, "messages": [AIMessage(content=generated_sql)]}


async def retry_generate_sql_node(state: AgentState, config: RunnableConfig) -> dict:
    retry_count = state.get("retry_count", 0) + 1

    if retry_count > 3:
        return {
            **state,
            "messages": [
                AIMessage(
                    content="I'm having trouble generating the correct SQL query at the moment and I reached my max retry attempts. Can you write a more clearly question?"
                )
            ],
            "retry_count": retry_count,
            "decision": "end_conversation",
        }

    # Get the validation error to help with retry
    validation_error = state.get("valid_sql", {}).get("error", "Unknown validation error")
    last_user_message = state["messages"][-1].content if state["messages"] else ""

    schema_collection = Collection(
        collection_id="70849634-6458-490b-adb7-4f1cb389cc93",
        user_id="334438404911529987",
    )

    response = await schema_collection.search_min(last_user_message, limit=2)

    if isinstance(response, list):
        results = "\n\n".join(response)
    relevant_schema = Util.clean_page_content_string(results)
    mcp_tools = await client.get_tools()
    list_tables_tool = next((tool for tool in mcp_tools if tool.name == "List Tables"), None)
    if list_tables_tool:
        all_tables_summary = await list_tables_tool.arun({})
    else:
        all_tables_summary = "Unable to retrieve table list"

    retry_sql_prompt = f"""
    You are an expert PostgreSQL analyst. Your previous SQL query had validation errors. Please fix the issues and generate a corrected query.

    PREVIOUS ERROR: {validation_error}

    STRICT RULES:
    - You MUST only use columns and tables explicitly listed in <relevant_schema>.
    - Do NOT invent or assume columns such as "id", "name", "created_at", "updated_at" unless they appear in <relevant_schema>.
    - Fix the specific validation error mentioned above.
    - Before finalizing the query, double-check that every column is present in <relevant_schema>.

    CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
    - Output ONLY raw SQL text - no formatting, no markdown, no code blocks
    - Do NOT use backticks (`) anywhere in your response
    - Do NOT wrap your response in ```sql or ``` or any similar markers
    - Do NOT include comments that start with --

    Examples:
    BAD: SELECT "id", "name" FROM "items";
    GOOD: SELECT id, name FROM items;
    BAD: ```sql SELECT id, name FROM items```;
    GOOD: SELECT id, name FROM items;

    <relevant_schema>
    {relevant_schema}
    </relevant_schema>

    <all_tables>
    {all_tables_summary}
    </all_tables>

    <user_question>
    {last_user_message}
    </user_question>

    Corrected SQL Query:
    """

    prompt_messages = [SystemMessage(content=retry_sql_prompt)]
    sql_response = await llm.ainvoke(prompt_messages)
    generated_sql = sql_response.content.strip()

    return {
        **state,
        "generated_sql": generated_sql,
        "retry_count": retry_count,
        "decision": None,
    }


async def sql_validation_node(state: AgentState, config: RunnableConfig) -> dict:
    generated_sql = state.get("generated_sql", "")
    if not generated_sql:
        return {
            **state,
            "valid_sql": {"valid": False, "error": "No SQL query to validate"},
        }

    mcp_tools = await client.get_tools()
    validate_sql_tool = next((tool for tool in mcp_tools if tool.name == "Validate SQL"), None)
    if validate_sql_tool:
        validation_result = await validate_sql_tool.arun({"query": generated_sql})
        logger.warning(f"SQL validation result: '{json.loads(validation_result)}'")
        return {
            **state,
            "valid_sql": json.loads(validation_result),
        }
    else:
        return {
            **state,
            "valid_sql": {
                "valid": False,
                "error": "SQL validation tool not available in the MCP Server",
            },
        }


async def execute_sql_node(state: AgentState, config: RunnableConfig) -> dict:
    generated_sql = state.get("generated_sql", "")

    if not generated_sql:
        return {
            **state,
            "messages": [AIMessage(content="No SQL query available to execute.")],
        }

    mcp_tools = await client.get_tools()
    execute_sql_tool = next((tool for tool in mcp_tools if tool.name == "Execute Query"), None)

    if not execute_sql_tool:
        return {
            **state,
            "messages": [AIMessage(content="SQL execution tool not available in the MCP Server")],
        }

    execution_result = await execute_sql_tool.arun({"query": generated_sql})
    result_data = (
        json.loads(execution_result) if isinstance(execution_result, str) else execution_result
    )

    if not result_data.get("success", False):
        error_msg = result_data.get("error", "Unknown execution error")
        return {
            **state,
            "messages": [AIMessage(content=f"Error executing query: {error_msg}")],
        }

    data = result_data.get("data", [])

    if not data or len(data) == 0:
        return {
            **state,
            "messages": [
                AIMessage(content="The query executed successfully but returned no results.")
            ],
        }

    sample_data = data[:5]  # Show more sample rows
    list(data[0].keys()) if data else []
    len(data)
    summary_prompt = f"""
        Dataset: {len(sample_data)} records

        {json.dumps(sample_data[:3], indent=2, default=str)}

        Analyze as a senior data analyst would:
        • **Executive Summary**: What's the story this data tells?
        • **Data Integrity**: Quality issues, edge cases, completeness
        • **Statistical Insights**: Distributions, correlations, variance patterns
        • **Business Implications**: What decisions could this data inform?
        • **Red Flags**: Potential data issues or surprising findings

        Be precise, factual, and avoid speculation. If something is unclear or not determinable from the data provided, say so explicitly. Provide sharp, analytical insights with appropriate confidence levels.
        """

    summary_messages = [SystemMessage(content=summary_prompt)]
    summary_response = await llm.ainvoke(summary_messages)
    summary = summary_response.content.strip()

    response_json = {"sql": generated_sql, "data": data, "summary": summary}

    return {
        **state,
        "execution_result": result_data,
        "generated_sql": generated_sql,
        "results": data,
        "messages": [AIMessage(content=json.dumps(response_json, indent=2, default=str))],
    }


def route_after_clarification(state: AgentState):
    decision = state.get("decision")
    if decision is None:
        return "triage"
    elif decision == "end_conversation":
        return "END"
    return decision


def route_after_retry_sql_generation(state: AgentState):
    decision = state.get("decision")
    if decision is None:
        return "validate_sql"
    elif decision == "end_conversation":
        return "END"
    return decision


def route_after_validation(state: AgentState):
    valid_sql = state.get("valid_sql", {})
    logger.warning(f"Current state of valid sql query: {valid_sql}")
    if valid_sql.get("valid", False):
        return "execute_sql"
    else:
        return "retry_generate_sql_node"


def builder(*args, **kwargs) -> CompiledStateGraph:
    graph_builder = StateGraph(AgentState)
    graph_builder.add_node("triage", triage_node)
    graph_builder.add_node("clarification", clarification_node)
    graph_builder.add_node("handle_modification", handle_modification_node)
    graph_builder.add_node("follow_up", follow_up_node)
    graph_builder.add_node("generate_sql", generate_sql_node)
    graph_builder.add_node("validate_sql", sql_validation_node)
    graph_builder.add_node("retry_generate_sql_node", retry_generate_sql_node)
    graph_builder.add_node("execute_sql", execute_sql_node)

    graph_builder.add_edge(START, "triage")
    graph_builder.add_conditional_edges(
        "triage",
        route_after_triage,
        {
            "handle_main_logic": "generate_sql",
            "handle_follow_up": "follow_up",
            "need_clarification": "clarification",
            "handle_modification_intent": "handle_modification",
        },
    )
    graph_builder.add_conditional_edges(
        "clarification", route_after_clarification, {"triage": "triage", "END": END}
    )
    graph_builder.add_edge("generate_sql", "validate_sql")
    graph_builder.add_conditional_edges(
        "validate_sql",
        route_after_validation,
        {"execute_sql": "execute_sql", "retry_generate_sql_node": "retry_generate_sql_node"},
    )
    graph_builder.add_conditional_edges(
        "retry_generate_sql_node",
        route_after_retry_sql_generation,
        {"validate_sql": "validate_sql", "END": END},
    )
    graph_builder.add_edge("execute_sql", END)
    graph_builder.add_edge("follow_up", END)
    graph_builder.add_edge("handle_modification", END)

    checkpointer = kwargs.get("checkpointer")
    store = kwargs.get("store")

    if checkpointer is None or store is None:
        store, checkpointer, memory_tools = init_in_memory_tools()
        app_state.store = store
        app_state.checkpointer = checkpointer
        app_state.memory_tools = memory_tools

    return graph_builder.compile(
        checkpointer=checkpointer,
        store=store,
        interrupt_after=["clarification"],
        name="Text-to-SQL Agent",
    )


def get_in_memory_graph():
    return builder()
