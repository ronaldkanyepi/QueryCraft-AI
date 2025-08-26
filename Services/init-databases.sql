CREATE DATABASE langfuse_db;
CREATE DATABASE zitadel_db;
CREATE DATABASE text_to_sql_db;
CREATE DATABASE sakila_db;
CREATE DATABASE airflow_db;

GRANT ALL PRIVILEGES ON DATABASE zitadel_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE langfuse_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE text_to_sql_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sakila_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE zitadel_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE airflow_db TO postgres;

-- -- This will cascade to install pg vector as well
-- CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;
-- CREATE EXTENSION IF NOT EXISTS pg_duckdb;
