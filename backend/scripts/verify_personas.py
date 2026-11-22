import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def run_persona_1_audit():
    print("\n--- RUNNING AUDIT: PERSONA 1 (Full Pantry Vegetarian) ---")
    # Abundant Indian vegetarian pantry
    abundant_pantry = {
        "soya_chunks": 1000.0,
        "paneer": 1500.0,
        "moong_dal": 1500.0,
        "rice_white": 2000.0,
        "wheat_atta": 2000.0,
        "oats_rolled": 1000.0,
        "besan": 1000.0,
        "curd": 2000.0,
        "milk": 3000.0,
        "spinach": 2000.0,
        "onion": 1500.0,
        "tomato": 1500.0,
        "cucumber": 1000.0,
        "banana": 15.0,
        "apple": 10.0,
        "peanuts": 500.0,
        "mustard_oil": 500.0,
        "spices_basic": 100.0
    }

    payload = {
        "profile": {
            "age": 26,
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 76.0,
            "activity_level": "moderate",
            "goal": "lean_bulk",
            "target_weight_kg": 80.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "with_gym",
            "experience_level": "intermediate",
            "days_per_week": 5,
            "extra_budget_inr": 0.0
        },
        "pantry": abundant_pantry,
        "extra_budget_inr": 0.0
    }

    res = client.post("/api/plan/generate", json=payload)
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()

    # 1. Sufficiency should be True
    assert data["sufficiency"]["is_sufficient"] is True, "Persona 1 should be 100% sufficient"
    # 2. Minimum Gap Cost must be exactly ₹0
    assert data["minimum_gap"]["min_gap_cost_inr"] == 0.0, "Persona 1 gap cost must be 0"
    # 3. Invariant 3: Zero Phantom Ingredients
    for day in data["meal_plan"]:
        for meal in day["meals"]:
            for ing in meal["ingredients"]:
                assert ing["food_id"] in abundant_pantry, f"Phantom ingredient {ing['food_id']} detected in Persona 1"
        # Invariant 2: Calorie-Macro Identity
        s = day["summary"]
        assert round((s["protein_g"] * 4.0) + (s["carbs_g"] * 4.0) + (s["fats_g"] * 9.0)) == s["calories"]

    print("[OK] Persona 1 passed: 100% pantry covered (INR 0 extra), 0 phantom ingredients, 100% Calorie-Macro identity.")


def run_persona_2_audit():
    print("\n--- RUNNING AUDIT: PERSONA 2 (Low-Stock Student / Home User) ---")
    # Low-stock pantry: only rice, onion, tomato, milk
    low_pantry = {
        "rice_white": 500.0,
        "onion": 200.0,
        "tomato": 200.0,
        "milk": 500.0
    }

    payload = {
        "profile": {
            "age": 21,
            "sex": "male",
            "height_cm": 172.0,
            "weight_kg": 64.0,
            "activity_level": "light",
            "goal": "lean_bulk",
            "target_weight_kg": 70.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 0.0
        },
        "pantry": low_pantry,
        "extra_budget_inr": 0.0
    }

    res = client.post("/api/plan/generate", json=payload)
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()

    # 1. Sufficiency should be False
    assert data["sufficiency"]["is_sufficient"] is False, "Persona 2 must be insufficient"
    # 2. Shortfalls calculated honestly
    assert data["sufficiency"]["shortfalls"]["missing_protein_g"] > 0
    # 3. Minimum gap solver provides non-zero cost and itemized list
    min_cost = data["minimum_gap"]["min_gap_cost_inr"]
    assert min_cost > 0.0, "Persona 2 must require minimal budget gap"
    print(f"  Persona 2 Minimum Gap Cost: INR {min_cost}")
    assert len(data["minimum_gap"]["itemized_shopping_list"]) > 0

    # 4. Test extra budget variety upgrade
    up_res = client.post("/api/plan/upgrade-budget", json={
        "profile": payload["profile"],
        "pantry": low_pantry,
        "extra_budget_inr": 400.0
    })
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["extra_budget"]["spent_extra_inr"] <= 400.0
    print(f"  Persona 2 Extra Budget Spent: INR {up_data['extra_budget']['spent_extra_inr']} of INR 400 max")

    # 5. Workout Timetable: Without Gym (Home) verification
    w_plan = data["workout_plan"]
    assert w_plan["environment"] == "without_gym"
    assert len(w_plan["schedule"]) == 4
    for day in w_plan["schedule"]:
        for ex in day["exercises"]:
            assert ex["environment"] == "without_gym"
            assert ex["tutorial_url"].startswith("https://www.youtube.com/"), f"Broken URL in {ex['id']}"

    print("[OK] Persona 2 passed: Exact shortfall breakdown, minimal INR gap list, extra budget variety upgrade, and Home calisthenics plan with valid video links.")


if __name__ == "__main__":
    run_persona_1_audit()
    run_persona_2_audit()
    print("\n=== ALL PERSONA AUDITS PASSED 100% WITH ZERO FAILURES! ===")
