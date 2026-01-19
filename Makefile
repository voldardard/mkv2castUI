.PHONY: help release release-push test build clean install

# Version management
VERSION ?= $(shell grep -E "^__version__" backend/mkv2cast_api/__version__.py | cut -d'"' -f2)
VERSION_FILE = backend/mkv2cast_api/__version__.py
FRONTEND_VERSION = frontend/package.json

# Git
GIT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD)
GIT_TAG = v$(VERSION)

# Colors
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)mkv2castUI Makefile$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "Current version: $(VERSION)"
	@echo "Current branch: $(GIT_BRANCH)"

release: ## Prepare a release (update versions, changelog, etc.)
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)Error: VERSION is required$(NC)"; \
		echo "Usage: make release VERSION=v0.1.0"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Preparing release $(VERSION)...$(NC)"
	@echo ""
	@# Check we're on main branch
	@if [ "$(GIT_BRANCH)" != "main" ]; then \
		echo "$(RED)Error: Releases must be made from main branch$(NC)"; \
		echo "Current branch: $(GIT_BRANCH)"; \
		exit 1; \
	fi
	@# Check working directory is clean
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "$(RED)Error: Working directory is not clean$(NC)"; \
		echo "Please commit or stash your changes first"; \
		git status --short; \
		exit 1; \
	fi
	@# Update backend version
	@echo "$(GREEN)Updating backend version...$(NC)"
	@sed -i "s/__version__ = \".*\"/__version__ = \"$(VERSION)\"/" $(VERSION_FILE)
	@# Update frontend version
	@echo "$(GREEN)Updating frontend version...$(NC)"
	@sed -i 's/"version": ".*"/"version": "$(VERSION)"/' $(FRONTEND_VERSION)
	@# Update README version badge
	@echo "$(GREEN)Updating README...$(NC)"
	@sed -i 's/BETA SOFTWARE (v.*)/BETA SOFTWARE (v$(VERSION)-beta)/' README.md
	@# Show changes
	@echo ""
	@echo "$(GREEN)Version updated to $(VERSION)$(NC)"
	@echo ""
	@echo "$(YELLOW)Files modified:$(NC)"
	@git status --short
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review the changes: git diff"
	@echo "  2. Commit: git commit -am 'chore: bump version to $(VERSION)'"
	@echo "  3. Tag: git tag -a $(GIT_TAG) -m 'Release $(VERSION)'"
	@echo "  4. Push: git push origin main && git push origin $(GIT_TAG)"
	@echo ""
	@echo "Or use: $(GREEN)make release-push VERSION=$(VERSION)$(NC)"

release-push: release ## Prepare, commit, tag and push a release
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)Error: VERSION is required$(NC)"; \
		echo "Usage: make release-push VERSION=v0.1.0"; \
		exit 1; \
	fi
	@echo ""
	@echo "$(YELLOW)Committing version changes...$(NC)"
	@git add $(VERSION_FILE) $(FRONTEND_VERSION) README.md
	@git commit -m "chore: bump version to $(VERSION)" || true
	@echo ""
	@echo "$(YELLOW)Creating tag $(GIT_TAG)...$(NC)"
	@git tag -a $(GIT_TAG) -m "Release $(VERSION)" || (echo "$(RED)Tag already exists$(NC)" && exit 1)
	@echo ""
	@echo "$(YELLOW)Pushing to origin...$(NC)"
	@echo "$(GREEN)This will trigger GitHub Actions workflows$(NC)"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		git push origin main; \
		git push origin $(GIT_TAG); \
		echo ""; \
		echo "$(GREEN)Release $(VERSION) pushed!$(NC)"; \
		echo "Workflows: https://github.com/voldardard/mkv2castUI/actions"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
		exit 1; \
	fi

test: ## Run all tests
	@echo "$(GREEN)Running backend tests...$(NC)"
	@cd backend && pytest --cov=accounts --cov=conversions --cov-report=term-missing -v
	@echo ""
	@echo "$(GREEN)Running frontend tests...$(NC)"
	@cd frontend && npm test -- --coverage --watchAll=false
	@echo ""
	@echo "$(GREEN)All tests passed!$(NC)"

