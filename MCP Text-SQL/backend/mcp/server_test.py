import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union, Annotated
from datetime import datetime
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.utils import PlotlyJSONEncoder

from fastmcp import FastMCP
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END, START
from langgraph.graph import MessagesState, add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.tools import tool
from app.core.config import settings


# ============================================================================
# STATE MANAGEMENT FOR LANGGRAPH
# ============================================================================

class AnalystState(MessagesState):
    """Extended state for the analyst workflow."""
    user_query: str = ""
    intent: str = ""  # "sql", "chart", "both", "explore"
    schema_info: str = ""
    sample_data: Dict = {}
    sql_query: str = ""
    sql_results: Dict = {}
    chart_config: Dict = {}
    chart_data: Dict = {}
    error_message: str = ""
    analysis_summary: str = ""
    workflow_steps: List[str] = []

    def add_step(self, step: str):
        """Add a workflow step with timestamp."""
        timestamped_step = f"[{datetime.now().strftime('%H:%M:%S')}] {step}"
        self.workflow_steps.append(timestamped_step)


# ============================================================================
# MCP RESOURCES - Structured Knowledge Base
# ============================================================================


# ============================================================================
# MCP PROMPTS - Structured Prompt Templates
# ============================================================================

class MCPPrompts:
    """Centralized prompt templates for different tasks."""

    @staticmethod
    def get_intent_analysis_prompt() -> PromptTemplate:
        """Prompt for analyzing user intent."""
        return PromptTemplate(
            input_variables=["user_query"],
            template="""
Analyze the user's query and determine their intent. Classify into one of these categories:

1. **explore** - User wants to understand the data structure or browse data
2. **sql** - User wants to query data but doesn't mention visualization
3. **chart** - User wants to create visualizations (may need data first)
4. **both** - User explicitly wants both data query and visualization

User Query: "{user_query}"

Look for these indicators:
- Exploration: "show me", "what data", "explore", "browse", "understand"
- SQL: "query", "select", "count", "sum", "filter", "find"
- Chart: "chart", "graph", "plot", "visualize", "show trends", "compare"
- Both: combines data requests with visualization words

Respond with only the classification: explore, sql, chart, or both
"""
        )

    @staticmethod
    def get_sql_generation_prompt() -> PromptTemplate:
        """Prompt for generating SQL from natural language."""
        return PromptTemplate(
            input_variables=["user_query", "schema_info", "sql_patterns", "sample_data"],
            template="""
You are an expert SQL analyst. Convert the natural language query to SQL using the provided database schema.

USER QUERY: "{user_query}"

DATABASE SCHEMA:
{schema_info}

AVAILABLE SQL PATTERNS:
{sql_patterns}

SAMPLE DATA (for context):
{sample_data}

RULES:
1. Use EXACT table and column names from the schema
2. Include appropriate JOINs when referencing multiple tables
3. Add WHERE clauses for filtering conditions
4. Use aggregation functions (COUNT, SUM, AVG) when appropriate
5. Add ORDER BY for meaningful sorting
6. ALWAYS add LIMIT for SELECT queries (max 1000 rows)
7. Handle NULL values appropriately
8. Use proper date/time functions if working with temporal data

IMPORTANT: Return ONLY the SQL query, no explanations or markdown formatting.

SQL Query:
"""
        )

    @staticmethod
    def get_chart_analysis_prompt() -> PromptTemplate:
        """Prompt for analyzing data and suggesting chart configurations."""
        return PromptTemplate(
            input_variables=["data_summary", "user_query", "chart_templates"],
            template="""
Analyze the query results and user intent to recommend the best visualization.

USER QUERY: "{user_query}"

DATA SUMMARY:
- Columns: {columns}
- Row Count: {row_count}
- Data Types: {data_types}
- Sample Values: {sample_values}

AVAILABLE CHART TEMPLATES:
{chart_templates}

ANALYSIS STEPS:
1. Identify the main analytical question
2. Examine data structure and types
3. Consider best practices for the data pattern
4. Match with appropriate chart template

Select the best chart template and provide configuration as JSON:
{{
    "type": "chart_type",
    "x": "column_name",
    "y": "column_name", 
    "title": "descriptive_title",
    "color": "grouping_column_if_applicable",
    "reasoning": "why_this_chart_type"
}}

Return only the JSON configuration:
"""
        )

    @staticmethod
    def get_error_analysis_prompt() -> PromptTemplate:
        """Prompt for analyzing and recovering from errors."""
        return PromptTemplate(
            input_variables=["error_message", "original_query", "schema_info"],
            template="""
An error occurred while executing the SQL query. Analyze the error and suggest a fix.

ORIGINAL QUERY: "{original_query}"
ERROR MESSAGE: "{error_message}"

DATABASE SCHEMA:
{schema_info}

COMMON ERROR PATTERNS:
1. Column/table name misspellings
2. Missing JOIN conditions
3. Type mismatches in WHERE clauses
4. Aggregation without GROUP BY
5. Invalid date/time formats

Provide:
1. Root cause analysis
2. Corrected SQL query
3. Brief explanation of the fix

Format as JSON:
{{
    "root_cause": "explanation",
    "corrected_sql": "fixed_query",
    "explanation": "what_was_changed"
}}
"""
        )


