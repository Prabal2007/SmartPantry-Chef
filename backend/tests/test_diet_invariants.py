import json
import os
import sys
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
from engine import (
    normalize_diet_type,
    is_food_compliant_with_diet,
    is_dish_compliant_with_diet,
    filter_dishes_by_diet,
    filter_pantry_by_diet,
    evaluate_pantry_sufficiency,
    solve_minimum_gap,
    upgrade_budget_variety,
    generate_7day_meal_plan,
    FOODS_LIST,
    FOOD_MAP,
    DISHES_LIST
)

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

NON_VEG_FOOD_IDS = {"chicken_breast", "fish_rohu"}
EGG_FOOD_IDS = {"eggs", "egg_whites"}

def get_dish_ingredient_food_ids(dish):
    return {ing["food_id"] for ing in dish.get("ingredients", [])}


def test_pure_veg_food_filtering():
    """Asserts that all non-veg and egg food items are removed under pure veg."""
    pantry = {
        "rice_white": 1000.0,
        "soya_chunks": 500.0,
        "eggs": 12.0,
        "egg_whites": 6.0,
        "chicken_breast": 500.0,
        "fish_rohu": 300.0
    }
    filtered = filter_pantry_by_diet(pantry, "veg")
    assert "rice_white" in filtered
    assert "soya_chunks" in filtered
    assert "eggs" not in filtered
    assert "egg_whites" not in filtered
    assert "chicken_breast" not in filtered
    assert "fish_rohu" not in filtered


def test_eggetarian_food_filtering():
    """Asserts that non-veg items are removed, while eggs and veg are preserved."""
    pantry = {
        "rice_white": 1000.0,
        "eggs": 12.0,
        "egg_whites": 6.0,
        "chicken_breast": 500.0,
        "fish_rohu": 300.0
    }
    filtered = filter_pantry_by_diet(pantry, "eggetarian")
    assert "rice_white" in filtered
    assert "eggs" in filtered
    assert "egg_whites" in filtered
    assert "chicken_breast" not in filtered
    assert "fish_rohu" not in filtered


def test_pure_veg_dish_recommendation_invariants():
    """Asserts that zero non-veg and zero egg dishes/options are recommended for pure veg."""
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, "veg")
    assert len(allowed_dishes) > 0

    for d in allowed_dishes:
        assert d["diet_type"] == "veg", f"Dish {d['name']} has invalid diet_type {d['diet_type']}"
        ing_ids = get_dish_ingredient_food_ids(d)
        assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Dish {d['name']} contains non-veg: {ing_ids}"
        assert not ing_ids.intersection(EGG_FOOD_IDS), f"Dish {d['name']} contains eggs: {ing_ids}"

    # Generate 7-day meal plan
    available_ids = set(FOOD_MAP.keys())
    plan = generate_7day_meal_plan(
        available_food_ids=available_ids,
        diet_type="veg",
        target_calories=2000,
        target_protein=120.0
    )

    for day in plan:
        for meal in day["meals"]:
            ing_ids = {ing["food_id"] for ing in meal["ingredients"]}
            assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Meal {meal['name']} has non-veg"
            assert not ing_ids.intersection(EGG_FOOD_IDS), f"Meal {meal['name']} has eggs"

            # Check swap options
            for opt in meal.get("swap_options", []):
                opt_dish = next((d for d in DISHES_LIST if d["id"] == opt["id"]), None)
                if opt_dish:
                    opt_ings = get_dish_ingredient_food_ids(opt_dish)
                    assert not opt_ings.intersection(NON_VEG_FOOD_IDS), f"Swap {opt['name']} has non-veg"
                    assert not opt_ings.intersection(EGG_FOOD_IDS), f"Swap {opt['name']} has eggs"


def test_eggetarian_dish_recommendation_invariants():
    """Asserts that zero non-veg dishes are recommended for eggetarians."""
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, "eggetarian")
    assert len(allowed_dishes) > 0

    for d in allowed_dishes:
        assert d["diet_type"] in ["veg", "eggetarian"]
        ing_ids = get_dish_ingredient_food_ids(d)
        assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Dish {d['name']} contains non-veg: {ing_ids}"

    available_ids = set(FOOD_MAP.keys())
    plan = generate_7day_meal_plan(
        available_food_ids=available_ids,
        diet_type="eggetarian",
        target_calories=2000,
        target_protein=120.0
    )

    for day in plan:
        for meal in day["meals"]:
            ing_ids = {ing["food_id"] for ing in meal["ingredients"]}
            assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Meal {meal['name']} has non-veg"
            for opt in meal.get("swap_options", []):
                opt_dish = next((d for d in DISHES_LIST if d["id"] == opt["id"]), None)
                if opt_dish:
                    opt_ings = get_dish_ingredient_food_ids(opt_dish)
                    assert not opt_ings.intersection(NON_VEG_FOOD_IDS), f"Swap {opt['name']} has non-veg"