test-backend: ## Run backend tests only
	@cd backend && pytest --cov=accounts --cov=conversions --cov-report=html -v

test-frontend: ## Run frontend tests only
	@cd frontend && npm test -- --coverage --watchAll=false

test-e2e: ## Run E2E tests
	@cd e2e && npx playwright test

build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build

build-prod: ## Build production Docker images
	@echo "$(GREEN)Building production Docker images...$(NC)"
	@docker-compose -f docker-compose.prod.yml build

up: ## Start all services
	@echo "$(GREEN)Starting services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "Access at: http://localhost:8080"

down: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker-compose down

logs: ## Show logs from all services
	@docker-compose logs -f

clean: ## Clean Docker volumes and images
	@echo "$(YELLOW)Cleaning Docker resources...$(NC)"
	@docker-compose down -v
	@docker system prune -f

install: ## Install development dependencies
	@echo "$(GREEN)Checking system dependencies for Pillow...$(NC)"
	@if command -v pacman >/dev/null 2>&1; then \
		echo "$(YELLOW)Detected Arch Linux - checking Pillow dependencies...$(NC)"; \
		MISSING=$$(for pkg in libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2; do \
			pacman -Qq $$pkg >/dev/null 2>&1 || echo $$pkg; \
		done); \
		if [ -n "$$MISSING" ]; then \
			echo "$(YELLOW)Missing Pillow dependencies: $$MISSING$(NC)"; \
			echo "$(YELLOW)Install with:$(NC)"; \
			echo "  sudo pacman -S --needed libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2"; \
			echo ""; \
			echo "$(YELLOW)Or use Docker for development (recommended):$(NC)"; \
			echo "  make build && make up"; \
			echo ""; \
			read -p "Install dependencies now? [y/N] " -n 1 -r; \
			echo; \
			if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
				sudo pacman -S --needed libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2; \
			else \
				echo "$(YELLOW)Continuing anyway... (may fail if dependencies missing)$(NC)"; \
			fi; \
		else \
			echo "$(GREEN)✓ All Pillow dependencies installed$(NC)"; \
		fi; \
	fi
	@echo "$(GREEN)Installing backend dependencies...$(NC)"
	@echo "$(YELLOW)Note: If Pillow fails to build, use Docker instead: make build && make up$(NC)"
	@cd backend && \
		if command -v pacman >/dev/null 2>&1 && pacman -Qq python-pillow >/dev/null 2>&1; then \
			echo "$(YELLOW)System Pillow detected. Trying to use it...$(NC)"; \
			pip install --no-build-isolation -r requirements.txt || \
			(echo "$(YELLOW)Fallback: installing without Pillow, then Pillow separately...$(NC)" && \
			 pip install --no-deps -r <(grep -v "^Pillow" requirements.txt) && \
			 pip install --no-build-isolation Pillow>=10.0,<11.0) || \
			(echo "$(RED)Failed. Installing pre-built wheel...$(NC)" && \
			 pip install --only-binary=Pillow Pillow>=10.0,<11.0 && \
			 pip install -r <(grep -v "^Pillow" requirements.txt)); \
		else \
			pip install -r requirements.txt; \
		fi || ( \
			echo ""; \
			echo "$(RED)Failed to install Python dependencies$(NC)"; \
			echo "$(YELLOW)Solutions:$(NC)"; \
			echo "  1. Use Docker (recommended): make build && make up"; \
			echo "  2. Install system Pillow: sudo pacman -S python-pillow"; \
			echo "  3. Install dev dependencies: sudo pacman -S base-devel"; \
			exit 1; \
		)
	@echo "$(GREEN)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)Installing E2E dependencies...$(NC)"
	@cd e2e && npm install

lint: ## Run linters
	@echo "$(GREEN)Linting backend...$(NC)"
	@cd backend && flake8 . --exclude=migrations,venv,__pycache__ || echo "$(YELLOW)flake8 not installed$(NC)"
	@echo "$(GREEN)Linting frontend...$(NC)"
	@cd frontend && npm run lint

format: ## Format code
	@echo "$(GREEN)Formatting backend...$(NC)"
	@cd backend && black . && isort . || echo "$(YELLOW)black/isort not installed$(NC)"
	@echo "$(GREEN)Formatting frontend...$(NC)"
	@cd frontend && npm run format || echo "No format script"