# ============================================================================
# LANGGRAPH WORKFLOW NODES
# ============================================================================

class AnalystWorkflow:
    """LangGraph workflow for text-to-SQL and chart generation."""

    def __init__(self, llm=None):
        self.llm = llm  # Your LLM client (OpenAI, Anthropic, etc.)
        self.resources = MCPResources()
        self.prompts = MCPPrompts()
        self.graph = self._create_graph()

    def _create_graph(self) -> StateGraph:
        """Create the complete LangGraph workflow."""
        workflow = StateGraph(AnalystState)

        # Add all workflow nodes
        workflow.add_node("analyze_intent", self.analyze_intent)
        workflow.add_node("get_schema_context", self.get_schema_context)
        workflow.add_node("generate_sql", self.generate_sql)
        workflow.add_node("execute_sql", self.execute_sql)
        workflow.add_node("handle_sql_error", self.handle_sql_error)
        workflow.add_node("analyze_for_chart", self.analyze_for_chart)
        workflow.add_node("generate_chart", self.generate_chart)
        workflow.add_node("create_summary", self.create_summary)

        # Define workflow edges
        workflow.add_edge(START, "analyze_intent")
        workflow.add_edge("analyze_intent", "get_schema_context")

        # Conditional routing based on intent
        workflow.add_conditional_edges(
            "get_schema_context",
            self.route_by_intent,
            {
                "generate_sql": "generate_sql",
                "explore_only": "create_summary"
            }
        )

        workflow.add_edge("generate_sql", "execute_sql")

        # Handle SQL execution results
        workflow.add_conditional_edges(
            "execute_sql",
            self.check_sql_results,
            {
                "success": "analyze_for_chart",
                "error": "handle_sql_error",
                "no_chart": "create_summary"
            }
        )

        workflow.add_edge("handle_sql_error", "generate_sql")  # Retry loop
        workflow.add_edge("analyze_for_chart", "generate_chart")
        workflow.add_edge("generate_chart", "create_summary")
        workflow.add_edge("create_summary", END)

        return workflow.compile()

    async def analyze_intent(self, state: AnalystState) -> AnalystState:
        """Analyze user intent to determine workflow path."""
        try:
            if self.llm:
                prompt = self.prompts.get_intent_analysis_prompt()
                response = await self.llm.ainvoke(prompt.format(user_query=state["user_query"]))
                intent = response.content.strip().lower()
            else:
                # Fallback keyword-based intent detection
                query_lower = state["user_query"].lower()
                chart_keywords = ["chart", "graph", "plot", "visualize", "show trends"]
                explore_keywords = ["explore", "browse", "what data", "show me tables"]

                has_chart = any(kw in query_lower for kw in chart_keywords)
                has_explore = any(kw in query_lower for kw in explore_keywords)

                if has_explore:
                    intent = "explore"
                elif has_chart:
                    intent = "both"
                else:
                    intent = "sql"

            state["intent"] = intent
            state.add_step(f"Intent analyzed: {intent}")

        except Exception as e:
            state["error_message"] = f"Intent analysis failed: {str(e)}"
            state["intent"] = "sql"  # Default fallback

        return state

    async def get_schema_context(self, state: AnalystState) -> AnalystState:
        """Retrieve database schema and sample data for context."""
        try:
            # Get full schema information
            state["schema_info"] = self.resources.get_database_schema()

            # Get sample data from a few tables for context
            engine = create_engine(settings.DATABASE_URL)
            inspector = inspect(engine)
            table_names = inspector.get_table_names()[:3]  # Limit to first 3 tables

            sample_data = {}
            for table in table_names:
                try:
                    query = f"SELECT * FROM {table} LIMIT 3"
                    with engine.connect() as conn:
                        result = conn.execute(text(query))
                        rows = result.fetchall()
                        columns = list(result.keys())
                        sample_data[table] = {
                            "columns": columns,
                            "sample_rows": [dict(zip(columns, row)) for row in rows]
                        }
                except Exception:
                    continue

            state["sample_data"] = sample_data
            state.add_step("Schema and sample data retrieved")

        except Exception as e:
            state["error_message"] = f"Schema retrieval failed: {str(e)}"

        return state

    async def generate_sql(self, state: AnalystState) -> AnalystState:
        """Generate SQL query from natural language."""
        try:
            if self.llm:
                prompt = self.prompts.get_sql_generation_prompt()
                sql_patterns = json.dumps(self.resources.get_sql_patterns(), indent=2)
                sample_data_str = json.dumps(state["sample_data"], indent=2, default=str)

                response = await self.llm.ainvoke(prompt.format(
                    user_query=state["user_query"],
                    schema_info=state["schema_info"],
                    sql_patterns=sql_patterns,
                    sample_data=sample_data_str
                ))

                sql_query = response.content.strip()
                # Clean up any markdown formatting
                if sql_query.startswith("```"):
                    sql_query = sql_query.split("\n", 1)[1].rsplit("\n", 1)[0]

                state["sql_query"] = sql_query
                state.add_step("SQL query generated")
            else:
                # Fallback: basic query generation
                state["sql_query"] = "SELECT * FROM users LIMIT 10"
                state.add_step("SQL query generated (fallback)")

        except Exception as e:
            state["error_message"] = f"SQL generation failed: {str(e)}"

        return state

    async def execute_sql(self, state: AnalystState) -> AnalystState:
        """Execute the generated SQL query."""
        try:
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as conn:
                result = conn.execute(text(state["sql_query"]))

                if result.returns_rows:
                    columns = list(result.keys())
                    rows = result.fetchall()
                    data = [dict(zip(columns, row)) for row in rows]

                    state["sql_results"] = {
                        "success": True,
                        "data": data,
                        "columns": columns,
                        "row_count": len(data)
                    }
                    state.add_step(f"SQL executed successfully - {len(data)} rows returned")
                else:
                    state["sql_results"] = {
                        "success": True,
                        "message": "Query executed successfully"
                    }
                    state.add_step("SQL executed successfully")

        except Exception as e:
            state["sql_results"] = {
                "success": False,
                "error": str(e)
            }
            state["error_message"] = str(e)
            state.add_step(f"SQL execution failed: {str(e)}")

        return state

    async def handle_sql_error(self, state: AnalystState) -> AnalystState:
        """Handle SQL errors and attempt to fix them."""
        try:
            if self.llm:
                prompt = self.prompts.get_error_analysis_prompt()
                response = await self.llm.ainvoke(prompt.format(
                    error_message=state["error_message"],
                    original_query=state["sql_query"],
                    schema_info=state["schema_info"]
                ))

                error_analysis = json.loads(response.content)
                state["sql_query"] = error_analysis["corrected_sql"]
                state.add_step(f"SQL error handled: {error_analysis['explanation']}")
            else:
                # Simple fallback - add LIMIT if missing
                if "LIMIT" not in state["sql_query"].upper():
                    state["sql_query"] += " LIMIT 100"
                state.add_step("Applied basic SQL error correction")

        except Exception as e:
            state.add_step(f"Error handling failed: {str(e)}")

        return state

    async def analyze_for_chart(self, state: AnalystState) -> AnalystState:
        """Analyze SQL results to determine optimal chart configuration."""
        try:
            if not state["sql_results"].get("data"):
                return state

            data = state["sql_results"]["data"]
            columns = state["sql_results"]["columns"]

            # Analyze data structure
            df = pd.DataFrame(data)
            data_summary = {
                "columns": columns,
                "row_count": len(data),
                "data_types": {col: str(df[col].dtype) for col in df.columns},
                "sample_values": {col: df[col].head(3).tolist() for col in df.columns}
            }

            if self.llm:
                prompt = self.prompts.get_chart_analysis_prompt()
                chart_templates = json.dumps(self.resources.get_chart_templates(), indent=2)

                response = await self.llm.ainvoke(prompt.format(
                    user_query=state["user_query"],
                    data_summary=json.dumps(data_summary, default=str),
                    chart_templates=chart_templates
                ))

                chart_config = json.loads(response.content)
                state["chart_config"] = chart_config
            else:
                # Fallback chart configuration
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                categorical_cols = df.select_dtypes(include=['object']).columns.tolist()

                if len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
                    state["chart_config"] = {
                        "type": "bar",
                        "x": categorical_cols[0],
                        "y": numeric_cols[0],
                        "title": f"{numeric_cols[0]} by {categorical_cols[0]}"
                    }
                elif len(numeric_cols) >= 2:
                    state["chart_config"] = {
                        "type": "scatter",
                        "x": numeric_cols[0],
                        "y": numeric_cols[1],
                        "title": f"{numeric_cols[1]} vs {numeric_cols[0]}"
                    }
                else:
                    state["chart_config"] = {
                        "type": "bar",
                        "x": columns[0],
                        "y": columns[1] if len(columns) > 1 else columns[0],
                        "title": "Data Visualization"
                    }

            state.add_step("Chart configuration analyzed")

        except Exception as e:
            state["error_message"] = f"Chart analysis failed: {str(e)}"

        return state

    async def generate_chart(self, state: AnalystState) -> AnalystState:
        """Generate the actual chart using Plotly."""
        try:
            if not state["sql_results"].get("data") or not state["chart_config"]:
                return state

            data = state["sql_results"]["data"]
            config = state["chart_config"]
            df = pd.DataFrame(data)

            # Generate chart based on configuration
            chart_type = config.get("type", "bar")

            if chart_type == "bar":
                fig = px.bar(df, x=config.get("x"), y=config.get("y"),
                             title=config.get("title"), color=config.get("color"))
            elif chart_type == "line":
                fig = px.line(df, x=config.get("x"), y=config.get("y"),
                              title=config.get("title"), color=config.get("color"))
            elif chart_type == "scatter":
                fig = px.scatter(df, x=config.get("x"), y=config.get("y"),
                                 title=config.get("title"), color=config.get("color"))
            elif chart_type == "pie":
                fig = px.pie(df, names=config.get("names"), values=config.get("values"),
                             title=config.get("title"))
            else:
                fig = px.bar(df, x=df.columns[0], y=df.columns[1] if len(df.columns) > 1 else df.columns[0])

            # Convert to JSON for MCP transmission
            chart_json = json.dumps(fig, cls=PlotlyJSONEncoder)

            state["chart_data"] = {
                "success": True,
                "chart_json": chart_json,
                "chart_html": fig.to_html(include_plotlyjs='cdn'),
                "config": config
            }

            state.add_step("Chart generated successfully")

        except Exception as e:
            state["chart_data"] = {
                "success": False,
                "error": str(e)
            }
            state.add_step(f"Chart generation failed: {str(e)}")

        return state

    async def create_summary(self, state: AnalystState) -> AnalystState:
        """Create a comprehensive summary of the analysis."""
        summary_parts = []

        # Add query information
        summary_parts.append(f"**User Query:** {state['user_query']}")
        summary_parts.append(f"**Intent:** {state['intent']}")

        # Add SQL information
        if state.get("sql_query"):
            summary_parts.append(f"**Generated SQL:**\n```sql\n{state['sql_query']}\n```")

        # Add results information
        if state["sql_results"].get("success"):
            row_count = state["sql_results"].get("row_count", 0)
            summary_parts.append(f"**Results:** {row_count} rows returned")

        # Add chart information
        if state["chart_data"].get("success"):
            chart_type = state["chart_config"].get("type", "unknown")
            summary_parts.append(f"**Visualization:** {chart_type} chart generated")

        # Add workflow steps
        if state["workflow_steps"]:
            steps = "\n".join(f"- {step}" for step in state["workflow_steps"])
            summary_parts.append(f"**Workflow Steps:**\n{steps}")

        # Add any errors
        if state.get("error_message"):
            summary_parts.append(f"**Errors:** {state['error_message']}")

        state["analysis_summary"] = "\n\n".join(summary_parts)
        return state

    # Conditional routing functions
    def route_by_intent(self, state: AnalystState) -> str:
        """Route workflow based on analyzed intent."""
        intent = state.get("intent", "sql")
        if intent == "explore":
            return "explore_only"
        return "generate_sql"

    def check_sql_results(self, state: AnalystState) -> str:
        """Check SQL execution results and route accordingly."""
        if not state["sql_results"].get("success"):
            return "error"

        intent = state.get("intent", "sql")
        if intent in ["chart", "both"] and state["sql_results"].get("data"):
            return "success"

        return "no_chart"


