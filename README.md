# Text-to-Analytics Platform

## 1. Project Overview & Business Problem

The Text-to-Analytics Platform is an advanced data analytics solution designed to bridge the gap between natural language and structured databases. It addresses a critical business problem: the inability of non-technical users to directly query and analyze complex datasets.

By leveraging a sophisticated AI agent, the platform transforms user questions---posed in plain English---into precise PostgreSQL queries. It then executes these queries, analyzes the results, and delivers actionable insights, visualizations, and summaries. This empowers stakeholders to make faster, data-driven decisions without writing a single line of SQL, effectively democratizing data access and streamlining analytical workflows.

**Core Business Value:**

- **Automation:** Automates the analytics workflow from question to insight.
- **Accessibility:** Enables business users, analysts, and executives to self-serve their data needs.
- **Efficiency:** Reduces the time and effort required to extract insights from databases.
- **Data-Driven Culture:** Fosters a culture of data-driven decision-making by removing technical barriers.

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
            K[Execute SQL & Analyze Node]
            L[Follow-up & Modification Nodes]
        end
    end

    subgraph System_Database
        N(PostgreSQL Database)
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
    F -- retrieves context from --> O_STM
    F -->|orchestrates| G

    G -->|if needs clarification| H
    G -->|if main logic| I
    G -->|if other intent| L

    H -->|re-triage| G

    I -- retrieves general knowledge from --> O_S
    I -- retrieves schema & patterns from --> O_P
    I -- retrieves history from --> O_E
    I -->|generated query| P

    O_S -- connected to --> O
    O_P -- connected to --> O
    O_E -- connected to --> O
    O_STM -- connected to --> O

    P -->|sends query for validation| Q
    Q -->|if valid| R
    Q -->|if invalid| I

    R -->|executes on| N
    R -->|returns results| K

    K -->|analyzes & responds| F

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
```

**Key Components:**

-   **Frontend:** Next.js 15 + React 19, Radix UI, Lucide Icons, Tailwind CSS, Zustand for state management, NextAuth.js + Zitadel for OAuth 2.0.

-   **Backend:** FastAPI with Uvicorn, RESTful endpoints, secured via fastapi-zitadel-auth, RBAC, slowapi rate-limiting.

-   **Database & Vector Store:** PostgreSQL with pgvector, Docker-managed, stores schema embeddings for AI agent reasoning.

-   **AI Orchestration:** LangGraph for multi-step reasoning (SQL generation, validation, execution), Langfuse for tracing and observability.

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

### Text-to-SQL Agent Data Flow

```mermaid
graph LR
    %% ===================== Groups =====================
    subgraph Frontend_NextJS
        FE[Next.js UI]
    end

    subgraph Security_Services
        Z[Zitadel]
    end

    subgraph Backend_Python_FastAPI
        API[FastAPI Backend]
        RT{API Router}
        D[RAG Endpoints & Checkpoints]
    end

    subgraph LangGraph_Agent_Logic
        AG[LangGraph Agent]
        subgraph Internal_Nodes
            TRI[Triage Node]
            CL[Clarification Node]
            GEN[Generate SQL Node]
            VAL[Validate SQL Node]
            RETRY[Retry Generate SQL <= 3]
            EXEC[Execute SQL & Analyze Node]
            OTH[Follow-up & Modification Nodes]
        end
    end

    subgraph System_Database
        PG[(PostgreSQL)]
        subgraph Long_Term_Memory
            SM[Semantic Memory]
            PM[Procedural Memory]
            EM[Episodic Memory]
        end
        STM[Short-Term Memory]
        subgraph RAG_Store
            EMB[Embeddings - docs/schema/examples]
            IDX[pgvector index]
        end
    end

    subgraph MCP_Server_AI_Tools
        MCP[MCP Server]
        VTool[SQL Validation Tool]
        ETool[SQL Execution Tool]
    end

    subgraph Observability
        LF[Langfuse Logging & Tracing]
    end

    %% ===================== Flows =====================
    %% Auth + API
    FE -->|OAuth 2.0| Z
    FE -->|API calls| API
    Z -->|Token validation| API

    API --> RT
    RT -->|/chat| AG
    RT -->|/rag/* upsert/search| D

    %% Observability
    AG -->|logs/traces| LF

    %% Agent orchestration
    AG --> TRI
    TRI -->|need clarification| CL
    TRI -->|main logic| GEN
    TRI -->|other intent| OTH
    CL -->|re-triage| TRI

    %% ----- Retrieval: memory & RAG -----
    STM --> AG
    SM --> GEN
    PM --> GEN
    EM --> GEN
    IDX --> GEN
    IDX --> CL

    %% ----- RAG ingestion & index -----
    D -- upsert --> EMB
    EMB -- indexed by --> IDX

    %% ----- SQL via MCP -----
    GEN -->|generated SQL| MCP
    MCP -->|validate| VTool
    VTool -->|valid| ETool
    VTool -->|invalid| RETRY
    RETRY --> GEN

    ETool -->|executes on| PG
    ETool -->|rows| EXEC

    %% Respond + Memory updates
    EXEC -->|analyze & respond| AG
    AG -->|update| STM
    AG -->|update| SM
    AG -->|update| PM
    AG -->|update| EM

    EXEC -->|stream result| API
    API --> FE

    OTH --> END

    %% ===================== Styling =====================
    style FE fill:#2E7D32,stroke:#333,stroke-width:2px,color:#fff
    style API fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style RT fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style D fill:#1565C0,stroke:#333,stroke-width:2px,color:#fff
    style Z fill:#FF8F00,stroke:#333,stroke-width:2px,color:#fff

    style AG fill:#6A1B9A,stroke:#333,stroke-width:2px,color:#fff
    style TRI fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    style CL fill:#FFC107,stroke:#333,stroke-width:2px,color:#000
    style GEN fill:#AB47BC,stroke:#333,stroke-width:2px,color:#fff
    style VAL fill:#9E9E9E,stroke:#333,stroke-width:2px,color:#fff
    style RETRY fill:#BDBDBD,stroke:#333,stroke-width:2px,color:#000
    style EXEC fill:#1E88E5,stroke:#333,stroke-width:2px,color:#fff
    style OTH fill:#E53935,stroke:#333,stroke-width:2px,color:#fff

    style PG fill:#4E342E,stroke:#333,stroke-width:2px,color:#fff
    style STM fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style SM fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style PM fill:#FDD835,stroke:#333,stroke-width:2px,color:#000
    style EM fill:#FDD835,stroke:#333,stroke-width:2px,color:#000

    style EMB fill:#FFF176,stroke:#333,stroke-width:2px,color:#000
    style IDX fill:#FFD54F,stroke:#333,stroke-width:2px,color:#000

    style MCP fill:#7CB342,stroke:#333,stroke-width:2px,color:#fff
    style VTool fill:#9E9E9E,stroke:#333,stroke-width:2px,color:#fff
    style ETool fill:#9E9E9E,stroke:#333,stroke-width:2px,color:#fff

    style LF fill:#4DD0E1,stroke:#333,stroke-width:2px,color:#000

```

* * * * *

4\. Core Features & Endpoints
-----------------------------

-   `GET /health`: Application health check

-   `POST /chat`: Main endpoint for Text-to-SQL agent (secured)

-   `GET /users/me`: Authenticated user profile

-   `GET /collections`: Lists data collections

-   `POST /documents/upsert`: Upload & index documents

-   `POST /search`: Semantic search over documents

-   `GET /analytics`: Retrieve Langfuse analytics

* * * * *

5\. Module Responsibilities
---------------------------

```
graph TD
    subgraph Core Logic
        A["app/agent/graph.py"]
        B["app/services/memory.py"]
    end

    subgraph API Layer
        C["app/api/api.py"]
        D["app/api/endpoints/chat.py"]
    end

    subgraph Infrastructure
        E["app/core/auth.py"]
        F["app/core/db.py"]
        G["app/core/langfuse.py"]
    end

    A --> B
    C --> D
    D --> A
    A --> E
    A --> F
    A --> G

```

-   `app/agent/graph.py`: LangGraph agent, all nodes & logic

-   `app/api/`: FastAPI routers and endpoints

-   `app/core/`: Core components (auth, DB, Langfuse)

-   `app/services/`: MemoryTools & business logic

* * * * *

6\. Setup & Installation
------------------------

### Prerequisites

-   Docker & Docker Compose

-   Python 3.13+

-   Node.js + npm

-   Running Zitadel instance

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

### 5\. Dev Tools

-   `make lint` / `make format`: Lint and format code

-   `make studio`: LangGraph Studio

-   `make inspector`: MCP dev server

-   `make kill-port PORT=8000`: Kill process on port

* * * * *

7\. Business & Technical Summary
--------------------------------

This platform demonstrates modern full-stack engineering:

-   **AI & Automation:** LangGraph-driven text-to-SQL agent

-   **Observability:** Langfuse traces & analytics

-   **Security:** Zitadel OAuth 2.0 + RBAC

-   **DevOps-Friendly:** Docker, Makefile, Alembic migrations

-   **User-Friendly:** Non-technical users can analyze data seamlessly
