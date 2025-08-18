from typing import Annotated, Sequence, TypedDict, List, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from typing import TypedDict, List, Optional, Any

class AgentState(TypedDict, total=False):
    messages: List[Any]
    decision: Optional[str]
    clarification_count: Optional[int]
    final_message: Optional[str]
    message_type: Optional[str]
    sql_query: Optional[str]
    query_results: Optional[List[Any]]
    analysis_summary: Optional[str]
    reasoning_steps: Optional[List[str]]
    tools_used: Optional[List[dict]]
