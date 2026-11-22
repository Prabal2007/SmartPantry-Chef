import pytest
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import (
    calculate_biometrics,
    evaluate_pantry_sufficiency,
    solve_minimum_gap,
    upgrade_budget_variety,
    generate_7day_meal_plan,
    generate_workout_plan,
    FOOD_MAP,
    DISHES_LIST
)

def test_calorie_macro_identity_on_all_dishes():
    """Invariant 2: At ingredient, dish, and plan level, calories must equal round(4P + 4C + 9F)."""
    for d in DISHES_LIST:
        expected = round((d["protein_g"] * 4.0) + (d["carbs_g"] * 4.0) + (d["fats_g"] * 9.0))
        assert d["calories"] == expected, f"Dish {d['id']} failed calorie identity: {d['calories']} != {expected}"

def test_biometrics_mifflin_and_katch_mcardle():
    """Test Mifflin-St Jeor & Katch-McArdle BMR formulas and macro calibration."""
    # Quick mode (male, 25yr, 175cm, 75kg, sedentary, cut, target 70kg)
    bio_quick = calculate_biometrics(
        age=25,
        sex="male",
        height_cm=175.0,
        weight_kg=75.0,
        activity_level="sedentary",
        goal="cut",
        target_weight_kg=70.0
    )
    # Expected Mifflin: 10*75 + 6.25*175 - 5*25 + 5 = 750 + 1093.75 - 125 + 5 = 1723.75 -> 1724
    assert bio_quick["bmr"] == 1724
    assert bio_quick["bmr_formula"] == "mifflin_st_jeor"
    # Invariant 2 on target calories
    p, c, f, kcal = bio_quick["protein_target_g"], bio_quick["carbs_target_g"], bio_quick["fats_target_g"], bio_quick["target_calories"]
    assert round((p * 4.0) + (c * 4.0) + (f * 9.0)) == kcal

    # Scan mode with known body fat % (e.g. 15%)
    bio_scan = calculate_biometrics(
        age=25,
        sex="male",
        height_cm=175.0,
        weight_kg=80.0,
        activity_level="moderate",
        goal="lean_bulk",
        target_weight_kg=84.0,
        body_fat_pct=15.0
    )
    # LBM = 80 * (1 - 0.15) = 68.0 kg
    assert bio_scan["lbm_kg"] == 68.0
    # Katch-McArdle: 370 + 21.6 * 68 = 370 + 1468.8 = 1838.8 -> 1839
    assert bio_scan["bmr"] == 1839
    assert bio_scan["bmr_formula"] == "katch_mcardle"
    assert bio_scan["target_calories"] > bio_scan["tdee"]

def test_sufficient_pantry_branch():
    """Branch 1: Sufficient pantry returns is_sufficient == True, ₹0 gap cost, and zero phantom ingredients."""
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

    eval_result = evaluate_pantry_sufficiency(
        pantry=abundant_pantry,
        daily_calories=2100,
        daily_protein=120.0,
        diet_type="veg"
    )
    assert eval_result["is_sufficient"] is True
    assert eval_result["gates"]["protein_gate"]["passed"] is True
    assert eval_result["gates"]["calorie_gate"]["passed"] is True
    assert eval_result["gates"]["vegetable_gate"]["passed"] is True
    assert eval_result["gates"]["fruit_gate"]["passed"] is True
    assert eval_result["gates"]["dish_gate"]["passed"] is True

    # Generate 7-day meal plan
    plan = generate_7day_meal_plan(
        available_food_ids=set(abundant_pantry.keys()),
        diet_type="veg",
        target_calories=2100,
        target_protein=120.0
    )
    assert len(plan) == 7
    # Zero phantom ingredients check
    for day in plan:
        for meal in day["meals"]:
            for ing in meal["ingredients"]:
                assert ing["food_id"] in abundant_pantry, f"Phantom ingredient {ing['food_id']} detected!"
        # Invariant 2 on daily summary
        summary = day["summary"]
        p, c, f, cals = summary["protein_g"], summary["carbs_g"], summary["fats_g"], summary["calories"]
        assert round((p * 4.0) + (c * 4.0) + (f * 9.0)) == cals

def test_deficient_pantry_and_minimum_gap_solver():
    """Branch 2: Low-stock student pantry (only rice, onion, tomato, milk) generates exact gap cart and unlocks meals."""
    low_pantry = {
        "rice_white": 500.0,
        "onion": 200.0,
        "tomato": 200.0,
        "milk": 500.0
    }

    eval_result = evaluate_pantry_sufficiency(
        pantry=low_pantry,
        daily_calories=2000,
        daily_protein=110.0,
        diet_type="veg"
    )
    assert eval_result["is_sufficient"] is False
    assert eval_result["shortfalls"]["missing_protein_g"] > 0

    # Solve Minimum Gap Cart
    solver_result = solve_minimum_gap(
        pantry=low_pantry,
        shortfalls=eval_result["shortfalls"],
        diet_type="veg"
    )

    assert solver_result["min_gap_cost_inr"] > 0
    assert len(solver_result["itemized_shopping_list"]) > 0

    # Combined inventory now satisfies all slots
    combined_ids = set(low_pantry.keys()).union(solver_result["gap_cart"].keys())
    plan = generate_7day_meal_plan(
        available_food_ids=combined_ids,
        diet_type="veg",
        target_calories=2000,
        target_protein=110.0
    )
    assert len(plan) == 7
    for day in plan:
        for meal in day["meals"]:
            for ing in meal["ingredients"]:
                assert ing["food_id"] in combined_ids, f"Phantom ingredient {ing['food_id']} in baseline plan!"

def test_extra_budget_variety_upgrade():
    """Step 2: Raising extra_budget_inr unlocks additional dishes without exceeding allocated budget."""
    low_pantry_ids = {"rice_white", "onion", "tomato", "milk"}
    min_gap_cart = {"soya_chunks": 500.0, "spinach": 1400.0, "banana": 7.0}

    upgrade = upgrade_budget_variety(
        current_pantry_ids=low_pantry_ids,
        min_gap_cart=min_gap_cart,
        extra_budget_inr=500.0,
        diet_type="veg"
    )
    assert upgrade["spent_extra_inr"] <= 500.0
    if upgrade["unlocked_dishes"]:
        for d in upgrade["unlocked_dishes"]:
            # Dish is now cookable with pantry + gap_cart + extra_cart
            full_ids = low_pantry_ids.union(min_gap_cart.keys()).union(upgrade["extra_cart"].keys())
            for ing in d["ingredients"]:
                assert ing["food_id"] in full_ids

def test_workout_splits_gym_and_home():
    """Invariant: Both gym and home workout plans have valid exercises with YouTube tutorial links."""
    for env in ["with_gym", "without_gym"]:
        for days in [3, 4, 5, 6]:
            w_plan = generate_workout_plan(
                environment=env,
                experience_level="beginner",
                days_per_week=days,
                goal="lean_bulk"
            )
            assert len(w_plan["schedule"]) == days
            for s_day in w_plan["schedule"]:
                assert len(s_day["exercises"]) >= 3
                for ex in s_day["exercises"]:
                    assert ex["environment"] == env
                    assert ex["tutorial_url"].startswith("https://www.youtube.com/"), f"Broken URL in {ex['id']}"
