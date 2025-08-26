from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class QueryEpisode(BaseModel):
    """Episodic memory check langmem docs"""

    user_query: str = Field(description="Original user question")
    generated_sql: str = Field(description="SQL query that was generated")
    success: bool = Field(description="Whether the query executed successfully")
    tables_used: List[str] = Field(description="Database tables involved")
    query_type: str = Field(description="Type of query (aggregation, filter, join, etc.)")
    user_feedback: Optional[str] = Field(default=None, description="User feedback if provided")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class UserProfile(BaseModel):
    """User preferences and domain knowledge: semantic memory"""

    name: Optional[str] = Field(default=None, description="User's name")
    organization: Optional[str] = Field(default=None, description="User's Organization")
    department: Optional[str] = Field(default=None, description="User's Department")
    preferred_response_style: str = Field(
        default="conversational", description="How user likes responses"
    )
    technical_level: str = Field(
        default="intermediate", description="User's SQL/technical expertise"
    )
    common_tables: List[str] = Field(
        default_factory=list, description="Tables user frequently queries"
    )
    domain_expertise: List[str] = Field(
        default_factory=list, description="Business domains user works in"
    )
    clarification_preferences: str = Field(
        default="ask_specific_questions", description="How user prefers clarifications"
    )


class SQLPattern(BaseModel):
    """Common SQL patterns that work well:procedural memory for agent to improve on its own"""

    pattern_name: str = Field(description="Name of the SQL pattern")
    sql_template: str = Field(description="Template SQL with placeholders")
    use_cases: List[str] = Field(description="When to use this pattern")
    success_rate: float = Field(default=1.0, description="How often this pattern works")
    example_queries: List[str] = Field(description="Example user queries that match this pattern")
