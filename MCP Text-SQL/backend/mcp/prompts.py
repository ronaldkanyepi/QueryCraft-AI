import textwrap

from langchain_core.prompts import PromptTemplate


class MCPPrompts:
    @staticmethod
    def get_intent_analysis_prompt() -> PromptTemplate:
        return PromptTemplate(
            input_variables=["user_query"],
            template="""
                    Analyze the user's query and determine their intent. Classify into one of these categories:

                    1. **explore** - User wants to understand the data structure or browse data
                    2. **sql**   - User wants to query data but doesn't mention visualization
                    3. **chart** - User wants to create visualizations (may need data first)
                    4. **both**  - User explicitly wants both data query and visualization

                    User Query: "{user_query}"

                    Look for these indicators:
                    - Exploration: "show me", "what data", "explore", "browse", "understand"
                    - SQL: "query", "select", "count", "sum", "filter", "find"
                    - Chart: "chart", "graph", "plot", "visualize", "show trends", "compare"
                    - Both: combines data requests with visualization words

                    Respond with only the classification: explore, sql, chart, or both
                    """,
        )

    @staticmethod
    def get_triage_prompt() -> PromptTemplate:
        return PromptTemplate(
            template=textwrap.dedent("""
                        IMPORTANT:

                        ## Triage Agent Instructions

                        You are a triage agent. Your task is to determine if the user's question is relevant for a text-to-sql AI agent.
                        - If the question is relevant, respond with only the single phrase: 'handle_main_logic'
                        - If the input is unclear or ambiguous (e.g. “what about customers”,"users","accounts"), respond with only: 'need_clarification'
                        - If the user intends to modify the database (e.g., insert, update, delete, create, drop, alter), respond with only the single phrase: 'handle_modification_intent'
                        - If the question is NOT relevant (e.g., a simple greeting, off-topic), respond with only the single phrase: 'handle_follow_up'


                        Do NOT add any extra words or explanation.
                        Respond with exactly one of those phrases.
                    """)
        )
