# QueryCraft-AI Backend

This is the backend for QueryCraft-AI, a powerful and flexible AI-powered query crafting system. This backend is built with Python, FastAPI, and LangGraph, providing a robust and scalable foundation for the AI agent and its surrounding services.

## Features

*   **FastAPI Backend:** A modern, fast (high-performance), web framework for building APIs with Python 3.8+ based on standard Python type hints.
*   **LangGraph Integration:** Uses LangGraph for building stateful, multi-actor applications with LLMs.
*   **Dockerized Services:** All services are containerized with Docker for easy setup, deployment, and scalability.
*   **Makefile Automation:** Simplified development workflow with a comprehensive `Makefile` for common tasks.
*   **Database Migrations:** Uses Alembic for database schema migrations.
*   **Code Quality:** Enforces code quality with `ruff` for linting and formatting.
*   **Dependency Management:** Uses `uv` for fast and efficient dependency management.

## Project Structure

```
.
├── app/
│   ├── agent/        # LangGraph agent definition
│   ├── api/          # FastAPI routes and middleware
│   ├── core/         # Core application logic, config, and settings
│   ├── experiments/  # Experimental and test scripts
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas for data validation
│   ├── services/     # Business logic and services
│   └── utils/        # Utility functions and helpers
├── mcp/              # MCP (Multi-Agent Control Plane) server
├── migrations/       # Alembic database migrations
├── tests/            # Automated tests
├── .env.example      # Example environment variables
├── alembic.ini       # Alembic configuration
├── docker-compose.yaml # Docker Compose configuration
├── Makefile          # Automation scripts
├── pyproject.toml    # Project metadata and dependencies
└── README.md         # This file
```

## Getting Started

### Prerequisites

*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)
*   [Python 3.11+](https://www.python.org/downloads/)
*   `uv` (recommended check astral [website](https://docs.astral.sh/uv/getting-started/installation/) for installation instruction)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/QueryCraft-AI.git
    cd QueryCraft-AI/Code/backend
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    make setup
    ```
    This will create a `.venv` directory and install all the required dependencies using `uv`.

3.  **Activate the virtual environment:**
    ```bash
    source .venv/bin/activate
    ```

4.  **Set up environment variables:**
    Copy the `.env.example` file to `.env` and fill in the required values.
    ```bash
    cp .env.example .env
    ```

5.  **Run database migrations:**
    ```bash
    make migrate
    ```

6.  **Start the services:**
    ```bash
    make start
    ```
    This will start all the services in detached mode using Docker Compose.

## Usage

The `Makefile` provides several commands to streamline the development workflow:

| Command | Description |
| --- | --- |
| `make help` | Shows the help message with all available commands. |
| `make start` | Start all services in detached mode. |
| `make stop` | Stop and remove all services. |
| `make restart` | Restart all running services. |
| `make rebuild` | Rebuild services without cache and start. |
| `make status` | Show the status of all services. |
| `make logs` | Follow the logs of all services. |
| `make clean` | Stop, remove all containers, and prune docker system. |
| `make health` | Check the health of all running services. |
| `make setup` | Create venv and install dependencies using uv. |
| `make migrate` | Run database migrations using alembic. |
| `make format` | Format code using ruff. |
| `make lint` | Lint and type-check code with ruff. |
| `make studio` | Run the LangGraph studio UI. |
| `make inspector` | Run the MCP development server. |
| `make kill-port` | Find and kill a process by port. |

## Development

### Code Formatting and Linting

We use `ruff` for code formatting and linting. To format the code, run:
```bash
make format
```

To lint the code, run:
```bash
make lint
```

### Testing

To run the test suite, use the following command:
```bash
pytest
```

## Deployment

The application is designed to be deployed using Docker. You can use the `docker-compose.yaml` file as a starting point for your deployment configuration.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
 licensed under the MIT License. See the `LICENSE` file for details.
