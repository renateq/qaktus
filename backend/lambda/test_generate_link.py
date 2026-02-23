import json
import random
from unittest.mock import MagicMock

import pytest
import generate_link
from botocore.exceptions import ClientError
from generate_link import (
    BASE62,
    MAX_RETRIES,
    build_targets,
    generate_base62,
    handler,
    put_item,
    put_item_with_retry,
    response,
    validate_body,
)


# ---------------------------------------------------------------------------
# TestGenerateBase62
# ---------------------------------------------------------------------------

class TestGenerateBase62:
    def test_default_length_is_five(self):
        code = generate_base62()
        assert len(code) == 5

    def test_default_output_is_base62_chars(self):
        code = generate_base62()
        assert all(c in BASE62 for c in code)

    def test_custom_length_is_respected(self):
        code = generate_base62(length=10)
        assert len(code) == 10

    def test_length_one(self):
        code = generate_base62(length=1)
        assert len(code) == 1
        assert code in BASE62

    def test_monkeypatched_choices_controls_output(self, monkeypatch):
        monkeypatch.setattr(random, "choices", lambda population, k: list("abcde"))
        code = generate_base62()
        assert code == "abcde"


# ---------------------------------------------------------------------------
# TestBuildTargets
# ---------------------------------------------------------------------------

class TestBuildTargets:
    def test_single_entry_has_correct_url(self):
        result = build_targets([{"original_url": "https://example.com", "weight": 1}])
        assert result[0]["url"] == "https://example.com"

    def test_single_entry_adds_visits_zero(self):
        result = build_targets([{"original_url": "https://example.com", "weight": 1}])
        assert result[0]["visits"] == 0

    def test_multiple_entries_produces_correct_list_length(self):
        urls = [
            {"original_url": "https://a.com", "weight": 1},
            {"original_url": "https://b.com", "weight": 2},
        ]
        result = build_targets(urls)
        assert len(result) == 2

    def test_float_weight_is_preserved(self):
        result = build_targets([{"original_url": "https://example.com", "weight": 0.5}])
        assert result[0]["weight"] == 0.5

    def test_original_url_key_is_absent_from_output(self):
        result = build_targets([{"original_url": "https://example.com", "weight": 1}])
        assert "original_url" not in result[0]

    def test_visits_is_always_zero_for_all_entries(self):
        urls = [
            {"original_url": "https://a.com", "weight": 1},
            {"original_url": "https://b.com", "weight": 3},
        ]
        result = build_targets(urls)
        assert all(entry["visits"] == 0 for entry in result)


# ---------------------------------------------------------------------------
# TestValidateBody
# ---------------------------------------------------------------------------

class TestValidateBody:
    def test_valid_single_url_returns_none(self):
        body = {"urls": [{"original_url": "https://example.com", "weight": 1}]}
        assert validate_body(body) is None

    def test_valid_multiple_urls_returns_none(self):
        body = {
            "urls": [
                {"original_url": "https://a.com", "weight": 1},
                {"original_url": "https://b.com", "weight": 2},
            ]
        }
        assert validate_body(body) is None

    def test_missing_urls_key_returns_error(self):
        error = validate_body({})
        assert error is not None
        assert "urls" in error

    def test_urls_is_string_not_list_returns_error(self):
        error = validate_body({"urls": "https://example.com"})
        assert error is not None

    def test_urls_is_empty_list_returns_error(self):
        error = validate_body({"urls": []})
        assert error is not None

    def test_entry_missing_original_url_returns_error_with_index(self):
        body = {"urls": [{"weight": 1}]}
        error = validate_body(body)
        assert error is not None
        assert "0" in error
        assert "original_url" in error

    def test_entry_missing_weight_returns_error_with_index(self):
        body = {"urls": [{"original_url": "https://example.com"}]}
        error = validate_body(body)
        assert error is not None
        assert "0" in error
        assert "weight" in error

    def test_weight_zero_is_invalid(self):
        body = {"urls": [{"original_url": "https://example.com", "weight": 0}]}
        error = validate_body(body)
        assert error is not None

    def test_weight_negative_is_invalid(self):
        body = {"urls": [{"original_url": "https://example.com", "weight": -1}]}
        error = validate_body(body)
        assert error is not None

    def test_weight_string_is_invalid(self):
        body = {"urls": [{"original_url": "https://example.com", "weight": "high"}]}
        error = validate_body(body)
        assert error is not None

    def test_weight_positive_float_is_valid(self):
        body = {"urls": [{"original_url": "https://example.com", "weight": 0.5}]}
        assert validate_body(body) is None

    def test_second_entry_invalid_reports_index_one(self):
        body = {
            "urls": [
                {"original_url": "https://a.com", "weight": 1},
                {"original_url": "https://b.com", "weight": -5},
            ]
        }
        error = validate_body(body)
        assert error is not None
        assert "1" in error


