import json
import random
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
import redirect
from redirect import handler, pick_url


# ---------------------------------------------------------------------------
# TestPickUrl
# ---------------------------------------------------------------------------

class TestPickUrl:
    def test_single_target_always_returns_its_url(self):
        targets = [{"url": "https://example.com", "weight": 1}]
        result = pick_url(targets)
        assert result == "https://example.com"

    def test_returns_one_of_the_valid_urls(self):
        targets = [
            {"url": "https://a.com", "weight": 1},
            {"url": "https://b.com", "weight": 1},
        ]
        result = pick_url(targets)
        assert result in {"https://a.com", "https://b.com"}

    def test_monkeypatch_choices_receives_correct_weights(self, monkeypatch):
        captured = {}

        def fake_choices(population, weights, k):
            captured["population"] = population
            captured["weights"] = weights
            return [population[0]]

        monkeypatch.setattr(random, "choices", fake_choices)
        targets = [
            {"url": "https://a.com", "weight": 70},
            {"url": "https://b.com", "weight": 30},
        ]
        pick_url(targets)
        assert captured["weights"] == [70, 30]
        assert captured["population"] == ["https://a.com", "https://b.com"]

    def test_decimal_weights_from_dynamodb_do_not_raise(self):
        targets = [
            {"url": "https://a.com", "weight": Decimal("70")},
            {"url": "https://b.com", "weight": Decimal("30")},
        ]
        result = pick_url(targets)
        assert result in {"https://a.com", "https://b.com"}

    def test_heavily_weighted_url_is_selected_more_often(self, monkeypatch):
        calls = {"n": 0}

        original_choices = random.choices

        def biased_choices(population, weights, k):
            calls["n"] += 1
            return original_choices(population, weights=weights, k=k)

        monkeypatch.setattr(random, "choices", biased_choices)
        targets = [
            {"url": "https://a.com", "weight": 1000},
            {"url": "https://b.com", "weight": 1},
        ]
        results = [pick_url(targets) for _ in range(100)]
        assert results.count("https://a.com") > 90


# ---------------------------------------------------------------------------
# TestHandler
# ---------------------------------------------------------------------------

class TestHandler:
    @pytest.fixture(autouse=True)
    def mock_table(self):
        redirect._table = MagicMock()
        yield redirect._table

    def test_missing_path_parameters_returns_400(self, mock_table):
        result = handler({}, None)
        assert result["statusCode"] == 400
        assert "Missing short code" in json.loads(result["body"])["error"]

    def test_none_path_parameters_returns_400(self, mock_table):
        result = handler({"pathParameters": None}, None)
        assert result["statusCode"] == 400

    def test_missing_short_code_key_returns_400(self, mock_table):
        result = handler({"pathParameters": {}}, None)
        assert result["statusCode"] == 400

    def test_short_code_not_found_returns_404(self, mock_table):
        mock_table.get_item.return_value = {}
        result = handler({"pathParameters": {"short_code": "abc12"}}, None)
        assert result["statusCode"] == 404
        assert "not found" in json.loads(result["body"])["error"]

    def test_found_single_target_returns_301(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {"short_code": "abc12", "targets": [{"url": "https://example.com", "weight": 1}]}
        }
        result = handler({"pathParameters": {"short_code": "abc12"}}, None)
        assert result["statusCode"] == 301

    def test_found_single_target_has_location_header(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {"short_code": "abc12", "targets": [{"url": "https://example.com", "weight": 1}]}
        }
        result = handler({"pathParameters": {"short_code": "abc12"}}, None)
        assert result["headers"]["Location"] == "https://example.com"

    def test_found_single_target_body_is_empty_string(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {"short_code": "abc12", "targets": [{"url": "https://example.com", "weight": 1}]}
        }
        result = handler({"pathParameters": {"short_code": "abc12"}}, None)
        assert result["body"] == ""

    def test_get_item_called_with_correct_key(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {"short_code": "xyz99", "targets": [{"url": "https://example.com", "weight": 1}]}
        }
        handler({"pathParameters": {"short_code": "xyz99"}}, None)
        mock_table.get_item.assert_called_once_with(Key={"short_code": "xyz99"})

    def test_weighted_distribution_across_multiple_targets(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {
                "short_code": "abc12",
                "targets": [
                    {"url": "https://a.com", "weight": 1000},
                    {"url": "https://b.com", "weight": 1},
                ],
            }
        }
        results = [
            json.loads("null") or handler({"pathParameters": {"short_code": "abc12"}}, None)["headers"]["Location"]
            for _ in range(100)
        ]
        assert results.count("https://a.com") > 90

    def test_location_is_one_of_valid_targets(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {
                "short_code": "abc12",
                "targets": [
                    {"url": "https://a.com", "weight": 1},
                    {"url": "https://b.com", "weight": 1},
                ],
            }
        }
        result = handler({"pathParameters": {"short_code": "abc12"}}, None)
        assert result["headers"]["Location"] in {"https://a.com", "https://b.com"}
