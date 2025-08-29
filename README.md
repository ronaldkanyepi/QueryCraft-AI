### QueryCraft AI

QueryCraft AI is a powerful tool that helps everyone, even those without technical expertise, get the data they need from complex databases. It solves a common business problem: getting stuck when you can't write code to find the answers you're looking for.

Think of it as your personal data analyst. You simply ask a question in plain English, such as "How many new customers did we get last week?" and the platform handles the rest. It uses AI to convert your question into a precise database query, runs the query, interprets the results, and provides a clear summary with visuals.

Ultimately, this platform is designed to make work easier and organizations smarter. It helps you:

* **Automate** complex tasks, so you can go from question to insight quickly.
* **Access** data directly, without relying on a technical team.
* **Boost efficiency** by reducing the time and effort spent on data analysis.
* **Build a data-driven culture** by making information accessible to everyone.


---

## 2. Technical Architecture

The platform is built on a modern, decoupled architecture featuring a Next.js frontend, a FastAPI backend, and a suite of services for authentication, orchestration, and observability.

```mermaid
graph TD
    subgraph Frontend_NextJS
        A[Next.js UI]
    end

    subgraph Security_Services
        M(Zitadel)
    end

    subgraph Backend_Python_FastAPI
        B(FastAPI Backend)
        C{API Router}
    end

    subgraph LangGraph_Agent_Logic
        F(LangGraph Agent)
        subgraph Internal_Nodes
            G[Triage Node]
            H[Clarification Node]
            I[Generate SQL Node]
            V[Validate SQL Node]
            K[Execute SQL & Analyze Node]
            L[Follow-up & Modification Nodes]
            END[END]
        end
    end

    subgraph System_Database
        subgraph Long_Term_Memory
            O_S[Semantic Memory Table]
            O_P[Procedural Memory Table]
            O_E[Episodic Memory Table]
        end
        O[PGVector Index]
        O_STM[Short-Term Memory Table]
    end

    subgraph MCP_Server_AI_Tools
        P(MCP Server)
        Q[SQL Validation Tool]
        R[SQL Execution Tool]
    end

    subgraph External_Database
        N(PostgreSQL Database)
    end

    subgraph Observability
        S(Langfuse Logging & Tracing)
    end

    %% Define the correct flow and connections
    A -- OAuth 2.0 --> M
    A -- API Calls --> B
    M -- Token Validation --> B

    B --> C
    C -->|/chat| F
    C -->|Other Routes| D[RAG Endpoints & Checkpoints]

    F -- Logs & Traces --> S
    F -- retrieves conversational context from --> O_STM
    F -->|orchestrates| G

    G -->|if needs clarification| H
    G -->|if main logic| I
    G -->|if other intent| L

    H -->|re-triage| G
    H -->|end conversation| END

    I -- retrieves general knowledge from --> O_S
    I -- retrieves schema & patterns from --> O_P
    I -- retrieves history from --> O_E
    I -->|generated query| V

    V -->|sends query for validation| Q
    Q -->|if valid| K
    Q -->|if invalid| I

    K -->|calls tool| R
    R -->|executes on| N
    R -->|returns results| K

    K -->|analyzes & responds| END

    END -->|returns final state| F
    F -->|updates short-term memory| O_STM
    F -->|updates long-term memory| O_E

    F -->|streams final response| B
    B -->|displays response| A

    O_S -- connected to --> O
    O_P -- connected to --> O
    O_E -- connected to --> O
    O_STM -- connected to --> O

    L --> END

    style A fill:#2E7D32,stroke:#333,stroke-width:2px,color:#fff
    style B fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style C fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style D fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style M fill:#FF8F00,stroke:#333,stroke-width:2px,color:#fff
    style F fill:#6A1B9A,stroke:#333,stroke-width:2px,color:#fff
    style G fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    style H fill:#FFC107,stroke:#333,stroke-width:2px,color:#000
    style I fill:#AB47BC,stroke:#333,stroke-width:2px,color:#fff
    style J fill:#8E24AA,stroke:#333,stroke-width:2px,color:#fff
    style V fill:#6D4C41,stroke:#333,stroke-width:2px,color:#fff
    style K fill:#1E88E5,stroke:#333,stroke-width:2px,color:#fff
    style L fill:#E53935,stroke:#333,stroke-width:2px,color:#fff
    style N fill:#4E342E,stroke:#333,stroke-width:2px,color:#fff
    style O fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style P fill:#7CB342,stroke:#333,stroke-width:2px,color:#fff
    style Q fill:#9E9E9E,stroke:#333,stroke-width:2px,color:#fff
    style R fill:#9E9E9E,stroke:#333,stroke-width:2px,color:#fff
    style S fill:#4DD0E1,stroke:#333,stroke-width:2px,color:#000
    style O_S fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style O_P fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style O_E fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style O_STM fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style END fill:#000000,stroke:#333,stroke-width:2px,color:#fff
```

