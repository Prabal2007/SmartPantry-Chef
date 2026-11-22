import json
import math
import os
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

# Load Ground-Truth Datasets
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def get_dish_recipe_urls(dish: Dict[str, Any]) -> tuple[str, str]:
    """
    Returns (video_recipe_url, web_recipe_url) for a dish.
    Falls back to deterministic URL-encoded search URLs if fields are missing or empty.
    Zero fake/hallucinated video IDs; guaranteed valid non-empty URLs without spaces.
    """
    name = dish.get("name") or dish.get("id") or "Indian Dish"
    name_encoded = urllib.parse.quote_plus(str(name).strip())

    video_url = dish.get("video_recipe_url")
    if not video_url or not str(video_url).strip():
        video_url = f"https://www.youtube.com/results?search_query={name_encoded}+healthy+recipe"

    web_url = dish.get("web_recipe_url")
    if not web_url or not str(web_url).strip():
        web_url = f"https://www.google.com/search?q={name_encoded}+easy+step+by+step+recipe"

    return str(video_url).strip(), str(web_url).strip()

with open(os.path.join(DATA_DIR, "foods.json"), "r", encoding="utf-8") as f:
    FOODS_LIST = json.load(f)
    FOOD_MAP = {food["id"]: food for food in FOODS_LIST}

with open(os.path.join(DATA_DIR, "dishes.json"), "r", encoding="utf-8") as f:
    DISHES_LIST = json.load(f)
    for d in DISHES_LIST:
        v_url, w_url = get_dish_recipe_urls(d)
        d["video_recipe_url"] = v_url
        d["web_recipe_url"] = w_url
    DISH_MAP = {dish["id"]: dish for dish in DISHES_LIST}

with open(os.path.join(DATA_DIR, "exercises.json"), "r", encoding="utf-8") as f:
    EXERCISES_LIST = json.load(f)
    EXERCISE_MAP = {ex["id"]: ex for ex in EXERCISES_LIST}


# ==============================================================================
# MODULE A: Biometrics, Body Composition & Target Build Engine
# ==============================================================================

