import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import engine, Base, get_db, SessionLocal
import models
from engine import (
    calculate_biometrics,
    evaluate_pantry_sufficiency,
    solve_minimum_gap,
    upgrade_budget_variety,
    generate_7day_meal_plan,
    generate_workout_plan,
    calculate_dish_cost,
    get_dish_recipe_urls,
    filter_pantry_by_diet,
    is_dish_compliant_with_diet,
    normalize_diet_type,
    FOODS_LIST,
    FOOD_MAP,
    DISHES_LIST,
    DISH_MAP,
    EXERCISES_LIST
)
from ml_bodycomp import predict_body_composition
from price_sync import (
    sync_daily_prices,
    get_effective_prices,
    get_price_status_report,
    sync_if_stale,
    get_config
)

# Create database tables
Base.metadata.create_all(bind=engine)

# AsyncIOScheduler for daily 14:30 IST AGMARKNET sync
scheduler = AsyncIOScheduler()

async def scheduled_daily_sync():
    db = SessionLocal()
    try:
        await sync_daily_prices(db)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schedule daily at 14:30 Asia/Kolkata
    trigger = CronTrigger(hour=14, minute=30, timezone=ZoneInfo("Asia/Kolkata"))
    scheduler.add_job(scheduled_daily_sync, trigger, id="daily_agmarknet_sync", replace_existing=True)
    scheduler.start()

    # Non-blocking background stale-cache check on server startup
    asyncio.create_task(sync_if_stale())

    yield

    if scheduler.running:
        scheduler.shutdown()

