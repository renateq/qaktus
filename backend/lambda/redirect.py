import json
import os
import random
from typing import Any

import boto3

_table = None


def _get_table():
    global _table
    if _table is None:
        _table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
    return _table


def pick_url(targets: list[dict]) -> str:
    """Weighted random selection from targets list."""
    urls = [t["url"] for t in targets]
    weights = [float(t["weight"]) for t in targets]
    return random.choices(urls, weights=weights, k=1)[0]


def handler(event: dict, context: Any) -> dict:
    short_code = (event.get("pathParameters") or {}).get("short_code")
    if not short_code:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing short code"})}

    item = _get_table().get_item(Key={"short_code": short_code}).get("Item")
    if not item:
        return {"statusCode": 404, "body": json.dumps({"error": "Short code not found"})}

    url = pick_url(item["targets"])
    return {"statusCode": 301, "headers": {"Location": url}, "body": ""}
