import pytest
import os
import sys
import json
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
import models
from main import app
from price_sync import (
    sync_daily_prices,
    get_effective_prices,
    get_price_status_report,
    COMMODITY_MAPPING
)
from engine import (
    FOOD_MAP,
    solve_minimum_gap,
    generate_7day_meal_plan
)

# In-memory SQLite for testing price sync
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)


def test_wholesale_to_retail_conversion_and_outlier_median(db_session):
    """
    Test 1:
    - Quintal to 100g: (median_quintal / 1000) * 1.30
    - Quintal to piece: (median_quintal / 100000) * grams_per_unit * 1.30
    - Outlier 99999 rejection via median aggregation
    """
    mock_onion_records = [
        {"modal_price": "2500"},
        {"modal_price": "2600"},
        {"modal_price": "2700"},
        {"modal_price": "99999"}, # Outlier spike
    ]
    # Median of [2500, 2600, 2700, 99999] = (2600 + 2700) / 2 = 2650.0
    # Expected retail per 100g with 1.30 markup: round((2650 / 1000.0) * 1.30, 2) = round(3.445, 2) = 3.45

    mock_banana_records = [
        {"modal_price": "3000"},
        {"modal_price": "3000"},
        {"modal_price": "3000"},
    ]
    # Banana is piece, grams_per_unit = 120.0g
    # Expected retail per piece: round((3000 / 100000.0) * 120 * 1.30, 2) = round(4.68, 2) = 4.68

    async def mock_get(url, params=None):
        comm = params.get("filters[commodity]")
        if comm == "Onion":
            return httpx.Response(200, json={"records": mock_onion_records})
        elif comm == "Banana":
            return httpx.Response(200, json={"records": mock_banana_records})
        return httpx.Response(200, json={"records": []})

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.side_effect = mock_get

    with patch.dict(os.environ, {"DATA_GOV_IN_KEY": "test_key", "RETAIL_MARKUP": "1.30"}):
        import asyncio
        result = asyncio.run(sync_daily_prices(db_session, client=mock_client))
        assert result["status"] in ["ok", "partial"]

        # Check onion
        onion_row = db_session.query(models.LivePrice).filter(models.LivePrice.food_id == "onion").first()
        assert onion_row is not None
        assert onion_row.price_per_unit == round((2650 / 1000.0) * 1.30, 2)
        assert onion_row.raw_modal_quintal == 2650.0

        # Check banana
        banana_row = db_session.query(models.LivePrice).filter(models.LivePrice.food_id == "banana").first()
        assert banana_row is not None
        assert banana_row.price_per_unit == 4.68
        assert banana_row.raw_modal_quintal == 3000.0


def test_sanity_clamp_rejects_deviations_greater_than_50_percent(db_session):
    """
    Test 2:
    - Rejects retail prices deviating > ±50% from foods.json baseline.
    - Zero or invalid modal prices are discarded.
    """
    baseline_onion = FOOD_MAP["onion"]["price_per_100g_or_unit_inr"] # e.g. 3.5
    # A modal price of 10000 quintal -> (10000 / 1000) * 1.30 = 13.0 INR/100g
    # 13.0 > 1.50 * 3.5 (= 5.25), so it must be clamped/rejected.
    mock_records_spike = [
        {"modal_price": "0"}, # Must be ignored
        {"modal_price": "-500"}, # Must be ignored
        {"modal_price": "10000"}, # Extreme spike
    ]

    async def mock_get(url, params=None):
        return httpx.Response(200, json={"records": mock_records_spike})

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.side_effect = mock_get

    with patch.dict(os.environ, {"DATA_GOV_IN_KEY": "test_key", "RETAIL_MARKUP": "1.30"}):
        import asyncio
        result = asyncio.run(sync_daily_prices(db_session, client=mock_client))
        
        # Onion should NOT be saved in live_prices because price was rejected
        onion_row = db_session.query(models.LivePrice).filter(models.LivePrice.food_id == "onion").first()
        assert onion_row is None

        # Skipped items should note the sanity bounds rejection
        skipped = [item for item in result["skipped_items"] if item["food_id"] == "onion"]
        assert len(skipped) > 0
        assert "outside ±50% sanity bounds" in skipped[0]["reason"]


