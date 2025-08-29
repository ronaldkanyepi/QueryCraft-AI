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

    subgraph RAG_Internal_DB
        N(PostgreSQL Database)
        O[PGVector Index]
    end

    subgraph MCP_Server_AI_Tools
        P(MCP Server)
        Q[SQL Validation Tool]
        R[SQL Execution Tool]
    end

    subgraph Observability
        S(Langfuse Logging & Tracing)
    end


    A -- OAuth 2.0 --> M
    A -- API Calls --> B
    M -- Token Validation --> B

    B --> C
    C -->|/chat| F
    C -->|Other Routes| D[RAG Endpoints & Checkpoints]

    F -- Logs & Traces --> S
    F -->|orchestrates| G

    G -->|if needs clarification| H
    G -->|if main logic| I
    G -->|if other intent| L

    H -->|re-triage| G

    I -- retrieves schema & patterns --> O
    I -->|generated query| P

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

```
sequenceDiagram
    participant User
    participant Frontend (Next.js)
    participant Backend (FastAPI)
    participant Zitadel (Auth Server)

    User->>Frontend: Clicks "Login"
    Frontend->>Zitadel: Redirects for authentication
    Zitadel-->>User: Presents login page
    User->>Zitadel: Enters credentials
    Zitadel->>Frontend: Redirects back with auth code
    Frontend->>Backend: Sends code to NextAuth route
    Backend->>Zitadel: Exchanges code for Access Token
    Zitadel-->>Backend: Returns Access Token & JWT
    Backend-->>Frontend: Creates secure session cookie
    Frontend-->>User: Logged in

```

### Text-to-SQL Agent Data Flow

```
graph TD
    A[User asks: "How many users signed up last week?"] --> B{FastAPI Chat Endpoint}
    B --> C[LangGraph Agent Invoked]
    C --> D(Triage Node)
    D -->|"handle_main_logic"| E[Generate SQL Node]
    E -->|Search schema embeddings| F(pgvector)
    E -->|Generates SQL query| G[SQL Validation Node]
    G -->|Invalid SQL| H[Retry SQL Generation Node]
    H --> G
    G -->|Valid SQL| I[Execute SQL Node]
    I -->|Executes query| J(PostgreSQL DB)
    J -->|Returns results| I
    I -->|Generates summary| K[LLM for Analysis]
    K -->|Final JSON Response| B
    B -->|Streams response| A

    style C fill:#6A1B9A,stroke:#333,stroke-width:2px,color:#fff
    style J fill:#4E342E,stroke:#333,stroke-width:2px,color:#fff

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

-   Backend API: [http://localhost:8000](http://localhost:8000/)

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