def test_pure_veg_minimum_gap_and_variety():
    """Asserts that Gap Solver and Extra Budget variety never suggest eggs or non-veg for veg."""
    shortfalls = {
        "missing_protein_g": 300.0,
        "missing_calories": 5000,
        "missing_veg_g": 1000.0,
        "missing_fruit_servings": 5.0,
        "missing_slots": ["breakfast", "lunch"]
    }
    gap_res = solve_minimum_gap(pantry={}, shortfalls=shortfalls, diet_type="veg")
    gap_cart_ids = set(gap_res["gap_cart"].keys())
    assert not gap_cart_ids.intersection(NON_VEG_FOOD_IDS)
    assert not gap_cart_ids.intersection(EGG_FOOD_IDS)

    # Extra budget variety
    extra_res = upgrade_budget_variety(
        current_pantry_ids={"rice_white", "moong_dal"},
        min_gap_cart=gap_res["gap_cart"],
        extra_budget_inr=500.0,
        diet_type="veg"
    )
    for unlocked in extra_res["unlocked_dishes"]:
        ing_ids = {ing["food_id"] for ing in unlocked.get("missing_ingredients", [])}
        assert not ing_ids.intersection(NON_VEG_FOOD_IDS)
        assert not ing_ids.intersection(EGG_FOOD_IDS)


def test_api_plan_generation_diet_isolation():
    """Full API integration test ensuring zero non-veg and zero egg leakage via /api/plan/generate."""
    # 1. Pure Veg Request with tainted pantry (user mistakenly has eggs & chicken in pantry)
    payload_veg = {
        "profile": {
            "age": 25,
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 75.0,
            "activity_level": "moderate",
            "goal": "lean_bulk",
            "target_weight_kg": 79.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 200.0
        },
        "pantry": {
            "chicken_breast": 1000.0,
            "eggs": 24.0,
            "rice_white": 1000.0,
            "moong_dal": 500.0,
            "tomato": 500.0,
            "onion": 500.0
        },
        "extra_budget_inr": 200.0
    }

    res_veg = client.post("/api/plan/generate", json=payload_veg)
    assert res_veg.status_code == 200
    data_veg = res_veg.json()

    # Verify meal plan
    for day in data_veg["meal_plan"]:
        for meal in day["meals"]:
            dish_name = meal["name"]
            ing_ids = {ing["food_id"] for ing in meal["ingredients"]}
            assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Pure veg meal {dish_name} contains non-veg!"
            assert not ing_ids.intersection(EGG_FOOD_IDS), f"Pure veg meal {dish_name} contains eggs!"

            for swap in meal.get("swap_options", []):
                opt_dish = next((d for d in DISHES_LIST if d["id"] == swap["id"]), None)
                if opt_dish:
                    opt_ings = get_dish_ingredient_food_ids(opt_dish)
                    assert not opt_ings.intersection(NON_VEG_FOOD_IDS), f"Pure veg swap {swap['name']} has non-veg"
                    assert not opt_ings.intersection(EGG_FOOD_IDS), f"Pure veg swap {swap['name']} has eggs"

    # Verify shopping list
    for item in data_veg["minimum_gap"].get("itemized_shopping_list", []):
        assert item["food_id"] not in NON_VEG_FOOD_IDS
        assert item["food_id"] not in EGG_FOOD_IDS

    # 2. Eggetarian Request (Eggs allowed, zero non-veg)
    payload_egg = dict(payload_veg)
    payload_egg["profile"] = dict(payload_veg["profile"])
    payload_egg["profile"]["diet_type"] = "eggetarian"

    res_egg = client.post("/api/plan/generate", json=payload_egg)
    assert res_egg.status_code == 200
    data_egg = res_egg.json()

    for day in data_egg["meal_plan"]:
        for meal in day["meals"]:
            ing_ids = {ing["food_id"] for ing in meal["ingredients"]}
            assert not ing_ids.intersection(NON_VEG_FOOD_IDS), f"Eggetarian meal {meal['name']} contains non-veg!"
            for swap in meal.get("swap_options", []):
                opt_dish = next((d for d in DISHES_LIST if d["id"] == swap["id"]), None)
                if opt_dish:
                    opt_ings = get_dish_ingredient_food_ids(opt_dish)
                    assert not opt_ings.intersection(NON_VEG_FOOD_IDS), f"Eggetarian swap {swap['name']} has non-veg"
