How to run

- >  $env:PYTHONPATH = "."
- fastmcp dev .\app\mcp\server.py


STDIO-
- > uv run "D:\PORTFOLIO PROJECTS\MCP Text-SQL\app\mcp\server.py"

With stremable-http
run the server file first
the connect on browser e.g  http://127.0.0.1:8005/mcp


-> [Check the inspector documentation](https://medium.com/@laurentkubaski/how-to-use-mcp-inspector-2748cd33faeb)


Force kill all MCP tasks
-  netstat -ano | findstr :6277
-  taskkill /PID 61079 /F
- > Get-Process | Where-Object { $_.ProcessName -like "*python*" -or $_.ProcessName -like "*fastmcp*" -or $_.ProcessName -like "*mcp*" } | Stop-Process -Force


```mermaid
graph TD

    %% Phase 1: Triage & Intent
    subgraph "Phase 1: Triage & Intent"
        A[User Query]--> B{1. Decide: New SQL or Follow-up?} -- Generate User Summary--> C(1. Summarize History)
    end

    %% Phase 2: Dynamic Context Building (RAG)
    subgraph "Phase 2: Dynamic Context Building (RAG)"
        RAG_IN(( )) --> D[3. Retrieve Similar SQL Examples<br> Reranking / Retrieval]
        RAG_IN(( )) --> E[4. Retrieve Relevant Schema<br> Scoped Schema Detection]
    end

    %% Phase 3: Generation & Correction Loop
    subgraph "Phase 3: Generation & Correction Loop"
        F[5. Generate SQL w/ Context<br> LLM SQL Generation] --> G{6. Execute & Validate<br>⚙️ MCP + Safety Checks}
        G -- "Error? Retry" --> F
        G -- "Success" --> H
    end

    %% Phase 4: Post-Processing & Verification
    subgraph "Phase 4: Post-Processing & Verification"
        H[7. Generate Natural Language Answer] --> I{8. Check for Aggregations}
        I -- "Yes" --> J[Fetch Raw Data to Verify<br> Math Verification]
        I -- "No" --> K[9. Correct LLM Math]
        J --> K
    end

    %% Phase 5: Final Output
    subgraph "Phase 5: Final Output"
        L[10. Package Response for UI<br> Answer + SQL + Reasoning]
    end

    %% Main Flow Connections
    C -- "New SQL Needed" --> RAG_IN
    D & E --> F
    K --> L
    B -- "Follow-up / No SQL" --> L

```


```mermaid
graph TD

    subgraph "Stage 1"
        A[_START_] -- "User Asks a Question" --> B{ Triage : Classify Question}
        B -- "Ambiguous Question"  --> C[clarification]
        B -- "Irrelevant Question" --> D[Handle Irrelevant Questions ]
        B -- "Handle DB Modifications Intent" --> E[Handle DB Modifications]
        C -- "Human Feedback" --> B

    end

    subgraph "Stage 2"
          B -- "Relevant Question"   --> F[main_logic]
    end

    subgraph "Final Stage"
        D -- "Terminate" --> X[_END_]
        C --"Max Retries Exceeded (3)"--> X
        E -- "Terminate" --> X
        F -- "Terminate" --> X
    end



```