def test_network_failure_resilience_and_cache_preservation(db_session):
    """
    Test 3:
    - HTTP 503 or TimeoutException does not crash the system.
    - Existing cached live prices are strictly preserved.
    """
    # Pre-populate database with an existing cached price
    cached_onion = models.LivePrice(
        food_id="onion",
        price_per_unit=3.20,
        raw_modal_quintal=2400.0,
        source="agmarknet_daily",
        state="Uttar Pradesh",
        updated_at="2026-11-20T12:00:00Z"
    )
    db_session.add(cached_onion)
    db_session.commit()

    async def mock_fail_get(url, params=None):
        raise httpx.TimeoutException("AGMARKNET Gateway Timeout")

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.side_effect = mock_fail_get

    with patch.dict(os.environ, {"DATA_GOV_IN_KEY": "test_key"}):
        import asyncio
        result = asyncio.run(sync_daily_prices(db_session, client=mock_client))

        assert result["status"] == "failed"
        # Verify cached onion was NOT wiped out
        refreshed = db_session.query(models.LivePrice).filter(models.LivePrice.food_id == "onion").first()
        assert refreshed is not None
        assert refreshed.price_per_unit == 3.20


def test_strict_three_tier_price_precedence(db_session):
    """
    Test 4: Strict Precedence:
    Tier 1 (User Price Override) > Tier 2 (Live Market Price) > Tier 3 (Baseline)
    """
    food_id = "onion"
    baseline = FOOD_MAP[food_id]["price_per_100g_or_unit_inr"]

    # Tier 3: Baseline only
    eff3 = get_effective_prices(db_session, user_id="user_test")
    assert eff3[food_id]["price"] == baseline
    assert eff3[food_id]["source"] == "baseline"

    # Tier 2: Add Live Market Price
    live = models.LivePrice(
        food_id=food_id,
        price_per_unit=4.10,
        raw_modal_quintal=3150.0,
        source="agmarknet_daily",
        state="Uttar Pradesh",
        updated_at="2026-11-21T10:00:00Z"
    )
    db_session.add(live)
    db_session.commit()

    eff2 = get_effective_prices(db_session, user_id="user_test")
    assert eff2[food_id]["price"] == 4.10
    assert eff2[food_id]["source"] == "agmarknet_daily"

    # Tier 1: Add User Local Override
    override = models.UserPriceOverride(
        user_id="user_test",
        food_id=food_id,
        custom_price=5.50,
        updated_at="2026-11-21T11:00:00Z"
    )
    db_session.add(override)
    db_session.commit()

    eff1 = get_effective_prices(db_session, user_id="user_test")
    assert eff1[food_id]["price"] == 5.50
    assert eff1[food_id]["source"] == "custom"

    # Remove override -> should revert back to Tier 2 (Live Price)
    db_session.delete(override)
    db_session.commit()
    eff_revert_live = get_effective_prices(db_session, user_id="user_test")
    assert eff_revert_live[food_id]["price"] == 4.10
    assert eff_revert_live[food_id]["source"] == "agmarknet_daily"

    # Remove live price -> should revert back to Tier 3 (Baseline)
    db_session.delete(live)
    db_session.commit()
    eff_revert_base = get_effective_prices(db_session, user_id="user_test")
    assert eff_revert_base[food_id]["price"] == baseline
    assert eff_revert_base[food_id]["source"] == "baseline"


def test_honest_status_under_missing_api_key(db_session):
    """
    Test 5: Zero Fake 'Synced Today' Lies
    If DATA_GOV_IN_KEY is unset, mode must be 'baseline_only' and last_synced_at None.
    """
    with patch.dict(os.environ, {"DATA_GOV_IN_KEY": ""}, clear=True):
        import asyncio
        sync_result = asyncio.run(sync_daily_prices(db_session))
        assert sync_result["status"] == "skipped"

        status_report = get_price_status_report(db_session, user_id="default")
        assert status_report["mode"] == "baseline_only"
        assert status_report["api_key_configured"] is False
        assert status_report["last_synced_at"] is None


