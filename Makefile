.PHONY: help release deploy test build clean install

# Version management
VERSION ?= $(shell grep -E "^__version__" backend/mkv2cast_api/__version__.py | cut -d'"' -f2)
VERSION_FILE = backend/mkv2cast_api/__version__.py
FRONTEND_VERSION = frontend/package.json

# Git
GIT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD)
GIT_TAG = v$(VERSION)

# Python virtual environment
VENV_DIR = backend/venv

# Colors - use printf %b to interpret escape sequences
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

help: ## Show this help message
	@echo -e "$(GREEN)mkv2castUI Makefile$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "Current version: $(VERSION)"
	@echo "Current branch: $(GIT_BRANCH)"

release: ## Prepare a release (update versions, changelog, etc.)
	@if [ -z "$(V)" ]; then \
		echo -e "$(RED)Error: V is required$(NC)"; \
		echo "Usage: make release V=1.2.1"; \
		exit 1; \
	fi
	@if ! echo "$(V)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9]+)?$$'; then \
		echo -e "$(RED)Error: Invalid version format '$(V)'$(NC)"; \
		echo "Expected: X.Y.Z or X.Y.Z-N (N is a number)"; \
		exit 1; \
	fi
	@echo -e "$(YELLOW)Preparing release $(V)...$(NC)"
	@echo ""
	@# Check we're on main branch
	@if [ "$(GIT_BRANCH)" != "main" ]; then \
		echo -e "$(RED)Error: Releases must be made from main branch$(NC)"; \
		echo "Current branch: $(GIT_BRANCH)"; \
		exit 1; \
	fi
	@# Check working directory is clean
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo -e "$(RED)Error: Working directory is not clean$(NC)"; \
		echo "Please commit or stash your changes first"; \
		git status --short; \
		exit 1; \
	fi
	@# Update backend version
	@echo -e "$(GREEN)Updating backend version...$(NC)"
	@sed -i "s/__version__ = \".*\"/__version__ = \"$(V)\"/" $(VERSION_FILE)
	@# Update frontend version
	@echo -e "$(GREEN)Updating frontend version...$(NC)"
	@sed -i 's/"version": ".*"/"version": "$(V)"/' $(FRONTEND_VERSION)
	@# Update README version badge
	@echo -e "$(GREEN)Updating README...$(NC)"
	@sed -i 's/BETA SOFTWARE (v.*)/BETA SOFTWARE (v$(V)-beta)/' README.md
	@# Show changes
	@echo ""
	@echo -e "$(GREEN)Version updated to $(V)$(NC)"
	@echo ""
	@echo -e "$(YELLOW)Files modified:$(NC)"
	@git status --short
	@echo ""
	@echo -e "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review the changes: git diff"
	@echo "  2. Commit: git commit -am 'chore: release v$(V)'"
	@echo "  3. Tag: git tag -a v$(V) -m 'Release $(V)'"
	@echo "  4. Push: git push origin main && git push origin v$(V)"
	@echo ""
	@echo "Or use: $(GREEN)make deploy V=$(V)$(NC)"