docs-build: ## Build Sphinx documentation locally
	@echo "$(GREEN)Building documentation...$(NC)"
	@cd docs && pip install -r requirements.txt
	@cd docs && sphinx-build -b html . _build/html
	@echo "$(GREEN)Documentation built in docs/_build/html$(NC)"
	@echo "Open: docs/_build/html/index.html"

docs-serve: docs-build ## Build and serve documentation locally
	@echo "$(GREEN)Serving documentation on http://localhost:8000$(NC)"
	@cd docs/_build/html && python -m http.server 8000

version: ## Show current version
	@echo "$(GREEN)Current version: $(VERSION)$(NC)"
	@echo "Backend: $(shell grep -E "^__version__" $(VERSION_FILE) | cut -d'"' -f2)"
	@echo "Frontend: $(shell grep -E '"version"' $(FRONTEND_VERSION) | head -1 | cut -d'"' -f4)"

check: ## Check if ready for release
	@echo "$(GREEN)Checking release readiness...$(NC)"
	@echo ""
	@# Check branch
	@if [ "$(GIT_BRANCH)" != "main" ]; then \
		echo "$(RED)✗ Not on main branch (current: $(GIT_BRANCH))$(NC)"; \
	else \
		echo "$(GREEN)✓ On main branch$(NC)"; \
	fi
	@# Check working directory
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "$(RED)✗ Working directory not clean$(NC)"; \
		echo "$(YELLOW)Files to commit:$(NC)"; \
		git status --short | head -20; \
		echo ""; \
		echo "$(YELLOW)Run 'make prepare-commit' to see what should be added$(NC)"; \
	else \
		echo "$(GREEN)✓ Working directory clean$(NC)"; \
	fi
	@# Check tests (only if dependencies are installed)
	@echo ""
	@if python3 -c "import django" 2>/dev/null; then \
		echo "$(YELLOW)Running quick test check...$(NC)"; \
		cd backend && pytest --tb=short -q > /dev/null 2>&1 && \
			echo "$(GREEN)✓ Backend tests pass$(NC)" || \
			echo "$(YELLOW)⚠ Backend tests fail (run 'make install' and 'make test' to debug)$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Backend dependencies not installed (run 'make install' first)$(NC)"; \
	fi
	@# Check version consistency
	@BACKEND_VER=$$(grep -E "^__version__" $(VERSION_FILE) | cut -d'"' -f2); \
	FRONTEND_VER=$$(grep -E '"version"' $(FRONTEND_VERSION) | head -1 | cut -d'"' -f4); \
	if [ "$$BACKEND_VER" = "$$FRONTEND_VER" ]; then \
		echo "$(GREEN)✓ Versions match ($$BACKEND_VER)$(NC)"; \
	else \
		echo "$(RED)✗ Version mismatch: backend=$$BACKEND_VER, frontend=$$FRONTEND_VER$(NC)"; \
	fi

prepare-commit: ## Show what files should be committed
	@echo "$(GREEN)Files that should be committed:$(NC)"
	@echo ""
	@echo "$(YELLOW)Modified files:$(NC)"
	@git status --short | grep -E "^M|^A" | grep -v "^MM" || echo "  (none)"
	@echo ""
	@echo "$(YELLOW)New files to add:$(NC)"
	@git status --short | grep "^??" | grep -vE "(coverage|__pycache__|\.pyc|node_modules|\.next|build|dist)" || echo "  (none)"
	@echo ""
	@echo "$(YELLOW)Suggested command:$(NC)"
	@echo "  git add .github/ Makefile RELEASE.md docs/ e2e/ docker-compose.prod.yml"
	@echo "  git add frontend/__tests__/ frontend/jest.config.js frontend/jest.setup.tsx"
	@echo "  git add frontend/src/app/[lang]/{about,docs,features,on-premise,admin,auth}/"
	@echo "  git add frontend/src/components/admin/"
	@echo "  git add backend/conversions/migrations/"
	@echo "  git add backend/accounts/admin_views.py backend/tests/"
	@echo "  git add .env.example README.md docker-compose.yml frontend/"
	@echo "  git commit -m 'feat: add documentation, workflows, and release automation'"