def test_zero_regression_on_calorie_macro_identity_and_gap_solver(db_session):
    """
    Test 6: Zero Regression Audit
    - Calorie-Macro Identity: calories == round(4P + 4C + 9F) holds across 7-day meal plan.
    - Minimum Gap Solver produces valid line items with price_source and range bounds.
    """
    # Set up custom effective prices
    effective = {
        "soya_chunks": {"price": 18.0, "source": "custom", "unit": "g"},
        "onion": {"price": 3.80, "source": "agmarknet_daily", "unit": "g"},
        "potato": {"price": 2.50, "source": "agmarknet_daily", "unit": "g"},
        "rice_white": {"price": 5.0, "source": "baseline", "unit": "g"},
        "apple": {"price": 28.0, "source": "agmarknet_daily", "unit": "piece"},
    }

    # Shortfall requiring protein, calories, veg, fruit
    shortfalls = {
        "missing_protein_g": 35.0,
        "missing_calories": 500,
        "missing_veg_g": 200.0,
        "missing_fruit_servings": 1.0,
        "missing_slots": []
    }

    gap_res = solve_minimum_gap(pantry={}, shortfalls=shortfalls, diet_type="veg", effective_prices=effective)
    assert gap_res["min_gap_cost_inr"] > 0
    assert gap_res["estimated_range_min"] <= gap_res["min_gap_cost_inr"]
    assert gap_res["estimated_range_max"] >= gap_res["min_gap_cost_inr"]

    # Verify line items have price_source
    for item in gap_res["itemized_shopping_list"]:
        assert item["price_source"] in ["custom", "agmarknet_daily", "baseline"]
        assert item["line_cost_inr"] > 0

    # Test 7-Day Plan generation satisfies Calorie-Macro Identity
    avail_ids = {"rice_white", "moong_dal", "onion", "tomato", "potato", "milk", "curd", "soya_chunks", "apple"}
    plan = generate_7day_meal_plan(
        available_food_ids=avail_ids,
        diet_type="veg",
        target_calories=2000,
        target_protein=120.0,
        effective_prices=effective
    )

    assert len(plan) == 7
    for day in plan:
        summary = day["summary"]
        p, c, f = summary["protein_g"], summary["carbs_g"], summary["fats_g"]
        cal = summary["calories"]
        assert cal == round((p * 4.0) + (c * 4.0) + (f * 9.0))


def test_price_api_endpoints_integration():
    """
    Test 7: REST API Integration
    - GET /api/prices/status
    - PUT /api/prices/override/{food_id}
    - DELETE /api/prices/override/{food_id}
    """
    # 1. Status endpoint
    r_stat = client.get("/api/prices/status")
    assert r_stat.status_code == 200
    stat_data = r_stat.json()
    assert "mode" in stat_data
    assert "effective_prices" in stat_data

    # 2. Put Override
    r_put = client.put("/api/prices/override/onion", json={"custom_price": 4.50})
    assert r_put.status_code == 200
    put_data = r_put.json()
    assert put_data["status"] == "success"
    assert put_data["custom_price"] == 4.50
    assert put_data["effective_price"]["source"] == "custom"
    assert put_data["effective_price"]["price"] == 4.50

    # 3. Put Invalid Food ID
    r_bad = client.put("/api/prices/override/fake_food_xyz", json={"custom_price": 10.0})
    assert r_bad.status_code == 404

    # 4. Delete Override
    r_del = client.delete("/api/prices/override/onion")
    assert r_del.status_code == 200
    del_data = r_del.json()
    assert del_data["status"] == "reset"
    # Should fall back to baseline or live price (not custom)
    assert del_data["effective_price"]["source"] in ["baseline", "agmarknet_daily"]
