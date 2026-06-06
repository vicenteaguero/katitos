# Katitos — Supabase cloud ops. Run `make help`.
#
# Creds live in .env.supabase.local (gitignored): SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD.
# Connects via the IPv4 *session pooler* — the direct host db.<ref>.supabase.co is
# IPv6-only and TLS-fails behind a Clash/VPN TUN. Override host if your region differs:
#   make db-push POOLER_HOST=aws-0-eu-west-1.pooler.supabase.com
#
# NOTE: each recipe is one backslash-joined shell line on purpose — macOS ships
# GNU Make 3.81, which ignores .ONESHELL, so vars must stay in a single shell.

SHELL := bash

ENV_FILE    := .env.supabase.local
POOLER_HOST ?= aws-1-eu-central-1.pooler.supabase.com
POOLER_PORT ?= 5432

.DEFAULT_GOAL := help
.PHONY: help link db-push db-diff db-pull functions-deploy deploy \
        vercel-link vercel-status vercel-env vercel-deploy vercel-prod

# Source creds (set -a exports them so python sees them) + build the session-pooler
# URL with the password percent-encoded (it can contain `%`, `@`, etc.).
define dburl
set -a; source $(ENV_FILE); set +a; \
PWD_ENC=$$(python3 -c "import urllib.parse,os;print(urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'],safe=''))"); \
DBURL="postgresql://postgres.$$SUPABASE_PROJECT_REF:$$PWD_ENC@$(POOLER_HOST):$(POOLER_PORT)/postgres";
endef

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'

link: ## Link repo to the cloud project
	@set -a; source $(ENV_FILE); set +a; \
	supabase link --project-ref $$SUPABASE_PROJECT_REF -p "$$SUPABASE_DB_PASSWORD"

db-push: ## Apply migrations to cloud (IPv4 pooler)
	@$(dburl) \
	printf 'y\n' | supabase db push --db-url "$$DBURL"

db-diff: ## Show schema drift (want: empty)
	@$(dburl) \
	supabase db diff --db-url "$$DBURL"

db-pull: ## Pull remote schema into a new migration
	@$(dburl) \
	supabase db pull --db-url "$$DBURL"

functions-deploy: ## Deploy edge functions (--use-api = server-side bundle, no Docker)
	@supabase functions deploy push-notify --use-api
	@supabase functions deploy currency-rates --use-api

deploy: db-push functions-deploy ## Push schema + deploy functions

# ── Vercel (CLI already authed; katitos lives in the default scope) ─────────
VERCEL_PROJECT ?= katitos

vercel-link: ## Link this repo to the Vercel project (creates gitignored .vercel/)
	@vercel link --yes --project $(VERCEL_PROJECT)

vercel-status: ## Recent deployments
	@vercel ls $(VERCEL_PROJECT)

vercel-env: ## List production env vars
	@vercel env ls production

vercel-deploy: ## Deploy a preview build
	@vercel deploy

vercel-prod: ## Deploy to production (note: git push to main also auto-deploys)
	@vercel deploy --prod