deploy: ## Format, commit, tag and push a release
	@if [ -z "$(V)" ]; then \
		echo -e "$(RED)Error: V is required$(NC)"; \
		echo "Usage: make deploy V=1.2.1"; \
		exit 1; \
	fi
	@if ! echo "$(V)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9]+)?$$'; then \
		echo -e "$(RED)Error: Invalid version format '$(V)'$(NC)"; \
		echo "Expected: X.Y.Z or X.Y.Z-N (N is a number)"; \
		exit 1; \
	fi
	@if [ "$(GIT_BRANCH)" != "main" ]; then \
		echo -e "$(RED)Error: Deployments must be made from main branch$(NC)"; \
		echo "Current branch: $(GIT_BRANCH)"; \
		exit 1; \
	fi
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo -e "$(RED)Error: Working directory is not clean$(NC)"; \
		echo "Please commit or stash your changes first"; \
		git status --short; \
		exit 1; \
	fi
	@echo -e "$(YELLOW)Formatting code...$(NC)"
	@$(MAKE) format
	@echo ""
	@echo -e "$(YELLOW)Committing release...$(NC)"
	@git add -A
	@git commit -m "chore: release v$(V)" || echo -e "$(YELLOW)No changes to commit$(NC)"
	@BASE_VERSION=$$(echo "$(V)" | cut -d- -f1); \
	POST_SUFFIX=$$(echo "$(V)" | grep -o '\-[0-9]\+$$' || true); \
	POST_NUM=$$(echo "$$POST_SUFFIX" | cut -c2-); \
	TAGS=""; \
	if [ -z "$$POST_SUFFIX" ]; then \
		TAGS="v$$BASE_VERSION v$$BASE_VERSION-1"; \
	elif [ "$$POST_NUM" = "1" ]; then \
		TAGS="v$$BASE_VERSION-1 v$$BASE_VERSION"; \
	else \
		TAGS="v$(V)"; \
	fi; \
	for tag in $$TAGS; do \
		if git rev-parse "$$tag" >/dev/null 2>&1; then \
			echo -e "$(RED)Error: tag '$$tag' already exists$(NC)"; \
			exit 1; \
		fi; \
	done; \
	for tag in $$TAGS; do \
		echo -e "$(YELLOW)Creating tag $$tag...$(NC)"; \
		git tag -a "$$tag" -m "Release $(V)"; \
	done; \
	echo ""; \
	echo -e "$(YELLOW)About to push 'main' and tags: $$TAGS$(NC)"; \
	read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		git push origin main; \
		for tag in $$TAGS; do \
			git push origin "$$tag"; \
		done; \
		echo ""; \
		echo -e "$(GREEN)Release $(V) deployed!$(NC)"; \
		echo "Workflows: https://github.com/voldardard/mkv2castUI/actions"; \
	else \
		echo -e "$(YELLOW)Cancelled$(NC)"; \
		exit 1; \
	fi

test: ## Run all tests
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo -e "$(RED)✗ Virtual environment not found. Run 'make install' first$(NC)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)Running backend tests...$(NC)"
	@cd backend && venv/bin/python -m pytest --cov=accounts --cov=conversions --cov-report=term-missing -v
	@echo ""
	@echo -e "$(GREEN)Running frontend tests...$(NC)"
	@cd frontend && npm test -- --coverage --watchAll=false
	@echo ""
	@echo -e "$(GREEN)✓ All tests passed!$(NC)"

test-backend: ## Run backend tests only
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo -e "$(RED)✗ Virtual environment not found. Run 'make install' first$(NC)"; \
		exit 1; \
	fi
	@cd backend && venv/bin/python -m pytest --cov=accounts --cov=conversions --cov-report=html -v

test-frontend: ## Run frontend tests only
	@cd frontend && npm test -- --coverage --watchAll=false

test-e2e: ## Run E2E tests
	@cd e2e && npx playwright test

migrations: ## Create Django migrations
	@echo -e "$(GREEN)Creating Django migrations...$(NC)"
	@docker-compose exec backend python manage.py makemigrations || \
		(cd backend && python manage.py makemigrations)

migrate: ## Apply Django migrations
	@echo -e "$(GREEN)Applying Django migrations...$(NC)"
	@docker-compose exec backend python manage.py migrate || \
		(cd backend && python manage.py migrate)

migrations-check: ## Check for pending migrations
	@echo -e "$(GREEN)Checking for pending migrations...$(NC)"
	@docker-compose exec backend python manage.py showmigrations --plan | grep -q '\[ \]' && \
		echo -e "$(YELLOW)⚠ Pending migrations found. Run 'make migrate' to apply.$(NC)" || \
		echo -e "$(GREEN)✓ All migrations applied$(NC)"

migrations-backend: ## Create backend migrations (local, no Docker)
	@echo -e "$(GREEN)Creating backend migrations...$(NC)"
	@cd backend && python manage.py makemigrations

migrate-backend: ## Apply backend migrations (local, no Docker)
	@echo -e "$(GREEN)Applying backend migrations...$(NC)"
	@cd backend && python manage.py migrate

build: ## Build Docker images
	@echo -e "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build

build-prod: ## Build production Docker images
	@echo -e "$(GREEN)Building production Docker images...$(NC)"
	@docker-compose -f docker-compose.prod.yml build

up: ## Start all services
	@echo -e "$(GREEN)Starting services...$(NC)"
	@docker-compose up -d
	@echo -e "$(GREEN)Services started!$(NC)"
	@echo "Access at: http://localhost:8080"

down: ## Stop all services
	@echo -e "$(YELLOW)Stopping services...$(NC)"
	@docker-compose down

logs: ## Show logs from all services
	@docker-compose logs -f

