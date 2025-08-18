.PHONY: help start stop restart rebuild status logs health setup migrate format lint clean studio inspector kill-mcp-port

# Default target: show help message
help: ## Shows this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | while read -r line ; do \
		target=$$(echo $$line | cut -d':' -f1); \
		comment=$$(echo $$line | sed -E 's/^[a-zA-Z_-]+:.*?## //'); \
		printf "  %-20s %s\n" $$target $$comment; \
	done

# Service management
start: ## Start all services
	docker compose up -d

rebuild: ## Rebuild and start all services (no cache)
	docker compose build --no-cache
	docker compose up -d

stop: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

status: ## Show service status
	docker compose ps

logs: ## Show service logs
	docker compose logs -f

# Health checks with optional jq
health: ## Check all services health
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health | jq .
	@curl -s http://localhost:9200/_cluster/health | jq .
	@curl -s http://localhost:8080/api/v2/monitor/health | jq .
	@curl -s http://localhost:11434/api/version | jq .

# Kill process on a port (default 6277)
PORT ?= 6277
kill-mcp-port: ## Find and kill a process by port (default: $(PORT))
	@pid=$$(lsof -t -i :$(PORT)); \
	if [ -n "$$pid" ]; then \
		echo "Port $(PORT) is in use by PID $$pid. Terminating process..."; \
		kill -9 $$pid; \
		echo "Process $$pid terminated successfully."; \
	else \
		echo "No process found listening on port $(PORT)."; \
	fi

# Development setup
setup: ## Install dependencies, activate venv (macOS)
	uv sync
	. .venv/bin/activate

migrate: ## Run database migrations
	alembic upgrade head

format: ## Format code with ruff
	uv run ruff format

lint: ## Lint and type check with ruff and mypy
	uv run ruff check --fix
	uv run mypy src/

# Cleanup
clean: ## Stop and remove all containers, prune docker system
	docker compose down -v
	docker system prune -f

# LangGraph studio UI
studio: ## Run langgraph studio UI for evaluations and traces
	langgraph dev

# MCP development server
MCP_SERVER_SCRIPT ?= ./mcp/server.py
inspector: ## Set PYTHONPATH and run MCP development server
	PYTHONPATH=. fastmcp dev $(MCP_SERVER_SCRIPT)