app = FastAPI(
    title="NutriForge API",
    description="Deterministic Pantry, Budget-Gap & Physique Planner Engine with Daily Market Prices",
    version="1.1.0",
    lifespan=lifespan
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PYDANTIC SCHEMAS ---

class ProfileSchema(BaseModel):
    age: int = Field(24, ge=14, le=90)
    sex: str = Field("male", pattern="^(male|female)$")
    height_cm: float = Field(175.0, ge=100.0, le=250.0)
    weight_kg: float = Field(72.0, ge=30.0, le=300.0)
    activity_level: str = Field("moderate", pattern="^(sedentary|light|moderate|active)$")
    goal: str = Field("lean_bulk", pattern="^(cut|lean_bulk|recomp)$")
    target_weight_kg: float = Field(76.0, ge=30.0, le=300.0)
    diet_type: str = Field("veg", pattern="^(veg|eggetarian|non_veg)$")
    body_comp_mode: str = Field("quick", pattern="^(quick|smart_ml|scan)$")
    body_fat_pct: Optional[float] = None
    skeletal_muscle_pct: Optional[float] = None
    workout_environment: str = Field("without_gym", pattern="^(with_gym|without_gym)$")
    experience_level: str = Field("beginner", pattern="^(beginner|intermediate)$")
    days_per_week: int = Field(4, ge=3, le=6)
    extra_budget_inr: float = Field(0.0, ge=0.0)

class BodyCompPredictSchema(BaseModel):
    age: int = 25
    sex: str = "male"
    height_cm: float = 175.0
    weight_kg: float = 75.0
    waist_cm: float = 82.0
    hip_cm: Optional[float] = None
    arm_cm: Optional[float] = None
    neck_cm: Optional[float] = None

class PantryItemInput(BaseModel):
    food_id: str
    quantity: float
    unit: Optional[str] = None

class PantryBatchInput(BaseModel):
    items: List[PantryItemInput]

class PlanGenerateRequest(BaseModel):
    profile: ProfileSchema
    pantry: Dict[str, float] # { food_id: quantity }
    extra_budget_inr: float = 0.0

class BudgetUpgradeRequest(BaseModel):
    profile: ProfileSchema
    pantry: Dict[str, float]
    extra_budget_inr: float = 0.0

class DishSwapRequest(BaseModel):
    day_index: int
    slot: str
    new_dish_id: str
    serving_multiplier: float = 1.0
    day_meals: List[Dict[str, Any]]
    target_calories: int
    target_protein: float

class WeightLogInput(BaseModel):
    weight_kg: float = Field(..., gt=20.0, le=400.0, description="Exact body weight in kg")
    notes: Optional[str] = None
    date: Optional[str] = None
    user_id: Optional[int] = 1

class PriceOverrideInput(BaseModel):
    custom_price: float = Field(..., gt=0.0, description="Custom local retail price in INR")


# --- STATIC CATALOG ENDPOINTS ---

@app.get("/api/foods")
def get_foods(category: Optional[str] = None):
    """Returns the ground-truth foods database."""
    if category:
        return [f for f in FOODS_LIST if f["category"] == category]
    return FOODS_LIST

@app.get("/api/dishes")
def get_dishes(slot: Optional[str] = None, diet_type: Optional[str] = None):
    """Returns the ground-truth dishes database with complete video and web recipe URLs."""
    results = DISHES_LIST
    if slot:
        results = [d for d in results if d["slot"] == slot]
    if diet_type:
        dt = diet_type.lower()
        if dt == "veg":
            results = [d for d in results if d["diet_type"] == "veg"]
        elif dt == "eggetarian":
            results = [d for d in results if d["diet_type"] in ["veg", "eggetarian"]]
    return [
        {
            **d,
            "video_recipe_url": d.get("video_recipe_url") or get_dish_recipe_urls(d)[0],
            "web_recipe_url": d.get("web_recipe_url") or get_dish_recipe_urls(d)[1]
        }
        for d in results
    ]

@app.get("/api/exercises")
def get_exercises(environment: Optional[str] = None):
    """Returns gym or home exercises with working YouTube tutorial URLs."""
    if environment:
        return [ex for ex in EXERCISES_LIST if ex["environment"] == environment]
    return EXERCISES_LIST


# --- BODY COMPOSITION ML ENDPOINT ---

@app.post("/api/predict/body-comp")
def predict_body_comp(data: BodyCompPredictSchema):
    """
    Predicts body fat %, LBM, and SMM using trained scikit-learn regression model
    or calibrated anthropometric formula fallback with confidence bounds.
    """
    return predict_body_composition(
        age=data.age,
        sex=data.sex,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        waist_cm=data.waist_cm,
        hip_cm=data.hip_cm,
        arm_cm=data.arm_cm,
        neck_cm=data.neck_cm
    )


# --- USER PROFILE & PANTRY ENDPOINTS ---

@app.post("/api/profile")
def save_profile(data: ProfileSchema, db: Session = Depends(get_db)):
    """Creates or updates the user profile in SQLite."""
    profile = db.query(models.UserProfile).first()
    if not profile:
        profile = models.UserProfile(**data.dict())
        db.add(profile)
    else:
        for k, v in data.dict().items():
            setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile

@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    """Retrieves user profile, or returns default initial state."""
    profile = db.query(models.UserProfile).first()
    if not profile:
        # Default new profile
        default_p = ProfileSchema()
        return default_p.dict()
    return profile

@app.get("/api/pantry")
def get_pantry(db: Session = Depends(get_db)):
    """Retrieves stored pantry items for active user."""
    items = db.query(models.PantryItem).all()
    pantry_dict = {item.food_id: item.quantity for item in items}
    return {"pantry": pantry_dict, "items": [{"food_id": i.food_id, "quantity": i.quantity, "unit": i.unit} for i in items]}

@app.post("/api/pantry")
def save_pantry(data: PantryBatchInput, db: Session = Depends(get_db)):
    """Replaces stored pantry inventory."""
    db.query(models.PantryItem).delete()
    new_items = []
    for item in data.items:
        f = FOOD_MAP.get(item.food_id)
        unit = item.unit or (f["unit"] if f else "g")
        new_item = models.PantryItem(food_id=item.food_id, quantity=item.quantity, unit=unit)
        db.add(new_item)
        new_items.append(new_item)
    db.commit()
    pantry_dict = {i.food_id: i.quantity for i in new_items}
    return {"pantry": pantry_dict, "count": len(new_items)}

@app.post("/api/pantry/preset-student")
def load_student_preset(db: Session = Depends(get_db)):
    """Loads a realistic Indian student/hostel kitchen preset for instant 1-click testing."""
    student_items = [
        {"food_id": "rice_white", "quantity": 1000.0, "unit": "g"},
        {"food_id": "wheat_atta", "quantity": 1000.0, "unit": "g"},
        {"food_id": "moong_dal", "quantity": 500.0, "unit": "g"},
        {"food_id": "onion", "quantity": 500.0, "unit": "g"},
        {"food_id": "tomato", "quantity": 500.0, "unit": "g"},
        {"food_id": "potato", "quantity": 500.0, "unit": "g"},
        {"food_id": "milk", "quantity": 1000.0, "unit": "ml"},
        {"food_id": "curd", "quantity": 400.0, "unit": "g"},
        {"food_id": "mustard_oil", "quantity": 250.0, "unit": "ml"},
        {"food_id": "spices_basic", "quantity": 100.0, "unit": "g"}
    ]
    db.query(models.PantryItem).delete()
    for item in student_items:
        db.add(models.PantryItem(food_id=item["food_id"], quantity=item["quantity"], unit=item["unit"]))
    db.commit()
    return {"status": "success", "pantry": {i["food_id"]: i["quantity"] for i in student_items}}


# --- PLAN GENERATOR & OPTIMIZER ENDPOINTS ---

@app.post("/api/plan/generate")
def generate_full_plan(req: PlanGenerateRequest, db: Session = Depends(get_db)):
    """
    Main Plan Generator:
    1. Computes Biometrics & Macro Targets (Satisfying 4P + 4C + 9F == kcal).
    2. Runs Pantry Sufficiency Audit across all 5 gates.
    3. Branch 1: If sufficient -> ₹0 gap cost.
       Branch 2: If insufficient -> runs deterministic Minimum-Cost Gap Solver using 3-tier effective prices.
    4. Applies extra budget variety upgrade (if requested) using 3-tier effective prices.
    5. Generates 7-day meal plan with zero phantom ingredients.
    6. Generates tailored Gym or Home Workout schedule with YouTube form links.
    """
    p = req.profile
    effective_prices = get_effective_prices(db, user_id="default")

    # 1. Biometrics
    biometrics = calculate_biometrics(
        age=p.age,
        sex=p.sex,
        height_cm=p.height_cm,
        weight_kg=p.weight_kg,
        activity_level=p.activity_level,
        goal=p.goal,
        target_weight_kg=p.target_weight_kg,
        body_fat_pct=p.body_fat_pct,
        skeletal_muscle_pct=p.skeletal_muscle_pct
    )

    # 2. Sufficiency Audit (Filtering pantry to items compliant with diet)
    clean_pantry = filter_pantry_by_diet(req.pantry, p.diet_type)
    audit = evaluate_pantry_sufficiency(
        pantry=clean_pantry,
        daily_calories=biometrics["target_calories"],
        daily_protein=biometrics["protein_target_g"],
        diet_type=p.diet_type
    )

    min_gap_result = {"min_gap_cost_inr": 0.0, "gap_cart": {}, "itemized_shopping_list": []}
    if not audit["is_sufficient"]:
        min_gap_result = solve_minimum_gap(
            pantry=clean_pantry,
            shortfalls=audit["shortfalls"],
            diet_type=p.diet_type,
            effective_prices=effective_prices
        )

    # 3. Extra Budget Upgrade
    extra_upgrade = upgrade_budget_variety(
        current_pantry_ids=set(clean_pantry.keys()),
        min_gap_cart=min_gap_result["gap_cart"],
        extra_budget_inr=req.extra_budget_inr,
        diet_type=p.diet_type,
        effective_prices=effective_prices
    )

    # 4. Total Allowed Food IDs for Cooking
    available_food_ids = set(clean_pantry.keys()).union(min_gap_result["gap_cart"].keys()).union(extra_upgrade["extra_cart"].keys())

    # 5. 7-Day Meal Timetable
    meal_plan = generate_7day_meal_plan(
        available_food_ids=available_food_ids,
        diet_type=p.diet_type,
        target_calories=biometrics["target_calories"],
        target_protein=biometrics["protein_target_g"],
        effective_prices=effective_prices
    )

    # 6. Workout Timetable
    workout_plan = generate_workout_plan(
        environment=p.workout_environment,
        experience_level=p.experience_level,
        days_per_week=p.days_per_week,
        goal=p.goal
    )

    return {
        "biometrics": biometrics,
        "sufficiency": audit,
        "minimum_gap": min_gap_result,
        "extra_budget": extra_upgrade,
        "meal_plan": meal_plan,
        "workout_plan": workout_plan
    }


@app.post("/api/plan/upgrade-budget")
def upgrade_budget_plan(req: BudgetUpgradeRequest, db: Session = Depends(get_db)):
    """
    Dynamically recalculates the extra shopping cart, unlocked dishes,
    and refreshed meal plan when user moves the extra budget slider.
    """
    p = req.profile
    effective_prices = get_effective_prices(db, user_id="default")

    biometrics = calculate_biometrics(
        age=p.age,
        sex=p.sex,
        height_cm=p.height_cm,
        weight_kg=p.weight_kg,
        activity_level=p.activity_level,
        goal=p.goal,
        target_weight_kg=p.target_weight_kg,
        body_fat_pct=p.body_fat_pct,
        skeletal_muscle_pct=p.skeletal_muscle_pct
    )

    clean_pantry = filter_pantry_by_diet(req.pantry, p.diet_type)
    audit = evaluate_pantry_sufficiency(
        pantry=clean_pantry,
        daily_calories=biometrics["target_calories"],
        daily_protein=biometrics["protein_target_g"],
        diet_type=p.diet_type
    )

    min_gap_result = {"min_gap_cost_inr": 0.0, "gap_cart": {}, "itemized_shopping_list": []}
    if not audit["is_sufficient"]:
        min_gap_result = solve_minimum_gap(
            pantry=clean_pantry,
            shortfalls=audit["shortfalls"],
            diet_type=p.diet_type,
            effective_prices=effective_prices
        )

    extra_upgrade = upgrade_budget_variety(
        current_pantry_ids=set(clean_pantry.keys()),
        min_gap_cart=min_gap_result["gap_cart"],
        extra_budget_inr=req.extra_budget_inr,
        diet_type=p.diet_type,
        effective_prices=effective_prices
    )

    available_food_ids = set(clean_pantry.keys()).union(min_gap_result["gap_cart"].keys()).union(extra_upgrade["extra_cart"].keys())

    meal_plan = generate_7day_meal_plan(
        available_food_ids=available_food_ids,
        diet_type=p.diet_type,
        target_calories=biometrics["target_calories"],
        target_protein=biometrics["protein_target_g"],
        effective_prices=effective_prices
    )

    return {
        "extra_budget": extra_upgrade,
        "meal_plan": meal_plan
    }


@app.get("/api/plan/alternatives")
@app.get("/api/plan/swaps")
def get_plan_alternatives(slot: Optional[str] = None, diet_type: Optional[str] = None):
    """Returns swappable cookable alternatives with complete video and web recipe URLs."""
    results = DISHES_LIST
    if slot:
        results = [d for d in results if d["slot"] == slot]
    if diet_type:
        results = [d for d in results if is_dish_compliant_with_diet(d, diet_type)]
    return [
        {
            **d,
            "video_recipe_url": d.get("video_recipe_url") or get_dish_recipe_urls(d)[0],
            "web_recipe_url": d.get("web_recipe_url") or get_dish_recipe_urls(d)[1]
        }
        for d in results
    ]


@app.post("/api/plan/swap-dish")
def swap_dish_slot(req: DishSwapRequest, db: Session = Depends(get_db)):
    """
    Swaps a single meal slot with an alternative cookable dish,
    recalculating macros for that dish and the day's totals.
    Guarantees strict Calorie-Macro Identity, dynamic effective pricing,
    and preserves complete video_recipe_url and web_recipe_url on all dishes and options.
    """
    if req.new_dish_id not in DISH_MAP:
        raise HTTPException(status_code=404, detail="Dish not found")

    new_d = DISH_MAP[req.new_dish_id]
    mult = req.serving_multiplier
    effective_prices = get_effective_prices(db, user_id="default")
    dish_cost = calculate_dish_cost(new_d, effective_prices)
    new_v_url, new_w_url = get_dish_recipe_urls(new_d)

    updated_meals = []
    for m in req.day_meals:
        # Enforce URLs on swap options if present
        raw_swaps = m.get("swap_options", [])
        enriched_swaps = []
        for opt in raw_swaps:
            if isinstance(opt, dict):
                ov, ow = get_dish_recipe_urls(opt)
                enriched_swaps.append({
                    **opt,
                    "video_recipe_url": opt.get("video_recipe_url") or ov,
                    "web_recipe_url": opt.get("web_recipe_url") or ow
                })
            elif isinstance(opt, str) and opt in DISH_MAP:
                ov, ow = get_dish_recipe_urls(DISH_MAP[opt])
                enriched_swaps.append({
                    "id": opt,
                    "name": DISH_MAP[opt]["name"],
                    "slot": DISH_MAP[opt]["slot"],
                    "calories": DISH_MAP[opt]["calories"],
                    "protein_g": DISH_MAP[opt]["protein_g"],
                    "prep_time_mins": DISH_MAP[opt]["prep_time_mins"],
                    "video_recipe_url": ov,
                    "web_recipe_url": ow
                })
            else:
                enriched_swaps.append(opt)

        if m["slot"] == req.slot:
            p = round(new_d["protein_g"] * mult, 1)
            c = round(new_d["carbs_g"] * mult, 1)
            f = round(new_d["fats_g"] * mult, 1)
            fib = round(new_d["fiber_g"] * mult, 1)
            cals = round((p * 4.0) + (c * 4.0) + (f * 9.0))
            updated_m = {
                "meal_id": f"{new_d['id']}_{req.day_index}_{req.slot}",
                "dish_id": new_d["id"],
                "name": new_d["name"],
                "slot": req.slot,
                "prep_time_mins": new_d["prep_time_mins"],
                "protein_g": p,
                "carbs_g": c,
                "fats_g": f,
                "fiber_g": fib,
                "calories": cals,
                "cost_inr": round(dish_cost * mult, 2),
                "serving_multiplier": mult,
                "ingredients": new_d["ingredients"],
                "recipe_steps": new_d["recipe_steps"],
                "swap_options": enriched_swaps,
                "video_recipe_url": new_v_url,
                "web_recipe_url": new_w_url
            }
            updated_meals.append(updated_m)
        else:
            mv, mw = get_dish_recipe_urls(m)
            enriched_m = {
                **m,
                "swap_options": enriched_swaps,
                "video_recipe_url": m.get("video_recipe_url") or mv,
                "web_recipe_url": m.get("web_recipe_url") or mw
            }
            updated_meals.append(enriched_m)


    day_p = round(sum(m["protein_g"] for m in updated_meals), 1)
    day_c = round(sum(m["carbs_g"] for m in updated_meals), 1)
    day_f = round(sum(m["fats_g"] for m in updated_meals), 1)
    day_fib = round(sum(m["fiber_g"] for m in updated_meals), 1)
    day_cals = round((day_p * 4.0) + (day_c * 4.0) + (day_f * 9.0))

    return {
        "day_index": req.day_index,
        "meals": updated_meals,
        "summary": {
            "calories": day_cals,
            "protein_g": day_p,
            "carbs_g": day_c,
            "fats_g": day_f,
            "fiber_g": day_fib,
            "target_calories": req.target_calories,
            "target_protein_g": req.target_protein
        }
    }


# --- WEIGHT LOGS & STALL ADJUSTER ENDPOINTS ---

@app.post("/api/weight-log")
@app.post("/api/checkin")
def add_weight_log(log_in: WeightLogInput, db: Session = Depends(get_db)):
    """
    Logs weekly weight check-in with exact value fidelity.
    Detects if weight has stalled over 2 consecutive check-ins and auto-suggests ±150 kcal.
    """
    user_id = log_in.user_id or 1
    clean_weight = round(float(log_in.weight_kg), 1)
    logged_date = log_in.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    new_log = models.WeightLog(
        user_id=user_id,
        weight_kg=clean_weight,
        logged_date=logged_date,
        notes=log_in.notes
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # Query last 3 real check-ins for active user
    recent_logs = (
        db.query(models.WeightLog)
        .filter(models.WeightLog.user_id == user_id)
        .order_by(models.WeightLog.id.desc())
        .limit(3)
        .all()
    )
    profile = db.query(models.UserProfile).first()
    goal = profile.goal if profile else "cut"

    adjustment_recommendation = None
    if len(recent_logs) >= 2:
        w1 = recent_logs[0].weight_kg
        w2 = recent_logs[1].weight_kg
        diff = abs(w1 - w2)

        if goal == "cut":
            # If weight didn't decrease by more than 0.1 kg or diff < 0.15 kg
            if w1 >= (w2 - 0.1) or diff < 0.15:
                adjustment_recommendation = {
                    "stalled": True,
                    "calorie_adjustment": -150,
                    "message": "Weight has plateaued over your last 2 check-ins. Recommended: decrease daily intake by 150 kcal to resume safe fat loss."
                }
        elif goal == "lean_bulk":
            # If weight didn't increase by more than 0.1 kg or diff < 0.15 kg
            if w1 <= (w2 + 0.1) or diff < 0.15:
                adjustment_recommendation = {
                    "stalled": True,
                    "calorie_adjustment": 150,
                    "message": "Weight has plateaued over your last 2 check-ins. Recommended: increase daily intake by 150 kcal to stimulate lean muscle growth."
                }

    return {
        "logged": {
            "id": new_log.id,
            "user_id": new_log.user_id,
            "weight_kg": clean_weight,
            "logged_at": new_log.logged_date,
            "date": new_log.logged_date,
            "notes": new_log.notes
        },
        "adjustment": adjustment_recommendation
    }


@app.get("/api/weight-logs")
@app.get("/api/checkin")
def get_weight_logs(user_id: int = 1, sort: str = "asc", db: Session = Depends(get_db)):
    """Returns chronological weight log history filtered strictly by active user."""
    query = db.query(models.WeightLog).filter(models.WeightLog.user_id == user_id)
    if sort.lower() == "desc":
        logs = query.order_by(models.WeightLog.id.desc()).all()
    else:
        logs = query.order_by(models.WeightLog.id.asc()).all()

    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "weight_kg": round(float(l.weight_kg), 1),
            "logged_at": l.logged_date,
            "date": l.logged_date,
            "notes": l.notes
        }
        for l in logs
    ]


