.PHONY: up down restart logs ps shell-backend shell-db \
        migrate migrate-revert migrate-show \
        backup restore \
        prod-up prod-down prod-build \
        install clean

# ─── Dev ──────────────────────────────────────────────────────────────────────

up:          ## Start all services in development mode
	docker compose up -d

down:        ## Stop and remove containers (keeps volumes)
	docker compose down

restart:     ## Restart a specific service — e.g. make restart svc=backend
	docker compose restart $(svc)

logs:        ## Follow logs for all services (or: make logs svc=backend)
	docker compose logs -f $(svc)

ps:          ## Show running containers
	docker compose ps

# ─── Shells ───────────────────────────────────────────────────────────────────

shell-backend:   ## Open a shell inside the backend container
	docker compose exec backend sh

shell-db:        ## Open psql inside the postgres container
	docker compose exec postgres psql -U $${DB_USERNAME:-tekros_user} $${DB_DATABASE:-cotizador_db}

# ─── Migrations ───────────────────────────────────────────────────────────────

migrate:         ## Run all pending migrations
	docker compose exec backend npm run migration:run

migrate-revert:  ## Revert the last migration
	docker compose exec backend npm run migration:revert

migrate-show:    ## Show migration status
	docker compose exec backend npm run migration:show

# Example: make migrate-generate name=AddSomething
migrate-generate: ## Generate a new migration (requires name=<Name>)
	docker compose exec backend npm run migration:generate --name=$(name)

# ─── Backups ──────────────────────────────────────────────────────────────────

backup:          ## Dump database to backups/ — optional: make backup note="before-migration"
	./scripts/backup.sh "$(note)"

restore:         ## Restore a backup — list available: make restore
	./scripts/restore.sh $(file)

# ─── Production ───────────────────────────────────────────────────────────────

prod-build:      ## Build production images
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-up:         ## Start all services in production mode
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:       ## Stop production services
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# ─── Misc ─────────────────────────────────────────────────────────────────────

install:         ## Install dependencies for backend and frontend locally
	cd backend && npm install
	cd frontend && npm install

clean:           ## Remove containers, volumes and images (⚠ data loss)
	docker compose down -v --rmi local

help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