def calculate_biometrics(
    age: int,
    sex: str,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str,
    target_weight_kg: float,
    body_fat_pct: Optional[float] = None,
    skeletal_muscle_pct: Optional[float] = None,
    start_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculates BMR (Mifflin-St Jeor or Katch-McArdle if LBM known),
    TDEE, safe caloric target, and exact macro targets strictly satisfying:
    calories = round(protein_g * 4 + carbs_g * 4 + fats_g * 9).
    """
    lbm_kg = None
    smm_kg = None
    bmr_formula = "mifflin_st_jeor"

    if body_fat_pct is not None and body_fat_pct > 0:
        # Lean Body Mass (LBM) = weight * (1 - BF% / 100)
        lbm_kg = round(weight_kg * (1.0 - (body_fat_pct / 100.0)), 1)
        # Katch-McArdle BMR = 370 + (21.6 * LBM)
        bmr = round(370.0 + (21.6 * lbm_kg))
        bmr_formula = "katch_mcardle"
    else:
        # Mifflin-St Jeor BMR
        if sex.lower() == "male":
            bmr = round((10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) + 5.0)
        else:
            bmr = round((10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) - 161.0)

    if skeletal_muscle_pct is not None and skeletal_muscle_pct > 0:
        smm_kg = round(weight_kg * (skeletal_muscle_pct / 100.0), 1)

    # Activity Multiplier
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725
    }
    multiplier = activity_multipliers.get(activity_level.lower(), 1.375)
    tdee = round(bmr * multiplier)

    # Goal Caloric Adjustment
    if goal == "cut":
        # 400 kcal deficit, bounded by healthy floor
        raw_target = tdee - 400
        min_floor = 1400 if sex.lower() == "male" else 1200
        target_calories = max(min_floor, raw_target)
    elif goal == "lean_bulk":
        # 300 kcal controlled surplus
        target_calories = tdee + 300
    else: # recomp
        target_calories = tdee

    # Protein Target:
    # 2.0 * LBM (if known) else 1.8 * target_weight, clamped between 1.6 and 2.2 * current weight
    if lbm_kg is not None:
        raw_protein = 2.0 * lbm_kg
    else:
        raw_protein = 1.8 * target_weight_kg

    min_protein = round(1.6 * weight_kg, 1)
    max_protein = round(2.2 * weight_kg, 1)
    protein_g = round(max(min_protein, min(max_protein, raw_protein)), 1)

    # Fat Target: 25% of target calories / 9
    fat_cals = target_calories * 0.25
    fats_g = round(fat_cals / 9.0, 1)

    # Carb Target: Remaining daily calories / 4
    # To guarantee strict Calorie-Macro Identity:
    used_cals = (protein_g * 4.0) + (fats_g * 9.0)
    remaining_cals = max(0.0, target_calories - used_cals)
    carbs_g = round(remaining_cals / 4.0, 1)

    # Fine-tune rounding to ensure exact integer identity
    final_cals = round((protein_g * 4.0) + (carbs_g * 4.0) + (fats_g * 9.0))
    if final_cals != target_calories:
        diff = target_calories - final_cals
        carbs_g = round(carbs_g + (diff / 4.0), 1)

    final_cals = round((protein_g * 4.0) + (carbs_g * 4.0) + (fats_g * 9.0))

    # Rate-of-Change Formula: 7,700 kcal ≈ 1 kg
    daily_delta_kcal = final_cals - tdee
    raw_weekly_change_kg = (daily_delta_kcal * 7.0) / 7700.0

    start_w = round(float(weight_kg), 2)
    target_w = round(float(target_weight_kg), 2)

    # Parse anchor start date
    if start_date:
        try:
            base_date = datetime.fromisoformat(start_date).date()
        except Exception:
            base_date = datetime.now(timezone.utc).date()
    else:
        base_date = datetime.now(timezone.utc).date()

    # Anchor Point: Week 0 starts at base_date with exact starting weight
    projection = [
        {
            "week": 0,
            "date": base_date.strftime("%Y-%m-%d"),
            "projected_weight_kg": start_w,
            "weight_kg": start_w
        }
    ]

    is_recomp = (goal == "recomp") or (target_w == start_w) or (goal == "cut" and target_w >= start_w) or (goal == "lean_bulk" and target_w <= start_w)

    if is_recomp:
        weekly_change_kg = 0.0
        estimated_weeks = 12
        for w in range(1, 13):
            curr_date = base_date + timedelta(days=w * 7)
            projection.append({
                "week": w,
                "date": curr_date.strftime("%Y-%m-%d"),
                "projected_weight_kg": start_w,
                "weight_kg": start_w
            })
    elif goal == "cut":
        # Enforce negative weekly change clamped between -0.75 and -0.25 kg/week
        if raw_weekly_change_kg >= 0:
            weekly_change_kg = -0.45
        else:
            weekly_change_kg = max(-0.75, min(-0.25, raw_weekly_change_kg))
        weekly_change_kg = round(weekly_change_kg, 4)

        w = 1
        max_horizon = 52
        while w <= max_horizon:
            curr_date = base_date + timedelta(days=w * 7)
            projected = round(start_w + (w * weekly_change_kg), 2)
            if projected <= target_w or w == max_horizon:
                # Clamp final point to target_weight with zero overshoot
                projected = target_w
                projection.append({
                    "week": w,
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "projected_weight_kg": projected,
                    "weight_kg": projected
                })
                break
            else:
                projection.append({
                    "week": w,
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "projected_weight_kg": projected,
                    "weight_kg": projected
                })
                w += 1
        estimated_weeks = w
    else: # lean_bulk
        # Enforce positive weekly change clamped between +0.15 and +0.45 kg/week
        if raw_weekly_change_kg <= 0:
            weekly_change_kg = 0.25
        else:
            weekly_change_kg = max(0.15, min(0.45, raw_weekly_change_kg))
        weekly_change_kg = round(weekly_change_kg, 4)

        w = 1
        max_horizon = 52
        while w <= max_horizon:
            curr_date = base_date + timedelta(days=w * 7)
            projected = round(start_w + (w * weekly_change_kg), 2)
            if projected >= target_w or w == max_horizon:
                # Clamp final point to target_weight with zero overshoot
                projected = target_w
                projection.append({
                    "week": w,
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "projected_weight_kg": projected,
                    "weight_kg": projected
                })
                break
            else:
                projection.append({
                    "week": w,
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "projected_weight_kg": projected,
                    "weight_kg": projected
                })
                w += 1
        estimated_weeks = w


    return {
        "bmr": bmr,
        "bmr_formula": bmr_formula,
        "tdee": tdee,
        "target_calories": final_cals,
        "protein_target_g": protein_g,
        "carbs_target_g": carbs_g,
        "fats_target_g": fats_g,
        "lbm_kg": lbm_kg,
        "smm_kg": smm_kg,
        "body_fat_pct": body_fat_pct,
        "skeletal_muscle_pct": skeletal_muscle_pct,
        "estimated_weeks": estimated_weeks,
        "weight_projection": projection
    }


# ==============================================================================
# MODULE B: Pantry Sufficiency Audit & Gate Evaluation
# ==============================================================================

def is_dish_cookable(dish: Dict[str, Any], available_food_ids: set) -> bool:
    """Checks if a dish has all its required ingredient IDs in the available set."""
    for ing in dish["ingredients"]:
        if ing["food_id"] not in available_food_ids:
            return False
    return True

def normalize_diet_type(diet_type: str) -> str:
    """Normalizes any diet type string into 'veg', 'eggetarian', or 'non_veg'."""
    dt = (diet_type or "").strip().lower().replace("-", "_").replace(" ", "_")
    if dt in ["veg", "vegetarian", "pure_veg", "pureveg", "vegan"]:
        return "veg"
    if dt in ["eggetarian", "egg", "eggs", "with_eggs", "veg_with_egg", "veg_with_eggs"]:
        return "eggetarian"
    return "non_veg"

def is_food_compliant_with_diet(food: Dict[str, Any], diet_type: str) -> bool:
    """
    Checks if a food item is compliant with the given diet type.
    - veg (pure veg): ZERO non_veg tags, ZERO egg tags.
    - eggetarian (with eggs): ZERO non_veg tags, egg tags allowed.
    - non_veg: all foods allowed.
    """
    f_tags = [t.lower() for t in food.get("diet_tags", [])]
    fid = food.get("id", "")
    is_non_veg = "non_veg" in f_tags or fid in ["chicken_breast", "fish_rohu"]
    is_egg = "egg" in f_tags or fid in ["eggs", "egg_whites"]

    dt = normalize_diet_type(diet_type)
    if dt == "veg":
        return not is_non_veg and not is_egg
    elif dt == "eggetarian":
        return not is_non_veg
    return True

def is_dish_compliant_with_diet(dish: Dict[str, Any], diet_type: str) -> bool:
    """
    Checks if a dish and all its ingredients are strictly compliant with the given diet type.
    - veg (pure veg): dish diet_type must be 'veg' AND zero egg / zero non-veg ingredients.
    - eggetarian (with eggs): dish diet_type in ['veg', 'eggetarian'] AND zero non-veg ingredients.
    - non_veg: all dishes allowed.
    """
    dt = normalize_diet_type(diet_type)
    dish_diet = dish.get("diet_type", "").lower()

    if dt == "veg":
        if dish_diet != "veg":
            return False
        for ing in dish.get("ingredients", []):
            fid = ing["food_id"]
            if fid in FOOD_MAP:
                if not is_food_compliant_with_diet(FOOD_MAP[fid], "veg"):
                    return False
        return True
    elif dt == "eggetarian":
        if dish_diet not in ["veg", "eggetarian"]:
            return False
        for ing in dish.get("ingredients", []):
            fid = ing["food_id"]
            if fid in FOOD_MAP:
                if not is_food_compliant_with_diet(FOOD_MAP[fid], "eggetarian"):
                    return False
        return True
    return True

def filter_dishes_by_diet(dishes: List[Dict[str, Any]], diet_type: str) -> List[Dict[str, Any]]:
    """Filters dishes strictly by user diet type ensuring 0% diet violations."""
    return [d for d in dishes if is_dish_compliant_with_diet(d, diet_type)]

def filter_pantry_by_diet(pantry: Dict[str, float], diet_type: str) -> Dict[str, float]:
    """Filters pantry inventory to only retain items strictly compliant with user diet type."""
    dt = normalize_diet_type(diet_type)
    return {
        fid: qty for fid, qty in pantry.items()
        if fid in FOOD_MAP and is_food_compliant_with_diet(FOOD_MAP[fid], dt)
    }


def evaluate_pantry_sufficiency(
    pantry: Dict[str, float], # { food_id: quantity }
    daily_calories: int,
    daily_protein: float,
    diet_type: str
) -> Dict[str, Any]:
    """
    Evaluates whether current 7-day pantry inventory satisfies all 5 sufficiency gates:
    Gate 1: Available protein >= 90% of weekly protein target
    Gate 2: Available calories >= 90% of weekly calories target
    Gate 3: Available vegetables >= 1400g (14 servings)
    Gate 4: Available fruits >= 7 servings
    Gate 5: At least 1 valid dish for each slot (breakfast, lunch, snack, dinner)
    """
    weekly_cals_target = daily_calories * 7
    weekly_protein_target = daily_protein * 7.0
    weekly_veg_target = 1400.0 # 1400g
    weekly_fruit_target = 7.0 # 7 servings

    avail_cals = 0.0
    avail_protein = 0.0
    avail_veg_g = 0.0
    avail_fruit_servings = 0.0

    pantry_food_ids = set()
    diet_pantry = filter_pantry_by_diet(pantry, diet_type)

    for fid, qty in diet_pantry.items():
        if fid not in FOOD_MAP or qty <= 0:
            continue
        food = FOOD_MAP[fid]
        pantry_food_ids.add(fid)

        factor = qty / (1.0 if food["unit"] == "piece" else 100.0)
        avail_cals += food["calories_per_100"] * factor
        avail_protein += food["protein_per_100"] * factor

        if food["category"] == "vegetable":
            veg_grams = qty if food["unit"] == "g" else qty * 100.0
            avail_veg_g += veg_grams
        elif food["category"] == "fruit":
            fruit_serv = qty if food["unit"] == "piece" else (qty / 100.0)
            avail_fruit_servings += fruit_serv

    gate_protein = avail_protein >= (0.90 * weekly_protein_target)
    gate_cals = avail_cals >= (0.90 * weekly_cals_target)
    gate_veg = avail_veg_g >= weekly_veg_target
    gate_fruit = avail_fruit_servings >= weekly_fruit_target

    # Gate 5: Check cookable dishes for each slot
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, diet_type)
    cookable_by_slot = {"breakfast": [], "lunch": [], "snack": [], "dinner": []}

    for d in allowed_dishes:
        if is_dish_cookable(d, pantry_food_ids):
            slot = d["slot"]
            if slot in cookable_by_slot:
                cookable_by_slot[slot].append(d)

    missing_slots = [slot for slot, d_list in cookable_by_slot.items() if len(d_list) == 0]
    gate_dishes = len(missing_slots) == 0

    is_sufficient = gate_protein and gate_cals and gate_veg and gate_fruit and gate_dishes

    shortfalls = {
        "missing_protein_g": max(0.0, round(weekly_protein_target - avail_protein, 1)),
        "missing_calories": max(0, round(weekly_cals_target - avail_cals)),
        "missing_veg_g": max(0.0, round(weekly_veg_target - avail_veg_g, 1)),
        "missing_fruit_servings": max(0.0, round(weekly_fruit_target - avail_fruit_servings, 1)),
        "missing_slots": missing_slots
    }

    return {
        "is_sufficient": is_sufficient,
        "gates": {
            "protein_gate": {"passed": gate_protein, "available": round(avail_protein, 1), "target": round(weekly_protein_target, 1)},
            "calorie_gate": {"passed": gate_cals, "available": round(avail_cals), "target": weekly_cals_target},
            "vegetable_gate": {"passed": gate_veg, "available": round(avail_veg_g, 1), "target": weekly_veg_target},
            "fruit_gate": {"passed": gate_fruit, "available": round(avail_fruit_servings, 1), "target": weekly_fruit_target},
            "dish_gate": {"passed": gate_dishes, "missing_slots": missing_slots}
        },
        "shortfalls": shortfalls,
        "cookable_slots": {slot: [d["id"] for d in d_list] for slot, d_list in cookable_by_slot.items()}
    }


# ==============================================================================
# MODULE C: Dual-Branch Diet & Minimum-Cost Gap Solver
# ==============================================================================

def get_food_price_and_source(food_id: str, effective_prices: Optional[Dict[str, Any]] = None) -> tuple:
    """
    Resolves price and source for food_id:
    Uses effective_prices if provided; otherwise falls back to foods.json baseline.
    Returns (price: float, source: str).
    """
    if effective_prices and food_id in effective_prices:
        val = effective_prices[food_id]
        if isinstance(val, dict):
            price = float(val.get("price", FOOD_MAP[food_id]["price_per_100g_or_unit_inr"]))
            source = str(val.get("source", "baseline"))
            return price, source
        return float(val), "baseline"
    return float(FOOD_MAP[food_id]["price_per_100g_or_unit_inr"]), "baseline"

def calculate_dish_cost(dish: Dict[str, Any], effective_prices: Optional[Dict[str, Any]] = None) -> float:
    """Calculates dish cost using 3-tier effective prices or baseline."""
    total_cost = 0.0
    for ing in dish["ingredients"]:
        fid = ing["food_id"]
        amt = ing["amount"]
        food = FOOD_MAP[fid]
        factor = amt / (1.0 if food["unit"] == "piece" else 100.0)
        price, _ = get_food_price_and_source(fid, effective_prices)
        total_cost += price * factor
    return round(total_cost, 2)

def solve_minimum_gap(
    pantry: Dict[str, float],
    shortfalls: Dict[str, Any],
    diet_type: str,
    effective_prices: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Deterministic Minimum-Cost Gap Solver:
    Ranks diet_type-compliant foods by lowest cost per unit of missing nutrient
    (e.g., ₹ per gram of protein) using effective_prices to clear all shortfall gates with absolute minimum INR.
    """
    dt = normalize_diet_type(diet_type)
    compliant_foods = [f for f in FOODS_LIST if is_food_compliant_with_diet(f, dt)]
    diet_pantry = filter_pantry_by_diet(pantry, dt)

    gap_cart = {} # { food_id: quantity }
    remaining_protein = shortfalls["missing_protein_g"]
    remaining_cals = shortfalls["missing_calories"]
    remaining_veg = shortfalls["missing_veg_g"]
    remaining_fruit = shortfalls["missing_fruit_servings"]
    missing_slots = set(shortfalls.get("missing_slots", []))

    # 1. Fill Missing Slots First:
    # For any slot with 0 cookable dishes, find the cheapest dish matching diet_type
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, dt)
    active_food_ids = set(diet_pantry.keys())

    for slot in missing_slots:
        slot_dishes = [d for d in allowed_dishes if d["slot"] == slot]
        if not slot_dishes:
            continue
        # Pick lowest cost dish for this slot using effective prices
        slot_dishes.sort(key=lambda d: calculate_dish_cost(d, effective_prices))
        best_dish = slot_dishes[0]
        for ing in best_dish["ingredients"]:
            fid = ing["food_id"]
            if fid not in active_food_ids:
                # Add enough for 7 days
                weekly_amt = ing["amount"] * 7
                gap_cart[fid] = gap_cart.get(fid, 0.0) + weekly_amt
                active_food_ids.add(fid)

    # 2. Re-evaluate remaining shortfalls after adding slot-enabling ingredients
    for fid, qty in gap_cart.items():
        food = FOOD_MAP[fid]
        factor = qty / (1.0 if food["unit"] == "piece" else 100.0)
        remaining_protein = max(0.0, remaining_protein - (food["protein_per_100"] * factor))
        remaining_cals = max(0, remaining_cals - round(food["calories_per_100"] * factor))
        if food["category"] == "vegetable":
            veg_grams = qty if food["unit"] == "g" else qty * 100.0
            remaining_veg = max(0.0, remaining_veg - veg_grams)
        elif food["category"] == "fruit":
            fruit_serv = qty if food["unit"] == "piece" else (qty / 100.0)
            remaining_fruit = max(0.0, remaining_fruit - fruit_serv)

    # 3. Fill Vegetables (Lowest cost per gram of veg using effective prices)
    if remaining_veg > 0:
        veg_foods = [f for f in compliant_foods if f["category"] == "vegetable"]
        veg_foods.sort(key=lambda f: get_food_price_and_source(f["id"], effective_prices)[0])
        cheapest_veg = veg_foods[0] # e.g. spinach or onion or tomato
        add_g = math.ceil(remaining_veg)
        gap_cart[cheapest_veg["id"]] = gap_cart.get(cheapest_veg["id"], 0.0) + add_g

        factor = add_g / 100.0
        remaining_protein = max(0.0, remaining_protein - (cheapest_veg["protein_per_100"] * factor))
        remaining_cals = max(0, remaining_cals - round(cheapest_veg["calories_per_100"] * factor))
        remaining_veg = 0.0

    # 4. Fill Fruits (Lowest cost per serving of fruit using effective prices)
    if remaining_fruit > 0:
        fruit_foods = [f for f in compliant_foods if f["category"] == "fruit"]
        fruit_foods.sort(key=lambda f: get_food_price_and_source(f["id"], effective_prices)[0])
        cheapest_fruit = fruit_foods[0] # e.g. banana
        add_serv = math.ceil(remaining_fruit)
        gap_cart[cheapest_fruit["id"]] = gap_cart.get(cheapest_fruit["id"], 0.0) + add_serv

        factor = add_serv / (1.0 if cheapest_fruit["unit"] == "piece" else 100.0)
        remaining_protein = max(0.0, remaining_protein - (cheapest_fruit["protein_per_100"] * factor))
        remaining_cals = max(0, remaining_cals - round(cheapest_fruit["calories_per_100"] * factor))
        remaining_fruit = 0.0

    # 5. Fill Protein (Lowest cost ₹ per gram of protein using effective prices)
    if remaining_protein > 0:
        protein_foods = [f for f in compliant_foods if f["protein_per_100"] > 5.0 and f["budget_tier"] == "essential"]
        # Sort by price per gram of protein
        protein_foods.sort(key=lambda f: (get_food_price_and_source(f["id"], effective_prices)[0] / f["protein_per_100"]))
        best_protein_food = protein_foods[0] # e.g. soya chunks or eggs

        prot_per_unit = best_protein_food["protein_per_100"]
        needed_units = math.ceil(remaining_protein / prot_per_unit)
        add_qty = needed_units * (1.0 if best_protein_food["unit"] == "piece" else 100.0)
        gap_cart[best_protein_food["id"]] = gap_cart.get(best_protein_food["id"], 0.0) + add_qty

        factor = add_qty / (1.0 if best_protein_food["unit"] == "piece" else 100.0)
        remaining_protein = 0.0
        remaining_cals = max(0, remaining_cals - round(best_protein_food["calories_per_100"] * factor))

    # 6. Fill Calorie Deficit if any remaining (Lowest cost ₹ per 100 kcal)
    if remaining_cals > 0:
        carb_foods = [f for f in compliant_foods if f["category"] in ["grain", "protein"] and f["budget_tier"] == "essential"]
        carb_foods.sort(key=lambda f: (get_food_price_and_source(f["id"], effective_prices)[0] / max(1, f["calories_per_100"])))
        best_carb_food = carb_foods[0] # e.g. wheat atta or rice
        cals_per_unit = best_carb_food["calories_per_100"]
        needed_units = math.ceil(remaining_cals / cals_per_unit)
        add_qty = needed_units * 100.0
        gap_cart[best_carb_food["id"]] = gap_cart.get(best_carb_food["id"], 0.0) + add_qty
        remaining_cals = 0

    # Format Itemized Shopping List & Compute Total Minimum Cost
    itemized_list = []
    total_cost_inr = 0.0

    for fid, qty in gap_cart.items():
        food = FOOD_MAP[fid]
        factor = qty / (1.0 if food["unit"] == "piece" else 100.0)
        unit_price, price_source = get_food_price_and_source(fid, effective_prices)
        line_cost = round(unit_price * factor, 2)
        total_cost_inr += line_cost

        itemized_list.append({
            "food_id": fid,
            "name": food["name"],
            "category": food["category"],
            "quantity": qty,
            "unit": food["unit"],
            "unit_price_inr": unit_price,
            "line_cost_inr": line_cost,
            "price_source": price_source
        })

    itemized_list.sort(key=lambda x: x["line_cost_inr"], reverse=True)

    est_min = round(total_cost_inr * 0.95, 2)
    est_max = round(total_cost_inr * 1.05, 2)

    return {
        "min_gap_cost_inr": round(total_cost_inr, 2),
        "estimated_range_min": est_min,
        "estimated_range_max": est_max,
        "gap_cart": gap_cart,
        "itemized_shopping_list": itemized_list
    }