# ---------------------------------------------------------------------------
# TestPutItem
# ---------------------------------------------------------------------------

class TestPutItem:
    @pytest.fixture(autouse=True)
    def mock_table(self):
        generate_link._table = MagicMock()
        yield generate_link._table

    def test_calls_put_item_on_table(self, mock_table):
        put_item("abc12", [{"url": "https://example.com", "weight": 1, "visits": 0}])
        mock_table.put_item.assert_called_once()

    def test_put_item_called_with_correct_item(self, mock_table):
        targets = [{"url": "https://example.com", "weight": 1, "visits": 0}]
        put_item("abc12", targets)
        call_kwargs = mock_table.put_item.call_args[1]
        assert call_kwargs["Item"] == {"short_code": "abc12", "targets": targets}

    def test_raises_key_error_on_conditional_check_failure(self, mock_table):
        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": "already exists"}},
            "PutItem",
        )
        with pytest.raises(KeyError):
            put_item("abc12", [])

    def test_two_different_codes_can_be_stored(self, mock_table):
        put_item("aaaaa", [])
        put_item("bbbbb", [])
        assert mock_table.put_item.call_count == 2

    def test_other_client_error_is_not_swallowed(self, mock_table):
        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "throttled"}},
            "PutItem",
        )
        with pytest.raises(ClientError):
            put_item("abc12", [])


# ---------------------------------------------------------------------------
# TestPutItemWithRetry
# ---------------------------------------------------------------------------

class TestPutItemWithRetry:
    @pytest.fixture(autouse=True)
    def mock_table(self):
        generate_link._table = MagicMock()
        yield generate_link._table

    def test_success_on_first_attempt(self, mock_table):
        code = put_item_with_retry("hello", [])
        assert code == "hello"
        mock_table.put_item.assert_called_once()

    def test_success_after_one_collision(self, monkeypatch, mock_table):
        codes = iter(["second"])
        monkeypatch.setattr(generate_link, "generate_base62", lambda: next(codes))

        call_count = {"n": 0}

        def side_effect(**kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                    "PutItem",
                )

        mock_table.put_item.side_effect = side_effect
        code = put_item_with_retry("first", [])
        assert code == "second"

    def test_success_after_four_collisions(self, monkeypatch, mock_table):
        call_count = {"n": 0}

        def side_effect(**kwargs):
            call_count["n"] += 1
            if call_count["n"] < 5:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                    "PutItem",
                )

        mock_table.put_item.side_effect = side_effect
        code = put_item_with_retry("code0", [])
        assert isinstance(code, str)
        assert len(code) > 0

    def test_raises_runtime_error_after_max_retries(self, monkeypatch, mock_table):
        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
            "PutItem",
        )
        with pytest.raises(RuntimeError):
            put_item_with_retry("code0", [])

    def test_generate_base62_called_once_per_collision(self, monkeypatch, mock_table):
        gen_calls = {"n": 0}

        def counting_gen():
            gen_calls["n"] += 1
            return "newcode"

        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
            "PutItem",
        )
        monkeypatch.setattr(generate_link, "generate_base62", counting_gen)
        with pytest.raises(RuntimeError):
            put_item_with_retry("start", [])

        assert gen_calls["n"] == MAX_RETRIES


# ---------------------------------------------------------------------------
# TestResponseHelper
# ---------------------------------------------------------------------------