clean: ## Clean Docker volumes and images
	@echo -e "$(YELLOW)Cleaning Docker resources...$(NC)"
	@docker-compose down -v
	@docker system prune -f

install: ## Install development dependencies
	@echo -e "$(GREEN)Checking system dependencies for Pillow...$(NC)"
	@if command -v pacman >/dev/null 2>&1; then \
		echo -e "$(YELLOW)Detected Arch Linux - checking Pillow dependencies...$(NC)"; \
		MISSING=$$(for pkg in libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2; do \
			pacman -Qq $$pkg >/dev/null 2>&1 || echo $$pkg; \
		done); \
		if [ -n "$$MISSING" ]; then \
			echo -e "$(YELLOW)Missing Pillow dependencies: $$MISSING$(NC)"; \
			echo -e "$(YELLOW)Install with:$(NC)"; \
			echo "  sudo pacman -S --needed libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2"; \
			echo ""; \
			echo -e "$(YELLOW)Or use Docker for development (recommended):$(NC)"; \
			echo "  make build && make up"; \
			echo ""; \
			read -p "Install dependencies now? [y/N] " -n 1 -r; \
			echo; \
			if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
				sudo pacman -S --needed libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2; \
			else \
				echo -e "$(YELLOW)Continuing anyway... (may fail if dependencies missing)$(NC)"; \
			fi; \
		else \
			echo -e "$(GREEN)✓ All Pillow dependencies installed$(NC)"; \
		fi; \
	fi
	@echo -e "$(GREEN)Installing backend dependencies...$(NC)"
	@echo -e "$(YELLOW)Note: If Pillow fails to build, use Docker instead: make build && make up$(NC)"
	@cd backend && \
		if [ ! -f "venv/bin/pip" ]; then \
			echo -e "$(RED)✗ Virtual environment pip not found$(NC)"; \
			exit 1; \
		fi && \
		venv/bin/pip install --upgrade pip setuptools wheel >/dev/null 2>&1 || true && \
		if command -v pacman >/dev/null 2>&1 && pacman -Qq python-pillow >/dev/null 2>&1; then \
			echo -e "$(YELLOW)System Pillow detected - installing other dependencies...$(NC)"; \
			venv/bin/pip install -r <(grep -v "^Pillow" requirements.txt) && \
			echo -e "$(GREEN)✓ Backend dependencies installed (using system Pillow)$(NC)"; \
		else \
			venv/bin/pip install -r requirements.txt || ( \
				echo ""; \
				echo -e "$(RED)✗ Failed to install Python dependencies$(NC)"; \
				echo -e "$(YELLOW)Solutions:$(NC)"; \
				echo "  1. Use Docker (recommended): make build && make up"; \
				echo "  2. Install system Pillow: sudo pacman -S python-pillow"; \
				echo "  3. Install Pillow build deps: sudo pacman -S --needed libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2 base-devel"; \
				exit 1; \
			) && \
			echo -e "$(GREEN)✓ Backend dependencies installed$(NC)"; \
		fi
	@echo -e "$(GREEN)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install --silent
	@echo -e "$(GREEN)✓ Frontend dependencies installed$(NC)"
	@echo ""
	@echo -e "$(GREEN)Installing E2E dependencies...$(NC)"
	@cd e2e && npm install --silent
	@echo -e "$(GREEN)✓ E2E dependencies installed$(NC)"
	@echo ""
	@echo -e "$(GREEN)✓ Installation complete!$(NC)"
	@echo ""
	@echo -e "$(YELLOW)To activate the virtual environment:$(NC)"
	@echo "  source backend/venv/bin/activate"
	@echo ""
	@echo -e "$(YELLOW)Or use 'make' commands which automatically use the venv$(NC)"

lint: ## Run linters
	@echo -e "$(GREEN)Linting backend...$(NC)"
	@cd backend && flake8 . --exclude=migrations,venv,__pycache__ || echo -e "$(YELLOW)flake8 not installed$(NC)"
	@echo -e "$(GREEN)Linting frontend...$(NC)"
	@cd frontend && npm run lint

format: ## Format code
	@echo -e "$(GREEN)Formatting backend...$(NC)"
	@cd backend && black . && isort . || echo -e "$(YELLOW)black/isort not installed$(NC)"
	@echo -e "$(GREEN)Formatting frontend...$(NC)"
	@cd frontend && npm run format || echo "No format script"

