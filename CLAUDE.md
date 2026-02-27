# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Management

This project uses `uv`. Install dependencies with:

```bash
uv sync
```

To add a dependency:

```bash
uv add <package>           # runtime dependency
uv add --dev <package>     # dev-only dependency
```

## Running Tests

```bash
uv run pytest          # run all tests
uv run pytest -x       # stop on first failure
uv run pytest backend/lambda/test_generate_link.py::TestHandler -v  # single class
```

## Running the Lambda Locally

The Lambda handlers can be invoked directly in Python. To exercise them manually:

```python
from backend.lambda.generate_link import handler

event = {
    "body": '{"urls": [{"original_url": "https://example.com", "weight": 1}]}'
}
result = handler(event, None)
```

```python
from backend.lambda.redirect import handler

event = {"pathParameters": {"short_code": "abc12"}}
result = handler(event, None)
```

## CI

Tests run automatically on every PR to `master` via GitHub Actions (`.github/workflows/test.yml`). The same `uv run pytest` command is used locally and in CI.

## Terraform

Infrastructure lives in `backend/terraform/`. It provisions:
- **Lambda** — `qaktus-generate-link` (Python 3.12, handler `generate_link.handler`)
- **Lambda** — `qaktus-redirect` (Python 3.12, handler `redirect.handler`)
- **API Gateway** — HTTP API v2, routes `POST /generate-link` and `GET /{short_code}` proxied to their respective Lambdas
- **IAM** — execution roles; `generate-link` has `dynamodb:PutItem`, `redirect` has `dynamodb:GetItem`

State is stored in S3 (`qaktus-tf` bucket, `us-east-1`).

```bash
terraform -chdir=backend/terraform init
terraform -chdir=backend/terraform plan
terraform -chdir=backend/terraform apply
terraform -chdir=backend/terraform output api_endpoint   # prints the live URL
```

Sample requests:
```bash
# Create a short link
curl -X POST <api_endpoint>/generate-link \
  -H "Content-Type: application/json" \
  -d '{"urls": [{"original_url": "https://example.com", "weight": 70}, {"original_url": "https://example.com/beta", "weight": 30}]}'

# Follow a short link (returns 301)
curl -v <api_endpoint>/<short_code>
```

## Research Notebooks

Jupyter notebooks live in `research/`. The project registers a `qaktus` kernel:

```bash
uv run jupyter notebook research/
```

## Architecture

**Qaktus** is a weighted URL shortener. A single short code can map to multiple destination URLs, each with a weight, enabling weighted traffic splitting.

### Short code generation

Short codes are 5-character base62 strings (`0-9a-zA-Z`), yielding ~916 million possible values. Generation uses `random.choices`; collisions are retried up to `MAX_RETRIES = 5` times.

### `backend/lambda/generate_link.py`

AWS Lambda entry point for `POST /generate-link`. The `handler` function:
1. Parses and validates the JSON body — expects `urls: [{original_url, weight}]`.
2. Builds a `targets` list adding a `visits` counter to each entry.
3. Stores the mapping in DynamoDB using a conditional `PutItem` (`attribute_not_exists`) to detect collisions.
4. Returns `201` with `short_code`, `short_url`, and the `targets` list.

### `backend/lambda/redirect.py`

AWS Lambda entry point for `GET /{short_code}`. The `handler` function:
1. Reads `short_code` from `event["pathParameters"]["short_code"]`.
2. Fetches the item from DynamoDB; returns `404` if not found.
3. Selects a destination URL via weighted random sampling (`random.choices`). Weights are cast to `float` because DynamoDB returns numbers as `Decimal`.
4. Returns `301` with a `Location` header pointing to the chosen URL.

### `research/generate_short_url.ipynb`

Notebook that documents the base62 approach and analyses collision probability at various scales.

## Web App (`web-app/`)

Next.js 16 frontend (React 19, TypeScript, Tailwind CSS v4, shadcn/ui).

### Running locally

```bash
cd web-app
npm install
npm run dev
```

Requires two environment variables (create `web-app/.env.local`):

```
NEXT_PUBLIC_API_URL=<api_endpoint from terraform output>
SUPABASE_URL=<your supabase project url>
SUPABASE_SERVICE_ROLE_KEY=<your supabase service role key>
```

### Key files

- `app/page.tsx` — main page; URL form and generated-link display
- `app/api/waitlist/route.ts` — `POST /api/waitlist`; inserts email into Supabase `waitlist` table; returns `201` on insert, `409` on duplicate
- `components/navbar.tsx` — top nav; renders `WaitlistDialog`
- `components/waitlist-dialog.tsx` — dialog wrapper for the waitlist form; hides trigger button after submission
- `components/waitlist-form.tsx` — controlled form; calls `/api/waitlist`, shows inline success/error states
- `lib/supabase.ts` — server-side Supabase client (service role)
- `lib/email.ts` — `isValidEmail` helper
