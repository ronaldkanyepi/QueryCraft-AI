from typing import Any, Dict, List, Optional, TypedDict


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
    tools_used: Optional[List[Dict]]
    memory_context: Optional[Dict]
    extracted_memories: Optional[List]