# ============================================================================
# ENHANCED MCP TOOLS WITH LANGGRAPH INTEGRATION
# ============================================================================

class MCPTools:
    """Enhanced MCP tools with LangGraph workflow integration."""

    def __init__(self):
        self.workflow = AnalystWorkflow()  # Initialize without LLM for now

    # Your existing methods (keeping them as-is)
    @staticmethod
    def list_tables() -> dict:
        """Lists all tables in the connected database."""
        try:
            inspector = inspect(create_engine(settings.DATABASE_URL))
            table_names = inspector.get_table_names()
            return {"success": True, "tables": table_names}
        except SQLAlchemyError as e:
            return {
                "success": False,
                "error": "Database connection failed. The server may be down or the credentials may be incorrect.",
                "tables": []
            }

    @staticmethod
    def list_tables_and_columns():
        """Inspects the database to get formatted string of all tables and columns."""
        engine = create_engine(settings.DATABASE_URL)
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        all_pages = []

        for table_name in table_names:
            try:
                table_comment = inspector.get_table_comment(table_name).get("text")
                columns = inspector.get_columns(table_name)
                foreign_keys = inspector.get_foreign_keys(table_name)
                fk_lookup = {
                    col: f" (References {fk['referred_table']}.{fk['referred_columns'][0]})"
                    for fk in foreign_keys
                    for col in fk.get("constrained_columns", [])
                }

                column_details = []
                for col in columns:
                    col_name = col["name"]
                    col_type = col["type"]
                    col_comment = f": {col['comment']}" if col.get("comment") else ""
                    fk_relation = fk_lookup.get(col_name, "")
                    column_details.append(
                        f"{col_name} ({col_type}){col_comment}{fk_relation}"
                    )

                page_content = (
                        f"Table: {table_name}\n"
                        f"Description: {table_comment or 'No description provided.'}\n"
                        f"Columns:\n- " + "\n- ".join(column_details)
                )
                all_pages.append(page_content)

            except Exception as e:
                print(f"Error processing table {table_name}: {e}")

        return "\n\n---\n\n".join(all_pages)

    # NEW LANGGRAPH-INTEGRATED METHODS

    async def natural_language_query(self, user_query: str, llm_client=None) -> dict:
        """
        Complete natural language to SQL and chart workflow using LangGraph.

        Args:
            user_query: Natural language query from user
            llm_client: Optional LLM client for advanced processing

        Returns:
            dict: Complete workflow results including SQL, data, and charts
        """
        try:
            # Update workflow with LLM if provided
            if llm_client:
                self.workflow.llm = llm_client

            # Create initial state
            initial_state = AnalystState(
                messages=[HumanMessage(content=user_query)],
                user_query=user_query
            )

            # Run the complete workflow
            final_state = await self.workflow.graph.ainvoke(initial_state)

            return {
                "success": True,
                "user_query": user_query,
                "intent": final_state.get("intent"),
                "sql_query": final_state.get("sql_query"),
                "sql_results": final_state.get("sql_results"),
                "chart_config": final_state.get("chart_config"),
                "chart_data": final_state.get("chart_data"),
                "analysis_summary": final_state.get("analysis_summary"),
                "workflow_steps": final_state.get("workflow_steps"),
                "error_message": final_state.get("error_message")
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "user_query": user_query,
                "error_type": type(e).__name__
            }

    @staticmethod
    def execute_sql_query(query: str, limit: int = 1000) -> dict:
        """Execute SQL query safely with results."""
        try:
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as connection:
                # Add LIMIT if not present and it's a SELECT query
                if query.strip().upper().startswith('SELECT') and 'LIMIT' not in query.upper():
                    query = f"{query.rstrip(';')} LIMIT {limit}"

                result = connection.execute(text(query))

                if result.returns_rows:
                    columns = list(result.keys())
                    rows = result.fetchall()
                    data = [dict(zip(columns, row)) for row in rows]

                    return {
                        "success": True,
                        "data": data,
                        "columns": columns,
                        "row_count": len(data),
                        "query": query,
                        "executed_at": datetime.now().isoformat()
                    }
                else:
                    return {
                        "success": True,
                        "message": "Query executed successfully",
                        "query": query,
                        "executed_at": datetime.now().isoformat()
                    }

        except SQLAlchemyError as e:
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "error_type": type(e).__name__
            }

    @staticmethod
    def get_sample_data(table_name: str, limit: int = 5) -> dict:
        """Get sample data from a specific table."""
        query = f"SELECT * FROM {table_name} LIMIT {limit}"
        return MCPTools.execute_sql_query(query, limit)

    @staticmethod
    def validate_sql_syntax(query: str) -> dict:
        """Validate SQL syntax without execution."""
        try:
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as connection:
                if query.strip().upper().startswith('SELECT'):
                    explain_query = f"EXPLAIN {query}"
                    connection.execute(text(explain_query))

                return {
                    "valid": True,
                    "query": query,
                    "message": "SQL syntax is valid"
                }

        except SQLAlchemyError as e:
            return {
                "valid": False,
                "error": str(e),
                "query": query,
                "error_type": type(e).__name__
            }

    @staticmethod
    def generate_chart(data: List[Dict], chart_config: Dict) -> dict:
        """Generate chart from data using Plotly."""
        try:
            if not data:
                return {
                    "success": False,
                    "error": "No data provided for chart generation"
                }

            df = pd.DataFrame(data)
            chart_type = chart_config.get("type", "bar").lower()

            # Chart generation based on type
            if chart_type == "bar":
                fig = px.bar(
                    df,
                    x=chart_config.get("x"),
                    y=chart_config.get("y"),
                    title=chart_config.get("title", "Bar Chart"),
                    color=chart_config.get("color")
                )
            elif chart_type == "line":
                fig = px.line(
                    df,
                    x=chart_config.get("x"),
                    y=chart_config.get("y"),
                    title=chart_config.get("title", "Line Chart"),
                    color=chart_config.get("color")
                )
            elif chart_type == "scatter":
                fig = px.scatter(
                    df,
                    x=chart_config.get("x"),
                    y=chart_config.get("y"),
                    title=chart_config.get("title", "Scatter Plot"),
                    color=chart_config.get("color"),
                    size=chart_config.get("size")
                )
            elif chart_type == "pie":
                fig = px.pie(
                    df,
                    values=chart_config.get("values"),
                    names=chart_config.get("names"),
                    title=chart_config.get("title", "Pie Chart")
                )
            elif chart_type == "histogram":
                fig = px.histogram(
                    df,
                    x=chart_config.get("x"),
                    title=chart_config.get("title", "Histogram"),
                    nbins=chart_config.get("bins", 20)
                )
            elif chart_type == "box":
                fig = px.box(
                    df,
                    x=chart_config.get("x"),
                    y=chart_config.get("y"),
                    title=chart_config.get("title", "Box Plot")
                )
            else:
                x_col = chart_config.get("x", df.columns[0])
                y_col = chart_config.get("y", df.columns[1] if len(df.columns) > 1 else df.columns[0])
                fig = px.bar(df, x=x_col, y=y_col, title="Default Chart")

            # Apply styling
            if chart_config.get("theme"):
                fig.update_layout(template=chart_config["theme"])

            chart_json = json.dumps(fig, cls=PlotlyJSONEncoder)

            return {
                "success": True,
                "chart_json": chart_json,
                "chart_html": fig.to_html(include_plotlyjs='cdn'),
                "config": chart_config,
                "data_summary": {
                    "rows": len(df),
                    "columns": list(df.columns),
                    "chart_type": chart_type
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "config": chart_config,
                "error_type": type(e).__name__
            }


# ============================================================================
# FASTMCP SERVER SETUP WITH COMPLETE INTEGRATION
# ============================================================================

# Initialize the enhanced MCP server
mcp = FastMCP(
    name="TheAnalyst",
    instructions="""
    Advanced Database Analysis Server with LangGraph-powered Natural Language Processing

    🎯 CAPABILITIES:
    • Natural language to SQL conversion
    • Automatic chart generation and visualization  
    • Intelligent data analysis workflows
    • Database schema exploration
    • Error handling and query optimization

    🔧 FEATURES:
    • LangGraph workflow orchestration
    • Multi-step analytical reasoning
    • Context-aware SQL generation
    • Smart chart type selection
    • Comprehensive error recovery

    💡 USAGE EXAMPLES:
    • "Show me the top 10 customers by revenue"
    • "Create a chart showing sales trends over time"
    • "What tables contain user information?"
    • "Visualize the distribution of order amounts"
    • "Compare performance across different regions"

    🛠️ TOOLS AVAILABLE:
    - Database introspection and querying
    - Advanced SQL generation with LLM integration
    - Interactive chart creation (Plotly-based)
    - Complete natural language analysis workflows
    - Schema exploration and data sampling
    """,
    version="3.0.0"
)

# Initialize enhanced tools
tools = MCPTools()

# ============================================================================
# REGISTER ALL MCP TOOLS
# ============================================================================

# Core database tools (your existing ones)
mcp.tool(tools.list_tables)
mcp.tool(tools.list_tables_and_columns)

# Enhanced analysis tools
mcp.tool(tools.execute_sql_query)
mcp.tool(tools.get_sample_data)
mcp.tool(tools.validate_sql_syntax)
mcp.tool(tools.generate_chart)

# LangGraph-integrated workflow tool
mcp.tool(tools.natural_language_query)


# ============================================================================
# REGISTER MCP RESOURCES
# ============================================================================

@mcp.resource
def database_schema() -> str:
    """Complete database schema with relationships and metadata."""
    return MCPResources.get_database_schema()


@mcp.resource
def sql_patterns() -> str:
    """SQL query patterns and templates for common analytical tasks."""
    patterns = MCPResources.get_sql_patterns()
    formatted_patterns = []

    for category, queries in {
        "Basic Patterns": {k: v for k, v in patterns.items() if k in ["count_all", "sample_data", "distinct_values"]},
        "Aggregation Patterns": {k: v for k, v in patterns.items() if "group" in k or "sum" in k or "avg" in k},
        "Time-based Patterns": {k: v for k, v in patterns.items() if "daily" in k or "monthly" in k or "recent" in k},
        "Ranking Patterns": {k: v for k, v in patterns.items() if "top" in k or "bottom" in k or "percentile" in k},
        "Join Patterns": {k: v for k, v in patterns.items() if "join" in k},
        "Analysis Patterns": {k: v for k, v in patterns.items() if
                              "correlation" in k or "outlier" in k or "missing" in k}
    }.items():
        formatted_patterns.append(f"## {category}\n")
        for name, query in queries.items():
            formatted_patterns.append(f"**{name.replace('_', ' ').title()}:**\n```sql\n{query}\n```\n")
        formatted_patterns.append("")

    return "# SQL Query Patterns\n\n" + "\n".join(formatted_patterns)


@mcp.resource
def chart_templates() -> str:
    """Chart configuration templates and visualization best practices."""
    templates = MCPResources.get_chart_templates()
    formatted_templates = []

    for name, config in templates.items():
        formatted_templates.append(f"## {name.replace('_', ' ').title()}")
        formatted_templates.append(f"**Use Case:** {config['use_case']}")
        formatted_templates.append(f"**Best For:** {config['best_for']}")
        formatted_templates.append("**Configuration:**")
        formatted_templates.append(
            f"```json\n{json.dumps({k: v for k, v in config.items() if k not in ['use_case', 'best_for']}, indent=2)}\n```\n")

    return "# Chart Templates\n\n" + "\n".join(formatted_templates)


@mcp.resource
def workflow_guide() -> str:
    """Guide for using the LangGraph-powered analysis workflows."""
    return """
# Analysis Workflow Guide

## Natural Language Query Processing

The `natural_language_query` tool provides a complete workflow from natural language to insights:

### Workflow Steps:
1. **Intent Analysis** - Determines what type of analysis you want
2. **Schema Context** - Gathers relevant database information
3. **SQL Generation** - Converts your request to optimized SQL
4. **Query Execution** - Safely runs the generated query
5. **Chart Analysis** - Suggests optimal visualizations
6. **Chart Generation** - Creates interactive charts
7. **Summary Creation** - Provides comprehensive results

### Intent Types:
- **explore** - Browse and understand data structure
- **sql** - Query data without visualization  
- **chart** - Create visualizations (may generate data first)
- **both** - Query data AND create charts

### Example Queries:

**Data Exploration:**
- "What tables do I have?"
- "Show me sample data from the users table"
- "Explore the database structure"

**SQL Analysis:**
- "Count all orders from last month"
- "Find the top 10 customers by total purchases"
- "Show average order value by region"

**Visualization:**
- "Create a chart showing sales trends"
- "Visualize user registrations over time"
- "Compare revenue across different categories"

**Combined Analysis:**
- "Show me monthly sales and create a trend chart"
- "Find top products and visualize their performance"
- "Analyze customer segments with charts"

### Error Recovery:
The workflow includes automatic error recovery:
- SQL syntax errors are detected and corrected
- Missing joins are identified and added
- Invalid column names are mapped to correct ones
- Query optimization suggestions are applied

### Chart Intelligence:
Charts are automatically configured based on:
- Data types (numeric, categorical, datetime)
- Data distribution and patterns
- User intent keywords
- Visualization best practices
"""


# ============================================================================
# REGISTER MCP PROMPTS
# ============================================================================

@mcp.prompt
def sql_generation_prompt() -> str:
    """Prompt template for converting natural language to SQL."""
    return MCPPrompts.get_sql_generation_prompt().template


@mcp.prompt
def chart_analysis_prompt() -> str:
    """Prompt template for analyzing data and suggesting chart configurations."""
    return MCPPrompts.get_chart_analysis_prompt().template


@mcp.prompt
def intent_analysis_prompt() -> str:
    """Prompt template for analyzing user intent."""
    return MCPPrompts.get_intent_analysis_prompt().template


@mcp.prompt
def error_recovery_prompt() -> str:
    """Prompt template for analyzing and recovering from SQL errors."""
    return MCPPrompts.get_error_analysis_prompt().template


# ============================================================================
# USAGE EXAMPLE AND TESTING
# ============================================================================

async def example_usage():
    """Example of how to use the enhanced MCP server."""
    tools = MCPTools()

    # Example queries to test
    test_queries = [
        "Show me all tables in the database",
        "What are the top 10 users by registration date?",
        "Create a chart showing order counts by month",
        "Visualize the distribution of product prices",
        "Compare sales performance across different regions"
    ]

    print("🔍 Testing Enhanced MCP Server with LangGraph Integration\n")

    for query in test_queries:
        print(f"📝 Query: {query}")

        # Use the natural language workflow
        result = await tools.natural_language_query(query)

        if result["success"]:
            print(f"✅ Intent: {result['intent']}")
            if result.get("sql_query"):
                print(f"🔧 SQL: {result['sql_query']}")
            if result.get("sql_results", {}).get("row_count"):
                print(f"📊 Results: {result['sql_results']['row_count']} rows")
            if result.get("chart_data", {}).get("success"):
                print(f"📈 Chart: {result['chart_config'].get('type', 'unknown')} generated")
        else:
            print(f"❌ Error: {result['error']}")

        print("-" * 50)


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()

    # Uncomment to test the workflow
    # asyncio.run(example_usage())