**Key Components:**

- **Frontend:** Next.js 15 + Shadcn for UI, NextAuth.js + Zitadel for OAuth 2.0 authentication.
- **Backend:** FastAPI with Uvicorn, serving RESTful endpoints; secured via fastapi-zitadel-auth with RBAC and slowapi for rate limiting.
- **Database & Vector Store:** PostgreSQL with pgvector, managed via Docker; stores both application data and schema embeddings used by AI agents.
- **AI Orchestration:** LangGraph handles multi-step reasoning (SQL generation → validation → execution), MCP provides structured prompts, tools, and resources, and Langfuse handles tracing, observability, and evaluation of agent actions and outputs.


* * * * *

3\. Core Workflows & Diagrams
-----------------------------

### User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Next.js)
    participant NextAuth Route Handler
    participant Backend (FastAPI)
    participant Zitadel (Auth Server)

    User->>Frontend: Clicks "Login"
    Frontend->>Zitadel: Redirects for authentication
    Zitadel-->>User: Presents login page
    User->>Zitadel: Enters credentials
    Zitadel-->>Frontend: Redirects with auth code

    Frontend->>NextAuth Route Handler: Receives code at /api/auth/callback/zitadel
    NextAuth Route Handler->>Zitadel: Exchanges code for Access Token & JWT
    Zitadel-->>NextAuth Route Handler: Returns Tokens
    NextAuth Route Handler-->>Frontend: Creates secure session cookie

    Frontend->>User: Logged in

    Note over User, Frontend: Subsequent API Calls
    User->>Frontend: Makes request to protected API
    Frontend->>Backend: Forwards request with JWT Access Token
    Backend->>Zitadel: Validates Access Token
    Zitadel-->>Backend: Confirms validity
    Backend-->>Frontend: Responds with data

```

* * * * *

4\. Core Features & Endpoints
-----------------------------

4. Core Features & Endpoints
-----------------------------

- `GET /health`: Application health check (public, no auth required)

- `POST /chat`: Main endpoint for Text-to-SQL agent (requires Zitadel OAuth 2.0)

- `GET /users/me`: Retrieve authenticated user profile (requires OAuth)

- `GET /collections`: List all collections (requires OAuth)

- `POST /collections`: Create a new collection (requires OAuth)

- `GET /collections/{collection_id}`: Retrieve a specific collection (requires OAuth)

- `PATCH /collections/{collection_id}`: Update a collection (requires OAuth)

- `DELETE /collections/{collection_id}`: Delete a collection (requires OAuth)

- `POST /documents/{collection_id}`: Upload and index documents to a collection (requires OAuth, multipart/form-data)

- `GET /documents/{collection_id}`: List documents in a collection (requires OAuth, supports `limit` & `offset` query params)

- `DELETE /documents/{collection_id}/{document_id}`: Delete a specific document (requires OAuth)

- `POST /documents/{collection_id}/search`: Semantic search over documents (requires OAuth)

- `GET /analytics`: Retrieve Langfuse analytics (requires OAuth)

* * * * *

5\. Module Responsibilities
---------------------------

``` mermaid
graph TD
    subgraph Initialization
        M["main.py"]
    end

    subgraph API Layer
        C["app/api/routes.py"]
        D["app/api/endpoints/chat.py"]
    end

    subgraph Core Logic
        A["app/agent/graph.py"]
        B["app/services/memory.py"]
    end

    subgraph Infrastructure
        E["app/core/auth.py"]
        F["app/core/db.py"]
        G["app/core/langfuse.py"]
        H["app/core/memory.py"]
        I["app/core/config.py"]
    end

    subgraph Models & Schemas
        J["app/models/"]
        K["app/schemas/"]
    end

    subgraph Utilities
        L["app/utils/"]
    end

    %% Initialization flow
    M --> I
    M --> E
    M --> F
    M --> G
    M --> H
    M --> B
    M --> A
    M --> C

    %% API routing
    C --> D
    D --> A

    %% Core logic dependencies
    A --> B
    A --> H
    A --> F
    A --> G

    %% Supporting modules
    A --> J
    D --> K
    A --> L