class TestResponseHelper:
    def test_status_code_field_is_correct(self):
        r = response(200, {})
        assert r["statusCode"] == 200

    def test_headers_content_type(self):
        r = response(200, {})
        assert r["headers"] == {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://dashboard.qaktus.app",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        }

    def test_body_is_json_string_not_dict(self):
        r = response(200, {"key": "value"})
        assert isinstance(r["body"], str)

    def test_201_with_complex_body_round_trips(self):
        payload = {"short_code": "abc12", "targets": [{"url": "https://x.com", "weight": 1, "visits": 0}]}
        r = response(201, payload)
        assert json.loads(r["body"]) == payload

    def test_400_has_correct_status_and_content(self):
        r = response(400, {"error": "bad input"})
        assert r["statusCode"] == 400
        assert json.loads(r["body"])["error"] == "bad input"


# ---------------------------------------------------------------------------
# TestHandler
# ---------------------------------------------------------------------------

class TestHandler:
    _valid_event = {
        "body": json.dumps({"urls": [{"original_url": "https://example.com", "weight": 1}]})
    }

    @pytest.fixture(autouse=True)
    def mock_table(self):
        generate_link._table = MagicMock()
        yield generate_link._table

    def test_success_returns_201(self):
        result = handler(self._valid_event, None)
        assert result["statusCode"] == 201

    def test_success_body_contains_short_code(self):
        result = handler(self._valid_event, None)
        body = json.loads(result["body"])
        assert "short_code" in body

    def test_success_body_contains_short_url(self):
        result = handler(self._valid_event, None)
        body = json.loads(result["body"])
        assert "short_url" in body
        code = body["short_code"]
        assert body["short_url"] == f"https://short.ly/{code}"

    def test_success_body_contains_correct_targets(self):
        result = handler(self._valid_event, None)
        body = json.loads(result["body"])
        assert "targets" in body
        assert body["targets"][0]["url"] == "https://example.com"
        assert body["targets"][0]["visits"] == 0

    def test_success_put_item_called(self, mock_table):
        handler(self._valid_event, None)
        mock_table.put_item.assert_called_once()

    def test_success_multiple_urls_all_targets_present(self):
        event = {
            "body": json.dumps({
                "urls": [
                    {"original_url": "https://a.com", "weight": 1},
                    {"original_url": "https://b.com", "weight": 2},
                ]
            })
        }
        result = handler(event, None)
        body = json.loads(result["body"])
        assert len(body["targets"]) == 2
        assert all(t["visits"] == 0 for t in body["targets"])

    def test_invalid_json_returns_400(self):
        event = {"body": "not-json{{{"}
        result = handler(event, None)
        assert result["statusCode"] == 400
        assert "Invalid JSON" in json.loads(result["body"])["error"]

    def test_missing_body_key_returns_400(self):
        result = handler({}, None)
        # {} body parses as {} dict → fails validate_body (missing 'urls')
        assert result["statusCode"] == 400

    def test_body_as_dict_returns_201(self):
        event = {"body": {"urls": [{"original_url": "https://example.com", "weight": 1}]}}
        result = handler(event, None)
        assert result["statusCode"] == 201

    def test_validation_error_missing_urls_returns_400(self):
        event = {"body": json.dumps({})}
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_validation_error_empty_urls_returns_400(self):
        event = {"body": json.dumps({"urls": []})}
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_validation_error_missing_original_url_returns_400(self):
        event = {"body": json.dumps({"urls": [{"weight": 1}]})}
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_validation_error_invalid_weight_returns_400(self):
        event = {"body": json.dumps({"urls": [{"original_url": "https://x.com", "weight": -1}]})}
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_put_item_retry_exhausted_returns_500(self, monkeypatch):
        monkeypatch.setattr(
            generate_link,
            "put_item_with_retry",
            lambda code, targets: (_ for _ in ()).throw(RuntimeError("exhausted")),
        )
        result = handler(self._valid_event, None)
        assert result["statusCode"] == 500

    def test_runtime_error_does_not_propagate_out_of_handler(self, monkeypatch):
        monkeypatch.setattr(
            generate_link,
            "put_item_with_retry",
            lambda code, targets: (_ for _ in ()).throw(RuntimeError("exhausted")),
        )
        # Should not raise
        result = handler(self._valid_event, None)
        assert isinstance(result, dict)
