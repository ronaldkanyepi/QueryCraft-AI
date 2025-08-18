import textwrap
from typing import Dict
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine,AsyncEngine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect
from app.core.config import settings
from loguru import logger

class MCPResources:
    _engine = None

    @staticmethod
    def get_engine():
        if MCPResources._engine is None:
            MCPResources._engine = create_engine(settings.DATABASE_URL)
        return MCPResources._engine

    @staticmethod
    def get_database_schema() -> str:
        try:
            inspector = inspect(MCPResources.get_engine())
            table_names = inspector.get_table_names()
            schema_parts = []

            for table_name in table_names:
                try:
                    table_comment = inspector.get_table_comment(table_name).get("text", "")
                    columns = inspector.get_columns(table_name)
                    foreign_keys = inspector.get_foreign_keys(table_name)
                    indexes = inspector.get_indexes(table_name)

                    fk_lookup = {}
                    for fk in foreign_keys:
                        for col in fk.get("constrained_columns", []):
                            fk_lookup[col] = f"References {fk['referred_table']}.{fk['referred_columns'][0]}"

                    column_details = []
                    for col in columns:
                        col_info = f"{col['name']} ({col['type']})"
                        if col.get('nullable', True):
                            col_info += " NULL"
                        else:
                            col_info += " NOT NULL"
                        if col.get('default'):
                            col_info += f" DEFAULT {col['default']}"
                        if col['name'] in fk_lookup:
                            col_info += f" - {fk_lookup[col['name']]}"
                        if col.get('comment'):
                            col_info += f" -- {col['comment']}"
                        column_details.append(col_info)

                    index_info = []
                    for idx in indexes:
                        idx_cols = ", ".join(idx['column_names'])
                        idx_type = "UNIQUE" if idx.get('unique') else "INDEX"
                        index_info.append(f"{idx_type} {idx['name']} ({idx_cols})")

                    table_parts = []
                    table_parts.append(f"TABLE: {table_name}")
                    table_parts.append(f"Description: {table_comment or 'No description available'}")

                    table_parts.append("Columns:")
                    for col in column_details:
                        table_parts.append(f"  - {col}")

                    if index_info:
                        table_parts.append("Indexes:")
                        for idx in index_info:
                            table_parts.append(f"  - {idx}")

                    if fk_lookup:
                        table_parts.append("Foreign Keys:")
                        for fk_string in fk_lookup.values():
                            table_parts.append(f"  - {fk_string}")

                    table_schema = "\n".join(table_parts)
                    schema_parts.append(table_schema)

                except Exception as e:
                    logger.warning(f"Error processing table {table_name}: {e}")
                    continue

            return "\n" + "\n\n".join(schema_parts)

        except Exception as e:
            return f"Error retrieving schema: {str(e)}"

    @staticmethod
    def get_sql_patterns() -> Dict[str, str]:
        """SQL query patterns for different analytical tasks."""
        return {
            # Basic patterns
            "count_all": "SELECT COUNT(*) as total_count FROM {table}",
            "sample_data": "SELECT * FROM {table} LIMIT {limit}",
            "distinct_values": "SELECT DISTINCT {column} FROM {table} ORDER BY {column}",

            # Aggregation patterns
            "group_count": "SELECT {group_by}, COUNT(*) as count FROM {table} GROUP BY {group_by} ORDER BY count DESC",
            "sum_by_group": "SELECT {group_by}, SUM({sum_column}) as total FROM {table} GROUP BY {group_by} ORDER BY total DESC",
            "avg_by_group": "SELECT {group_by}, AVG({avg_column}) as average FROM {table} GROUP BY {group_by} ORDER BY average DESC",

            # Time-based patterns
            "daily_counts": "SELECT DATE({date_column}) as date, COUNT(*) as count FROM {table} GROUP BY DATE({date_column}) ORDER BY date",
            "monthly_trends": "SELECT DATE_TRUNC('month', {date_column}) as month, COUNT(*) as count FROM {table} GROUP BY month ORDER BY month",
            "recent_data": "SELECT * FROM {table} WHERE {date_column} >= CURRENT_DATE - INTERVAL '{days} days'",

            # Ranking patterns
            "top_n": "SELECT * FROM {table} ORDER BY {order_column} DESC LIMIT {n}",
            "bottom_n": "SELECT * FROM {table} ORDER BY {order_column} ASC LIMIT {n}",
            "percentiles": "SELECT {column}, PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY {column}) as q1, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {column}) as median, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY {column}) as q3 FROM {table}",

            # Join patterns
            "inner_join": "SELECT * FROM {table1} t1 INNER JOIN {table2} t2 ON t1.{key1} = t2.{key2}",
            "left_join": "SELECT * FROM {table1} t1 LEFT JOIN {table2} t2 ON t1.{key1} = t2.{key2}",
            "count_with_join": "SELECT t1.{column}, COUNT(t2.{ref_column}) as count FROM {table1} t1 LEFT JOIN {table2} t2 ON t1.{key1} = t2.{key2} GROUP BY t1.{column}",

            # Analysis patterns
            "correlation_prep": "SELECT {col1}, {col2} FROM {table} WHERE {col1} IS NOT NULL AND {col2} IS NOT NULL",
            "outlier_detection": "SELECT * FROM {table} WHERE {column} > (SELECT AVG({column}) + 3 * STDDEV({column}) FROM {table}) OR {column} < (SELECT AVG({column}) - 3 * STDDEV({column}) FROM {table})",
            "missing_data": "SELECT COUNT(*) as total_rows, COUNT({column}) as non_null_rows, COUNT(*) - COUNT({column}) as null_rows FROM {table}"
        }

    @staticmethod
    def get_chart_templates() -> Dict[str, Dict]:
        return {
            "comparison_bar": {
                "type": "bar",
                "orientation": "v",
                "title": "Comparison Analysis",
                "use_case": "Comparing values across categories",
                "best_for": "categorical_x_numeric_y"
            },
            "time_series": {
                "type": "line",
                "title": "Trend Analysis",
                "use_case": "Showing changes over time",
                "best_for": "datetime_x_numeric_y"
            },
            "distribution": {
                "type": "histogram",
                "title": "Distribution Analysis",
                "nbins": 30,
                "use_case": "Understanding data distribution",
                "best_for": "single_numeric_column"
            },
            "correlation": {
                "type": "scatter",
                "title": "Correlation Analysis",
                "use_case": "Finding relationships between variables",
                "best_for": "two_numeric_columns"
            },
            "proportion": {
                "type": "pie",
                "title": "Proportion Analysis",
                "use_case": "Showing parts of a whole",
                "best_for": "categorical_with_counts"
            },
            "comparison_multi": {
                "type": "bar",
                "barmode": "group",
                "title": "Multi-Category Comparison",
                "use_case": "Comparing multiple metrics across categories",
                "best_for": "categorical_x_multiple_numeric"
            },
            "box_plot": {
                "type": "box",
                "title": "Statistical Summary",
                "use_case": "Understanding distribution and outliers",
                "best_for": "categorical_x_numeric_distribution"
            }
        }