@app.delete("/api/checkin/{checkin_id}")
@app.delete("/api/weight-log/{checkin_id}")
def delete_weight_log(checkin_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """Deletes a check-in log entry by ID."""
    log = db.query(models.WeightLog).filter(
        models.WeightLog.id == checkin_id,
        models.WeightLog.user_id == user_id
    ).first()
    if not log:
        log = db.query(models.WeightLog).filter(models.WeightLog.id == checkin_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Check-in log not found")

    db.delete(log)
    db.commit()
    return {"status": "deleted", "id": checkin_id}



# --- LIVE MARKET PRICE & USER OVERRIDE ENDPOINTS ---

@app.get("/api/prices/status")
def get_prices_status(user_id: str = "default", db: Session = Depends(get_db)):
    """
    Returns live market price status, staleness indicator, and active effective prices.
    Strictly reports 'baseline_only' if API key is unconfigured.
    """
    return get_price_status_report(db, user_id=user_id)


@app.post("/api/prices/sync")
async def trigger_manual_sync(
    x_sync_secret: Optional[str] = Header(None, alias="X-Sync-Secret"),
    db: Session = Depends(get_db)
):
    """
    Triggers on-demand AGMARKNET daily price sync.
    Secured by optional SYNC_SECRET environment variable.
    """
    cfg = get_config()
    expected_secret = cfg.get("sync_secret")
    if expected_secret:
        if not x_sync_secret or x_sync_secret != expected_secret:
            raise HTTPException(status_code=401, detail="Invalid or missing X-Sync-Secret header")

    result = await sync_daily_prices(db)
    return result


@app.put("/api/prices/override/{food_id}")
def set_price_override(
    food_id: str,
    data: PriceOverrideInput,
    user_id: str = "default",
    db: Session = Depends(get_db)
):
    """
    Sets a user-specific local price override for a food item.
    Takes precedence over AGMARKNET daily prices and foods.json baseline.
    """
    if food_id not in FOOD_MAP:
        raise HTTPException(status_code=404, detail=f"Food item '{food_id}' not found in food catalog")

    override = db.query(models.UserPriceOverride).filter(
        models.UserPriceOverride.user_id == user_id,
        models.UserPriceOverride.food_id == food_id
    ).first()

    now_iso = datetime.now(timezone.utc).isoformat()

    if not override:
        override = models.UserPriceOverride(
            user_id=user_id,
            food_id=food_id,
            custom_price=round(data.custom_price, 2),
            updated_at=now_iso
        )
        db.add(override)
    else:
        override.custom_price = round(data.custom_price, 2)
        override.updated_at = now_iso

    db.commit()

    effective = get_effective_prices(db, user_id=user_id)
    return {
        "status": "success",
        "food_id": food_id,
        "custom_price": override.custom_price,
        "effective_price": effective[food_id]
    }


@app.delete("/api/prices/override/{food_id}")
def delete_price_override(
    food_id: str,
    user_id: str = "default",
    db: Session = Depends(get_db)
):
    """
    Removes user local override for food_id, resetting to live market price or catalog baseline.
    """
    if food_id not in FOOD_MAP:
        raise HTTPException(status_code=404, detail=f"Food item '{food_id}' not found in food catalog")

    override = db.query(models.UserPriceOverride).filter(
        models.UserPriceOverride.user_id == user_id,
        models.UserPriceOverride.food_id == food_id
    ).first()

    if override:
        db.delete(override)
        db.commit()

    effective = get_effective_prices(db, user_id=user_id)
    return {
        "status": "reset",
        "food_id": food_id,
        "effective_price": effective[food_id]
    }

