import json
import os
import sys
import urllib.parse
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
import models
from main import app
from engine import get_dish_recipe_urls, DISHES_LIST

# Isolated in-memory database for testing
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def isolated_db():
    Base.metadata.create_all(bind=test_engine)
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)


# ==============================================================================
# 1. DATASET COMPLETENESS & SYNTAX VERIFICATION
# ==============================================================================

def test_dishes_dataset_recipe_links_completeness():
    """
    Asserts:
    1. 100% of dishes in dishes.json have non-empty video_recipe_url and web_recipe_url.
    2. Both URLs strictly begin with 'https://'.
    3. Zero unencoded spaces (' ') in URLs.
    4. Valid URL syntax verified by urllib.parse.urlparse.
    5. Zero fabricated/placeholder domains or dummy IDs (no example.com, TODO, undefined, watch?v=).
    """
    dishes_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "dishes.json")
    with open(dishes_path, "r", encoding="utf-8") as f:
        dishes = json.load(f)

    assert len(dishes) >= 40, f"Expected at least 40 dishes, found {len(dishes)}"

    forbidden_tokens = ["example.com", "TODO", "undefined", "watch?v=", "{url_encoded", "{dish", "{name"]

    for d in dishes:
        dish_id = d["id"]
        dish_name = d["name"]

        assert "video_recipe_url" in d, f"Dish {dish_id} missing video_recipe_url"
        assert "web_recipe_url" in d, f"Dish {dish_id} missing web_recipe_url"

        v_url = d["video_recipe_url"]
        w_url = d["web_recipe_url"]

        assert isinstance(v_url, str) and len(v_url.strip()) > 0, f"Empty video_recipe_url on {dish_id}"
        assert isinstance(w_url, str) and len(w_url.strip()) > 0, f"Empty web_recipe_url on {dish_id}"

        # https check
        assert v_url.startswith("https://"), f"video_recipe_url does not start with https:// on {dish_id}: {v_url}"
        assert w_url.startswith("https://"), f"web_recipe_url does not start with https:// on {dish_id}: {w_url}"

        # Zero unencoded spaces
        assert " " not in v_url, f"Unencoded space found in video_recipe_url on {dish_id}: {v_url}"
        assert " " not in w_url, f"Unencoded space found in web_recipe_url on {dish_id}: {w_url}"

        # Valid URL syntax parsing
        parsed_v = urllib.parse.urlparse(v_url)
        assert parsed_v.scheme == "https", f"Invalid scheme in video_recipe_url on {dish_id}"
        assert parsed_v.netloc in ["www.youtube.com", "youtube.com"], f"Unexpected domain in video_recipe_url on {dish_id}: {parsed_v.netloc}"
        assert "search_query=" in parsed_v.query, f"Missing search_query in video_recipe_url on {dish_id}"

        parsed_w = urllib.parse.urlparse(w_url)
        assert parsed_w.scheme == "https", f"Invalid scheme in web_recipe_url on {dish_id}"
        assert parsed_w.netloc in ["www.google.com", "google.com"], f"Unexpected domain in web_recipe_url on {dish_id}: {parsed_w.netloc}"
        assert "q=" in parsed_w.query, f"Missing query parameter 'q' in web_recipe_url on {dish_id}"

        # Zero placeholder tokens
        for token in forbidden_tokens:
            assert token not in v_url, f"Forbidden token '{token}' in video_recipe_url on {dish_id}: {v_url}"
            assert token not in w_url, f"Forbidden token '{token}' in web_recipe_url on {dish_id}: {w_url}"


# ==============================================================================
# 2. BACKEND DETERMINISTIC FALLBACK HELPER TEST
# ==============================================================================

def test_backend_deterministic_fallback_helper():
    """
    Tests get_dish_recipe_urls fallback behavior when fields are omitted, empty, or whitespace.
    """
    # Test completely empty dict
    v_url, w_url = get_dish_recipe_urls({})
    assert v_url.startswith("https://www.youtube.com/results?search_query=")
    assert w_url.startswith("https://www.google.com/search?q=")
    assert " " not in v_url and " " not in w_url

    # Test custom name with special characters
    dish = {"name": "Palak Paneer & Garlic Naan"}
    v_url, w_url = get_dish_recipe_urls(dish)
    assert "Palak+Paneer+%26+Garlic+Naan" in v_url
    assert "Palak+Paneer+%26+Garlic+Naan" in w_url
    assert " " not in v_url and " " not in w_url


# ==============================================================================
# 3. API PASS-THROUGH TESTS (PLAN GENERATE, SWAP, BUDGET UPGRADE)
# ==============================================================================