def upgrade_budget_variety(
    current_pantry_ids: set,
    min_gap_cart: Dict[str, float],
    extra_budget_inr: float,
    diet_type: str,
    effective_prices: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Expands dish variety by unlocking higher-tier ingredients matching diet_type
    strictly within the extra_budget_inr allocation, using effective_prices.
    """
    if extra_budget_inr <= 0:
        return {
            "extra_budget_inr": 0.0,
            "spent_extra_inr": 0.0,
            "estimated_range_min": 0.0,
            "estimated_range_max": 0.0,
            "extra_cart": {},
            "extra_shopping_list": [],
            "unlocked_dishes": []
        }

    dt = normalize_diet_type(diet_type)
    compliant_pantry_ids = {
        fid for fid in current_pantry_ids
        if fid in FOOD_MAP and is_food_compliant_with_diet(FOOD_MAP[fid], dt)
    }
    combined_ids = set(compliant_pantry_ids).union(min_gap_cart.keys())

    # Find candidate dishes that are NOT currently cookable
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, dt)
    locked_dishes = [d for d in allowed_dishes if not is_dish_cookable(d, combined_ids)]

    # Rank locked dishes by incremental unlock cost
    dish_unlock_candidates = []
    for d in locked_dishes:
        missing_ings = [ing for ing in d["ingredients"] if ing["food_id"] not in combined_ids]
        cost = 0.0
        for ing in missing_ings:
            fid = ing["food_id"]
            f = FOOD_MAP[fid]
            factor = (ing["amount"] * 7) / (1.0 if f["unit"] == "piece" else 100.0)
            u_price, _ = get_food_price_and_source(fid, effective_prices)
            cost += u_price * factor
        dish_unlock_candidates.append({
            "dish": d,
            "missing_ings": missing_ings,
            "unlock_cost_inr": round(cost, 2)
        })

    # Sort by lowest unlock cost
    dish_unlock_candidates.sort(key=lambda x: x["unlock_cost_inr"])

    spent_budget = 0.0
    extra_cart = {}
    unlocked_dish_ids = []

    for candidate in dish_unlock_candidates:
        cost = candidate["unlock_cost_inr"]
        if (spent_budget + cost) <= extra_budget_inr and cost > 0:
            spent_budget += cost
            unlocked_dish_ids.append(candidate["dish"]["id"])
            for ing in candidate["missing_ings"]:
                fid = ing["food_id"]
                extra_cart[fid] = extra_cart.get(fid, 0.0) + (ing["amount"] * 7)
                combined_ids.add(fid)

    # Format itemized extra shopping list
    extra_shopping_list = []
    for fid, qty in extra_cart.items():
        food = FOOD_MAP[fid]
        factor = qty / (1.0 if food["unit"] == "piece" else 100.0)
        u_price, p_source = get_food_price_and_source(fid, effective_prices)
        line_cost = round(u_price * factor, 2)
        extra_shopping_list.append({
            "food_id": fid,
            "name": food["name"],
            "category": food["category"],
            "quantity": qty,
            "unit": food["unit"],
            "unit_price_inr": u_price,
            "line_cost_inr": line_cost,
            "price_source": p_source
        })

    est_min = round(spent_budget * 0.95, 2)
    est_max = round(spent_budget * 1.05, 2)

    return {
        "extra_budget_inr": extra_budget_inr,
        "spent_extra_inr": round(spent_budget, 2),
        "estimated_range_min": est_min,
        "estimated_range_max": est_max,
        "extra_cart": extra_cart,
        "extra_shopping_list": extra_shopping_list,
        "unlocked_dishes": [
            {
                **DISH_MAP[did],
                "video_recipe_url": get_dish_recipe_urls(DISH_MAP[did])[0],
                "web_recipe_url": get_dish_recipe_urls(DISH_MAP[did])[1],
            }
            for did in unlocked_dish_ids
        ]
    }


# ==============================================================================
# MODULE D: 7-Day Meal Scheduler
# ==============================================================================

def generate_7day_meal_plan(
    available_food_ids: set,
    diet_type: str,
    target_calories: int,
    target_protein: float,
    effective_prices: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generates a realistic 7-day timetable (Breakfast, Lunch, Snack, Dinner)
    using ONLY dishes cookable from available_food_ids, with live swap options
    and serving multipliers.
    Strictly satisfies: calories = round(protein_g * 4 + carbs_g * 4 + fats_g * 9).
    Dish costs reflect 3-tier effective prices.
    """
    dt = normalize_diet_type(diet_type)
    allowed_dishes = filter_dishes_by_diet(DISHES_LIST, dt)
    cookable = [d for d in allowed_dishes if is_dish_cookable(d, available_food_ids)]

    by_slot = {
        "breakfast": [d for d in cookable if d["slot"] == "breakfast"],
        "lunch": [d for d in cookable if d["slot"] == "lunch"],
        "snack": [d for d in cookable if d["slot"] == "snack"],
        "dinner": [d for d in cookable if d["slot"] == "dinner"]
    }

    # Fallback to any cookable dish if a slot is tight
    for slot in ["breakfast", "lunch", "snack", "dinner"]:
        if not by_slot[slot]:
            by_slot[slot] = cookable if cookable else allowed_dishes

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    plan_days = []

    for day_idx, day_name in enumerate(days):
        b_list = by_slot["breakfast"]
        l_list = by_slot["lunch"]
        s_list = by_slot["snack"]
        d_list = by_slot["dinner"]

        b_dish = b_list[day_idx % len(b_list)]
        l_dish = l_list[day_idx % len(l_list)]
        s_dish = s_list[day_idx % len(s_list)]
        d_dish = d_list[day_idx % len(d_list)]

        day_meals = []
        for d, slot in [(b_dish, "breakfast"), (l_dish, "lunch"), (s_dish, "snack"), (d_dish, "dinner")]:
            swap_opts = []
            for opt in by_slot[slot]:
                if opt["id"] != d["id"]:
                    opt_v, opt_w = get_dish_recipe_urls(opt)
                    swap_opts.append({
                        "id": opt["id"],
                        "name": opt["name"],
                        "slot": opt["slot"],
                        "calories": opt["calories"],
                        "protein_g": opt["protein_g"],
                        "prep_time_mins": opt.get("prep_time_mins", 15),
                        "video_recipe_url": opt_v,
                        "web_recipe_url": opt_w
                    })
                if len(swap_opts) >= 4:
                    break

            dish_cost = calculate_dish_cost(d, effective_prices)
            v_url, w_url = get_dish_recipe_urls(d)
            day_meals.append({
                "meal_id": f"{d['id']}_{day_idx}_{slot}",
                "dish_id": d["id"],
                "name": d["name"],
                "slot": slot,
                "prep_time_mins": d["prep_time_mins"],
                "protein_g": d["protein_g"],
                "carbs_g": d["carbs_g"],
                "fats_g": d["fats_g"],
                "fiber_g": d["fiber_g"],
                "calories": d["calories"],
                "cost_inr": dish_cost,
                "serving_multiplier": 1.0,
                "ingredients": d["ingredients"],
                "recipe_steps": d["recipe_steps"],
                "swap_options": swap_opts,
                "video_recipe_url": v_url,
                "web_recipe_url": w_url
            })

        # Calculate Day Summary
        day_p = round(sum(m["protein_g"] for m in day_meals), 1)
        day_c = round(sum(m["carbs_g"] for m in day_meals), 1)
        day_f = round(sum(m["fats_g"] for m in day_meals), 1)
        day_fiber = round(sum(m["fiber_g"] for m in day_meals), 1)
        # INVARIANT 2: calories = round(P*4 + C*4 + F*9)
        day_cals = round((day_p * 4.0) + (day_c * 4.0) + (day_f * 9.0))

        plan_days.append({
            "day_index": day_idx + 1,
            "day_name": day_name,
            "meals": day_meals,
            "summary": {
                "calories": day_cals,
                "protein_g": day_p,
                "carbs_g": day_c,
                "fats_g": day_f,
                "fiber_g": day_fiber,
                "target_calories": target_calories,
                "target_protein_g": target_protein
            }
        })

    return plan_days


# ==============================================================================
# MODULE E: Workout Split & Exercise Generator
# ==============================================================================

def generate_workout_plan(
    environment: str, # "with_gym" or "without_gym"
    experience_level: str, # "beginner" or "intermediate"
    days_per_week: int, # 3, 4, 5, 6
    goal: str = "recomp" # "cut", "lean_bulk", "recomp"
) -> Dict[str, Any]:
    """
    Generates a structured Gym or Home bodyweight workout schedule
    with exact sets, reps, rest, progression cues, and valid YouTube tutorial links.
    """
    env = "with_gym" if environment.lower() == "with_gym" else "without_gym"
    catalog = [ex for ex in EXERCISES_LIST if ex["environment"] == env]

    # Muscle Group Buckets
    by_muscle = {}
    for ex in catalog:
        m = ex["muscle_group"]
        by_muscle.setdefault(m, []).append(ex)

    # Split layouts
    split_days = []

    if days_per_week == 3:
        # Full Body A / B / C
        split_names = ["Full Body A", "Full Body B", "Full Body C"]
        for idx, sname in enumerate(split_names):
            ex_list = []
            for mg in ["chest", "back", "legs", "shoulders", "core"]:
                pool = by_muscle.get(mg, [])
                if pool:
                    chosen = dict(pool[idx % len(pool)])
                    ex_list.append(chosen)
            split_days.append({"day_num": idx + 1, "day_name": f"Day {idx + 1}: {sname}", "exercises": ex_list})

    elif days_per_week == 4:
        # Upper A / Lower A / Upper B / Lower B
        splits = [
            ("Upper Body A", ["chest", "back", "shoulders", "arms"]),
            ("Lower Body A", ["legs", "legs", "core", "core"]),
            ("Upper Body B", ["chest", "back", "shoulders", "arms"]),
            ("Lower Body B", ["legs", "legs", "core", "core"])
        ]
        for idx, (sname, mgs) in enumerate(splits):
            ex_list = []
            for mg_idx, mg in enumerate(mgs):
                pool = by_muscle.get(mg, [])
                if pool:
                    chosen = dict(pool[(idx + mg_idx) % len(pool)])
                    ex_list.append(chosen)
            split_days.append({"day_num": idx + 1, "day_name": f"Day {idx + 1}: {sname}", "exercises": ex_list})

    elif days_per_week == 5:
        # Upper / Lower / Push / Pull / Legs
        splits = [
            ("Upper Body Focus", ["chest", "back", "shoulders", "arms"]),
            ("Lower Body Focus", ["legs", "legs", "core"]),
            ("Push Day", ["chest", "shoulders", "arms", "core"]),
            ("Pull Day", ["back", "back", "arms", "core"]),
            ("Legs & Core", ["legs", "legs", "core", "full_body"])
        ]
        for idx, (sname, mgs) in enumerate(splits):
            ex_list = []
            for mg_idx, mg in enumerate(mgs):
                pool = by_muscle.get(mg, by_muscle.get("core", []))
                if pool:
                    chosen = dict(pool[(idx + mg_idx) % len(pool)])
                    ex_list.append(chosen)
            split_days.append({"day_num": idx + 1, "day_name": f"Day {idx + 1}: {sname}", "exercises": ex_list})

    else: # 6 days: Push / Pull / Legs x 2
        splits = [
            ("Push A", ["chest", "shoulders", "arms"]),
            ("Pull A", ["back", "back", "arms"]),
            ("Legs A", ["legs", "legs", "core"]),
            ("Push B", ["chest", "shoulders", "arms"]),
            ("Pull B", ["back", "back", "arms"]),
            ("Legs B", ["legs", "legs", "core"])
        ]
        for idx, (sname, mgs) in enumerate(splits):
            ex_list = []
            for mg_idx, mg in enumerate(mgs):
                pool = by_muscle.get(mg, by_muscle.get("core", []))
                if pool:
                    chosen = dict(pool[(idx + mg_idx) % len(pool)])
                    ex_list.append(chosen)
            split_days.append({"day_num": idx + 1, "day_name": f"Day {idx + 1}: {sname}", "exercises": ex_list})

    return {
        "environment": env,
        "experience_level": experience_level,
        "days_per_week": days_per_week,
        "goal": goal,
        "schedule": split_days
    }
