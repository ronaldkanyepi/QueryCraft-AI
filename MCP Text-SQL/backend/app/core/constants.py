class Defaults:
    AUTHOR = "Ronald N. Kanyepi"
    VERSION = "0.0.1"

    # === App Metadata ===
    APP_NAME = "Default app name"
    APP_VERSION = "0.1.0"
    APP_DESCRIPTION = "This is the description of my application"
    APP_ENVIRONMENT = "local"
    APP_HOST = "127.0.0.1"
    APP_PORT = 8000

    # === Frontend Host ===
    APP_FRONTEND_HOST = "http://localhost:3000"

    # === Database ======
    DB_TYPE = "mysql"
    DB_HOST = "localhost"
    DB_PORT = 3306
    DB_NAME = "project"
    DB_USER = "user"
    DB_PASSWORD = ""

    # =======Model======
    OPENAI_API_KEY = "sk-...."
    OPENAI_MODEL_NAME = "gpt-4o"
    OPENAI_TEMPERATURE = 0.1

    # == Vector Database ====
    DEFAULT_COLLECTION_NAME = "default_collection"

    # === Auth ===
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 8  # 8 days
    CLIENT_ID = ""
    PROJECT_ID = ""
    ISSUER_URL = ""

    # === API ===
    API_V1_STR = "/api/v1"
    API_V2_STR = "/api/v2"

    # === CORS ===
    BACKEND_CORS_ORIGINS = ["http://localhost:3000"]

    # === Logging ===
    LOG_LEVEL = "INFO"
    LOG_DIR = "logs"
    LOG_JSON = False
    LOG_TO_FILE = True

    # === Storage / Cache ===
    REDIS_URI = "redis://localhost:6379"

    # =========MCP=========
    MCP_SERVER_HOST = "127.0.0.1"
    MCP_SERVER_PORT = 8004
    MCP_SERVER_NAME = "sql_server"
    MCP_SERVER_TRANSPORT = "streamable_http"

    # =======Tracing & Evaluation========
    LANGSMITH_API_KEY = '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'
    LANGSMITH_TRACING = "true"
    LANGSMITH_PROJECT = "text-to-sql-agent"
