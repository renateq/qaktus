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

The Lambda handler can be invoked directly in Python. To exercise the handler manually:

```python
from backend.lambda.generate_link import handler

event = {
    "body": '{"urls": [{"original_url": "https://example.com", "weight": 1}]}'
}
result = handler(event, None)
```

## CI

Tests run automatically on every PR to `master` via GitHub Actions (`.github/workflows/test.yml`). The same `uv run pytest` command is used locally and in CI.

## Terraform

Infrastructure lives in `terraform/`. It provisions:
- **Lambda** — `qaktus-generate-link` (Python 3.12, handler `generate_link.handler`)
- **API Gateway** — HTTP API v2, route `POST /generate-link` proxied to the Lambda
- **IAM** — execution role with `AWSLambdaBasicExecutionRole`

State is stored in S3 (`qaktus-tf` bucket, `us-east-1`).

```bash
terraform -chdir=terraform init
terraform -chdir=terraform plan
terraform -chdir=terraform apply
terraform -chdir=terraform output api_endpoint   # prints the live URL
```

Sample request:
```bash
curl -X POST <api_endpoint> \
  -H "Content-Type: application/json" \
  -d '{"urls": [{"original_url": "https://example.com", "weight": 70}, {"original_url": "https://example.com/beta", "weight": 30}]}'
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

AWS Lambda entry point. The `handler` function:
1. Parses and validates the JSON body — expects `urls: [{original_url, weight}]`.
2. Builds a `targets` list adding a `visits` counter to each entry.
3. Stores the mapping in DynamoDB (currently mocked with an in-memory `_store` dict using a conditional put to detect collisions).
4. Returns `201` with `short_code`, `short_url`, and the `targets` list.

The mock storage (`_mock_put_item`) simulates DynamoDB's conditional write: it raises `KeyError` on duplicate keys, which `put_item_with_retry` catches to regenerate a code.

### `research/generate_short_url.ipynb`

Notebook that documents the base62 approach and analyses collision probability at various scales.