```

- `app/agent/`: LangGraph agent, defining all orchestration nodes,tools,state and logic
- `app/api/`: FastAPI routers and endpoint handlers
- `app/core/`: Core components (auth, DB, Langfuse, memory, config)
- `app/services/`: MemoryTools and business logic
- `app/models/`: ORM models for database tables
- `app/schemas/`: Pydantic schemas for request/response validation
- `app/utils/`: Helper functions and shared utilities


* * * * *

6\. Setup & Installation
------------------------

### Prerequisites
-   Docker & Docker Compose
-   Python 3.13+
-   [uv](https://docs.astral.sh/uv/getting-started/installation/) for dependency management in python
-   Node.js + npm
-   Running Zitadel instance
-   Running Langfuse instance / Cloud - they have a generous offer

### 1\. Environment Variables

```
# Copy .env.example in each directory and configure
cp Code/backend/.env.example Code/backend/.env
cp Code/frontend/.env.example Code/frontend/.env
cp Services/.env.example Services/.env

```

### 2\. Start Services (Docker & Makefile)

```
# Start all services
make start

# Rebuild and start
make rebuild

# Stop all services
make stop

# Follow logs
make logs

# Check service status
make status

```

Docker Compose files live in `Services/`:

```
docker-compose -f Services/docker-compose.db.yaml up -d
docker-compose -f Services/docker-compose.langfuse.yaml up -d
docker-compose -f Services/docker-compose.zitadel.yaml up -d

```

### 3\. Backend Setup

```
cd Code/backend

# Create virtual environment & install dependencies
make setup
source .venv/bin/activate

# Synchronize dependencies
uv sync

# Run Alembic migrations
make migrate
# or manually
uv run alembic upgrade head

# Start FastAPI server
uvicorn main:app --reload

```

### 4\. Frontend Setup

```
cd Code/frontend
npm install
npm run dev

```

-   Frontend: [http://localhost:3000](http://localhost:3000/)
-   Backend API: [http://localhost:8005](http://localhost:8005/)
-   Zitadel Console: [http://localhost:8080](http://localhost:8080/)
-   Langfuse: [http://localhost:3000](http://localhost:3000/)
-   MCP Server: [http://localhost:8004](http://localhost:8004/)

### 5\. Dev Tools

-   `make lint` / `make format`: Lint and format code

-   `make studio`: LangGraph Studio

-   `make inspector`: MCP dev server

-   `make kill-port PORT=8000`: Kill process on port

* * * * *

7\. Business & Technical Summary
--------------------------------

Query Craft AI for easy analytics:

-   **AI & Automation:** LangGraph-driven text-to-SQL agent

-   **Observability:** Langfuse traces & analytics

-   **Security:** Zitadel OAuth 2.0 + RBAC

-   **DevOps-Friendly:** Docker, Makefile, Alembic migrations,Gituhub Actions & PreCommit Hooks

-   **User-Friendly:** Non-technical users can analyze data seamlessly
