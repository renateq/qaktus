import json
import logging
import os
import random
import string
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

BASE62 = string.digits + string.ascii_lowercase + string.ascii_uppercase
MAX_RETRIES = 5

# --- DynamoDB storage ---
_table = None


def _get_table():
    global _table
    if _table is None:
        _table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
    return _table


def put_item(short_code: str, targets: list[dict]) -> None:
    try:
        _get_table().put_item(
            Item={"short_code": short_code, "targets": targets},
            ConditionExpression="attribute_not_exists(short_code)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise KeyError(f"Short code '{short_code}' already exists") from e
        raise


# --- Core logic ---

def generate_base62(length: int = 5) -> str:
    return "".join(random.choices(BASE62, k=length))


def build_targets(urls: list[dict]) -> list[dict]:
    return [
        {"url": entry["original_url"], "weight": entry["weight"], "visits": 0}
        for entry in urls
    ]


def put_item_with_retry(short_code: str, targets: list[dict]) -> str:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            put_item(short_code, targets)
            logger.info("Short code created: %s (attempt %d)", short_code, attempt)
            return short_code
        except KeyError:
            logger.warning("Collision on '%s', retrying (attempt %d)", short_code, attempt)
            short_code = generate_base62()

    raise RuntimeError(f"Failed to generate a unique short code after {MAX_RETRIES} attempts")


def validate_body(body: dict) -> str | None:
    if "urls" not in body:
        return "Missing required field: urls"
    if not isinstance(body["urls"], list) or len(body["urls"]) == 0:
        return "Field 'urls' must be a non-empty list"
    for i, entry in enumerate(body["urls"]):
        if "original_url" not in entry:
            return f"Entry {i} is missing 'original_url'"
        if "weight" not in entry:
            return f"Entry {i} is missing 'weight'"
        if not isinstance(entry["weight"], (int, float)) or entry["weight"] <= 0:
            return f"Entry {i} has an invalid weight (must be a positive number)"
    return None


def response(status_code: int, body: Any) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event: dict, context: Any) -> dict:
    try:
        raw_body = event.get("body", "{}")
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    error = validate_body(body)
    if error:
        return response(400, {"error": error})

    targets = build_targets(body["urls"])
    short_code = generate_base62()

    try:
        final_code = put_item_with_retry(short_code, targets)
    except RuntimeError as e:
        logger.error(str(e))
        return response(500, {"error": "Could not generate a unique short code. Please try again."})

    return response(
        201,
        {
            "short_code": final_code,
            "short_url": f"https://short.ly/{final_code}",
            "targets": targets,
        },
    )
