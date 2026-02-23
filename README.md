# Qaktus

![banner](docs/assets/banner.png 'banner')

Qaktus is a weighted URL shortener. A single short code maps to multiple destination URLs, each with a weight, enabling weighted traffic splitting — useful for A/B testing, canary releases, or load distribution.

## How it works

1. **Create a short link** — submit a list of URLs with weights via `POST /generate-link`.
2. **Share the short link** — recipients follow a 5-character base62 code (e.g. `aB3xZ`).
3. **Weighted redirect** — each request is routed to one of the destination URLs with probability proportional to its weight.

## Architecture

```
POST /generate-link  →  Lambda: generate_link  →  DynamoDB
GET  /{short_code}   →  Lambda: redirect        →  DynamoDB  →  301 to destination
```

- **Short codes** — 5-character base62 strings (`0-9a-zA-Z`), ~916 million possible values.
- **Storage** — DynamoDB; each item stores the short code and a `targets` list of `{url, weight, visits}`.
- **Collision handling** — conditional `PutItem` with up to 5 retries.
- **Weighted selection** — `random.choices` with float weights.

## API

### `POST /generate-link`

**Request body:**
```json
{
  "urls": [
    { "original_url": "https://example.com",      "weight": 70 },
    { "original_url": "https://example.com/beta", "weight": 30 }
  ]
}
```

**Response `201`:**
```json
{
  "short_code": "aB3xZ",
  "short_url": "https://short.ly/aB3xZ",
  "targets": [
    { "url": "https://example.com",      "weight": 70, "visits": 0 },
    { "url": "https://example.com/beta", "weight": 30, "visits": 0 }
  ]
}
```

### `GET /{short_code}`

Returns `301` with a `Location` header pointing to the weighted-randomly selected destination.

## Development

This project uses [`uv`](https://github.com/astral-sh/uv).

```bash
uv sync          # install dependencies
uv run pytest    # run all tests
uv run pytest -x # stop on first failure
```

Invoke a Lambda handler locally:

```python
from backend.lambda.generate_link import handler

event = {
    "body": '{"urls": [{"original_url": "https://example.com", "weight": 1}]}'
}
result = handler(event, None)
```

## Infrastructure

Infrastructure is managed with Terraform in `backend/terraform/`.

```bash
terraform -chdir=backend/terraform init
terraform -chdir=backend/terraform plan
terraform -chdir=backend/terraform apply
terraform -chdir=backend/terraform output api_endpoint
```

Resources provisioned:
- Two Lambda functions (`qaktus-generate-link`, `qaktus-redirect`) on Python 3.12
- HTTP API Gateway (v2) with routes `POST /generate-link` and `GET /{short_code}`
- DynamoDB table
- IAM roles scoped to `dynamodb:PutItem` and `dynamodb:GetItem`

Terraform state is stored in S3 (`qaktus-tf` bucket, `us-east-1`).

## Research

Jupyter notebooks in `research/` document the base62 approach and analyse collision probability at scale.

```bash
uv run jupyter notebook research/
```

## CI

Tests run automatically on every PR to `master` via GitHub Actions (`.github/workflows/test.yml`).
