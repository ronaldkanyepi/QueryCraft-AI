from datetime import datetime

from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from resources import MCPResources


class MCPTools:
    @staticmethod
    def list_tables() -> dict:
        """
        Lists all tables in the connected database using a shared engine.

        Returns:
         dict: A dictionary with the table list or an error message.
        """
        try:
            engine = MCPResources.get_engine()
            inspector = inspect(engine)
            table_names = inspector.get_table_names()
            return {"success": True, "tables": table_names}

        except SQLAlchemyError as e:
            return {
                "success": False,
                "error": "Database connection failed. The server may be down or the credentials may be incorrect.",
                "tables": []
            }

    @staticmethod
    def validate_sql_syntax(query: str) -> dict:
        try:
            engine = MCPResources.get_engine()
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
    def execute_sql_query(query: str, limit: int = 10) -> dict:
        engine = MCPResources.get_engine()
        try:
            with engine.connect() as connection:
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
        except SQLAlchemyError as e:
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "error_type": type(e).__name__
            }

    @staticmethod
    def get_sample_data(table_name: str, limit: int = 5) -> dict:
        query = f"SELECT * FROM {table_name} LIMIT {limit}"
        return MCPTools.execute_sql_query(query, limit)