def test_plan_generate_api_passthrough_recipe_links():
    """
    Tests POST /api/plan/generate.
    Asserts every meal slot in the 7-day plan, and every swappable alternative,
    contains non-empty, valid video_recipe_url and web_recipe_url.
    """
    payload = {
        "profile": {
            "age": 25,
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 75.0,
            "activity_level": "moderate",
            "goal": "cut",
            "target_weight_kg": 70.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 0.0
        },
        "pantry": {
            "rice_white": 2000.0,
            "wheat_atta": 2000.0,
            "moong_dal": 1000.0,
            "paneer": 1000.0,
            "milk": 2000.0,
            "onion": 1000.0,
            "tomato": 1000.0,
            "mustard_oil": 500.0,
            "spices_basic": 200.0,
            "banana": 12.0
        },
        "extra_budget_inr": 0.0
    }

    res = client.post("/api/plan/generate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "meal_plan" in data
    meal_plan = data["meal_plan"]
    assert len(meal_plan) == 7

    for day in meal_plan:
        meals = day["meals"]
        assert len(meals) == 4
        for m in meals:
            assert "video_recipe_url" in m and m["video_recipe_url"].startswith("https://")
            assert "web_recipe_url" in m and m["web_recipe_url"].startswith("https://")
            assert " " not in m["video_recipe_url"]
            assert " " not in m["web_recipe_url"]

            # Swappable dish alternatives
            for alt in m.get("swap_options", []):
                assert isinstance(alt, dict)
                assert "video_recipe_url" in alt and alt["video_recipe_url"].startswith("https://")
                assert "web_recipe_url" in alt and alt["web_recipe_url"].startswith("https://")
                assert " " not in alt["video_recipe_url"]
                assert " " not in alt["web_recipe_url"]


def test_plan_swap_api_passthrough_recipe_links():
    """
    Tests POST /api/plan/swap-dish.
    Asserts that the swapped meal and all unchanged meals maintain valid recipe URLs.
    """
    # 1. Generate plan with rich pantry
    payload = {
        "profile": {
            "age": 25,
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 75.0,
            "activity_level": "moderate",
            "goal": "cut",
            "target_weight_kg": 70.0,
            "diet_type": "eggetarian",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 0.0
        },
        "pantry": {
            "rice_white": 2000.0,
            "wheat_atta": 2000.0,
            "moong_dal": 1000.0,
            "paneer": 1000.0,
            "milk": 2000.0,
            "onion": 1000.0,
            "tomato": 1000.0,
            "mustard_oil": 500.0,
            "spices_basic": 200.0,
            "banana": 12.0,
            "eggs": 30.0,
            "oats_rolled": 1000.0,
            "bread_brown": 800.0
        },
        "extra_budget_inr": 0.0
    }
    gen_res = client.post("/api/plan/generate", json=payload)
    assert gen_res.status_code == 200
    day1_meals = gen_res.json()["meal_plan"][0]["meals"]

    # 2. Swap breakfast to a different valid dish
    current_dish_id = day1_meals[0]["dish_id"]
    new_dish_id = "paneer_bhurji_toast" if current_dish_id != "paneer_bhurji_toast" else "masala_oats_milk"

    swap_payload = {
        "day_index": 1,
        "slot": "breakfast",
        "new_dish_id": new_dish_id,
        "serving_multiplier": 1.0,
        "day_meals": day1_meals,
        "target_calories": 2000,
        "target_protein": 140.0
    }
    swap_res = client.post("/api/plan/swap-dish", json=swap_payload)
    assert swap_res.status_code == 200
    swapped_data = swap_res.json()

    assert "meals" in swapped_data
    for m in swapped_data["meals"]:
        assert "video_recipe_url" in m and m["video_recipe_url"].startswith("https://")
        assert "web_recipe_url" in m and m["web_recipe_url"].startswith("https://")
        assert " " not in m["video_recipe_url"]
        assert " " not in m["web_recipe_url"]

        if m["slot"] == "breakfast":
            assert m["dish_id"] == new_dish_id
            assert "search_query=" in m["video_recipe_url"]


def test_budget_upgrade_api_passthrough_recipe_links():
    """
    Tests POST /api/plan/upgrade-budget.
    Asserts unlocked_dishes and meal_plan dishes all include valid recipe URLs.
    """
    upgrade_payload = {
        "profile": {
            "age": 25,
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 75.0,
            "activity_level": "moderate",
            "goal": "cut",
            "target_weight_kg": 70.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 600.0
        },
        "pantry": {
            "rice_white": 2000.0,
            "wheat_atta": 2000.0,
            "onion": 500.0,
            "tomato": 500.0,
            "mustard_oil": 200.0,
            "spices_basic": 100.0
        },
        "extra_budget_inr": 600.0
    }

    res = client.post("/api/plan/upgrade-budget", json=upgrade_payload)
    assert res.status_code == 200
    data = res.json()

    # Verify unlocked dishes
    unlocked_dishes = data["extra_budget"].get("unlocked_dishes", [])
    assert len(unlocked_dishes) > 0, "Expected at least 1 unlocked dish with 600 INR extra budget"

    for d in unlocked_dishes:
        assert "video_recipe_url" in d and d["video_recipe_url"].startswith("https://")
        assert "web_recipe_url" in d and d["web_recipe_url"].startswith("https://")
        assert " " not in d["video_recipe_url"]
        assert " " not in d["web_recipe_url"]

    # Verify refreshed meal plan
    meal_plan = data["meal_plan"]
    for day in meal_plan:
        for m in day["meals"]:
            assert "video_recipe_url" in m and m["video_recipe_url"].startswith("https://")
            assert "web_recipe_url" in m and m["web_recipe_url"].startswith("https://")
            assert " " not in m["video_recipe_url"]
            assert " " not in m["web_recipe_url"]