docs-build: ## Build Sphinx documentation locally
	@echo -e "$(GREEN)Building documentation...$(NC)"
	@cd docs && pip install -r requirements.txt
	@cd docs && sphinx-build -b html . _build/html
	@echo -e "$(GREEN)Documentation built in docs/_build/html$(NC)"
	@echo "Open: docs/_build/html/index.html"

docs-serve: docs-build ## Build and serve documentation locally
	@echo -e "$(GREEN)Serving documentation on http://localhost:8000$(NC)"
	@cd docs/_build/html && python -m http.server 8000

version: ## Show current version
	@BACKEND_VER=$$(grep -E "^__version__" $(VERSION_FILE) | cut -d'"' -f2); \
	FRONTEND_VER=$$(grep -E '"version"' $(FRONTEND_VERSION) | head -1 | cut -d'"' -f4); \
	echo -e "$(GREEN)Current version: $$BACKEND_VER$(NC)"; \
	echo "Backend: $$BACKEND_VER"; \
	echo "Frontend: $$FRONTEND_VER"

check: ## Check if ready for release
	@echo -e "$(GREEN)Checking release readiness...$(NC)"
	@echo ""
	@# Check branch
	@if [ "$(GIT_BRANCH)" != "main" ]; then \
		echo -e "$(RED)✗ Not on main branch (current: $(GIT_BRANCH))$(NC)"; \
	else \
		echo -e "$(GREEN)✓ On main branch$(NC)"; \
	fi
	@# Check working directory
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo -e "$(RED)✗ Working directory not clean$(NC)"; \
		echo -e "$(YELLOW)Files to commit:$(NC)"; \
		git status --short | head -20; \
		echo ""; \
		echo -e "$(YELLOW)Run 'make prepare-commit' to see what should be added$(NC)"; \
	else \
		echo -e "$(GREEN)✓ Working directory clean$(NC)"; \
	fi
	@# Check tests (only if dependencies are installed)
	@echo ""
	@if python3 -c "import django" 2>/dev/null; then \
		echo -e "$(YELLOW)Running quick test check...$(NC)"; \
		cd backend && pytest --tb=short -q > /dev/null 2>&1 && \
			echo -e "$(GREEN)✓ Backend tests pass$(NC)" || \
			echo -e "$(YELLOW)⚠ Backend tests fail (run 'make install' and 'make test' to debug)$(NC)"; \
	else \
		echo -e "$(YELLOW)⚠ Backend dependencies not installed (run 'make install' first)$(NC)"; \
	fi
	@# Check version consistency
	@BACKEND_VER=$$(grep -E "^__version__" $(VERSION_FILE) | cut -d'"' -f2); \
	FRONTEND_VER=$$(grep -E '"version"' $(FRONTEND_VERSION) | head -1 | cut -d'"' -f4); \
	if [ "$$BACKEND_VER" = "$$FRONTEND_VER" ]; then \
		echo -e "$(GREEN)✓ Versions match ($$BACKEND_VER)$(NC)"; \
	else \
		echo -e "$(RED)✗ Version mismatch: backend=$$BACKEND_VER, frontend=$$FRONTEND_VER$(NC)"; \
	fi

prepare-commit: ## Show what files should be committed
	@echo -e "$(GREEN)Files that should be committed:$(NC)"
	@echo ""
	@echo -e "$(YELLOW)Modified files:$(NC)"
	@git status --short | grep -E "^M|^A" | grep -v "^MM" || echo "  (none)"
	@echo ""
	@echo -e "$(YELLOW)New files to add:$(NC)"
	@git status --short | grep "^??" | grep -vE "(coverage|__pycache__|\.pyc|node_modules|\.next|build|dist)" || echo "  (none)"
	@echo ""
	@echo -e "$(YELLOW)Suggested command:$(NC)"
	@echo "  git add .github/ Makefile RELEASE.md docs/ e2e/ docker-compose.prod.yml"
	@echo "  git add frontend/__tests__/ frontend/jest.config.js frontend/jest.setup.tsx"
	@echo "  git add frontend/src/app/[lang]/{about,docs,features,on-premise,admin,auth}/"
	@echo "  git add frontend/src/components/admin/"
	@echo "  git add backend/conversions/migrations/"
	@echo "  git add backend/accounts/admin_views.py backend/tests/"
	@echo "  git add .env.example README.md docker-compose.yml frontend/"
	@echo "  git commit -m 'feat: add documentation, workflows, and release automation'"
