import os

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.memory import InMemoryStore
from rich.console import Console

from app.agent.state import AgentState
from app.core.config import settings
from app.core.logging import logger
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


def clarification_node(state: AgentState) -> dict:
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

    last_user_message = state["messages"][-1].content if state["messages"] else ""

    clarification_prompt = f"""
                The user said: "{last_user_message}"

                This input is ambiguous for a data analysis assistant that helps with SQL queries.
                Generate a helpful clarifying question that:
                - References what they said specifically
                - Asks about the most likely missing information (specific tables, columns, metrics, time periods, filters, etc.)
                - Sounds natural and conversational
                - Is concise (1-2 sentences max)
                - Helps narrow down what data they want to query

                Examples of good clarifying questions:
                - "I'd be happy to help with customer data! Are you looking for customer counts, details about specific customers, or perhaps customer activity over a certain time period?"
                - "Could you be more specific about what user information you need? For example, are you interested in user registrations, activity, or specific user details?"

                Clarifying question:
                """

    clarification_messages = [SystemMessage(content=clarification_prompt)]
    clarification_response = llm.invoke(clarification_messages)

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


def main_logic_node(state: AgentState) -> dict:
    """Handle the main text-to-sql logic"""
    return {**state, "messages": [AIMessage(content="Processing your data question...")]}


def route_after_clarification(state: AgentState):
    decision = state.get("decision")
    if decision is None:
        return "triage"
    elif decision == "end_conversation":
        return "END"
    return decision


def builder(*args, **kwargs) -> CompiledStateGraph:
    graph_builder = StateGraph(AgentState)

    graph_builder.add_node("triage", triage_node)
    graph_builder.add_node("clarification", clarification_node)
    graph_builder.add_node("handle_modification", handle_modification_node)
    graph_builder.add_node("follow_up", follow_up_node)
    graph_builder.add_node("main_logic", main_logic_node)

    graph_builder.add_edge(START, "triage")
    graph_builder.add_conditional_edges(
        "triage",
        route_after_triage,
        {
            "handle_main_logic": "main_logic",
            "handle_follow_up": "follow_up",
            "need_clarification": "clarification",
            "handle_modification_intent": "handle_modification",
        },
    )
    graph_builder.add_conditional_edges(
        "clarification", route_after_clarification, {"triage": "triage", "END": END}
    )
    graph_builder.add_edge("main_logic", END)
    graph_builder.add_edge("follow_up", END)
    graph_builder.add_edge("handle_modification", END)

    checkpointer = kwargs.get("checkpointer")
    store = kwargs.get("store")
    reflection_executor = kwargs.get("reflection_executor")

    if checkpointer is None:
        checkpointer = MemorySaver()
    if store is None:
        store = InMemoryStore()

    return graph_builder.compile(
        checkpointer=checkpointer,
        store=store,
        interrupt_after=["clarification"],
        name="Text-to-SQL Agent",
    )


def get_in_memory_graph():
    return builder()
