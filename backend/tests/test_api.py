import pytest
import os
import sys
from fastapi.testclient import TestClient

from database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Isolated In-Memory SQLite Engine for API Tests
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def isolated_test_db():
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


def test_static_catalog_endpoints():
    r_foods = client.get("/api/foods")
    assert r_foods.status_code == 200
    foods = r_foods.json()
    assert len(foods) >= 45

    r_dishes = client.get("/api/dishes")
    assert r_dishes.status_code == 200
    dishes = r_dishes.json()
    assert len(dishes) >= 35

    r_exercises = client.get("/api/exercises")
    assert r_exercises.status_code == 200
    exercises = r_exercises.json()
    assert len(exercises) >= 45

    # Filter gym vs home
    r_home = client.get("/api/exercises?environment=without_gym")
    assert r_home.status_code == 200
    assert len(r_home.json()) >= 20
    for ex in r_home.json():
        assert ex["environment"] == "without_gym"
        assert ex["tutorial_url"].startswith("https://www.youtube.com/")

def test_body_comp_ml_endpoint():
    payload = {
        "age": 24,
        "sex": "male",
        "height_cm": 178.0,
        "weight_kg": 74.0,
        "waist_cm": 81.0,
        "hip_cm": 90.0,
        "arm_cm": 35.0
    }
    r = client.post("/api/predict/body-comp", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "body_fat_pct" in data
    assert "lean_body_mass_kg" in data
    assert "skeletal_muscle_mass_kg" in data
    assert "confidence_band_mae" in data
    assert data["body_fat_pct"] > 5.0

def test_pantry_preset_and_persistence():
    r_preset = client.post("/api/pantry/preset-student")
    assert r_preset.status_code == 200
    assert r_preset.json()["status"] == "success"

    r_get = client.get("/api/pantry")
    assert r_get.status_code == 200
    pantry = r_get.json()["pantry"]
    assert "rice_white" in pantry
    assert "moong_dal" in pantry
    assert pantry["rice_white"] == 1000.0

def test_plan_generate_and_budget_upgrade():
    plan_payload = {
        "profile": {
            "age": 23,
            "sex": "male",
            "height_cm": 175.0,
            "weight_kg": 70.0,
            "activity_level": "moderate",
            "goal": "lean_bulk",
            "target_weight_kg": 74.0,
            "diet_type": "veg",
            "body_comp_mode": "quick",
            "workout_environment": "without_gym",
            "experience_level": "beginner",
            "days_per_week": 4,
            "extra_budget_inr": 0.0
        },
        "pantry": {
            "rice_white": 500.0,
            "onion": 200.0,
            "tomato": 200.0,
            "milk": 500.0
        },
        "extra_budget_inr": 0.0
    }
    r_plan = client.post("/api/plan/generate", json=plan_payload)
    assert r_plan.status_code == 200
    data = r_plan.json()

    assert "biometrics" in data
    assert "sufficiency" in data
    assert "minimum_gap" in data
    assert "meal_plan" in data
    assert "workout_plan" in data

    # Since pantry only has 4 items, sufficiency should be False and min gap > 0
    assert data["sufficiency"]["is_sufficient"] is False
    assert data["minimum_gap"]["min_gap_cost_inr"] > 0
    assert len(data["meal_plan"]) == 7
    assert len(data["workout_plan"]["schedule"]) == 4

    # Test extra budget upgrade endpoint
    upgrade_payload = {
        "profile": plan_payload["profile"],
        "pantry": plan_payload["pantry"],
        "extra_budget_inr": 350.0
    }
    r_up = client.post("/api/plan/upgrade-budget", json=upgrade_payload)
    assert r_up.status_code == 200
    up_data = r_up.json()
    assert up_data["extra_budget"]["spent_extra_inr"] <= 350.0
    assert len(up_data["meal_plan"]) == 7

def test_weight_log_and_stall_detector():
    # Log 1
    r1 = client.post("/api/weight-log", json={"weight_kg": 72.0, "notes": "Week 1"})
    assert r1.status_code == 200

    # Log 2 (stalled weight)
    r2 = client.post("/api/weight-log", json={"weight_kg": 72.05, "notes": "Week 2"})
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["adjustment"] is not None
    assert res2["adjustment"]["stalled"] is True
    assert "calorie_adjustment" in res2["adjustment"]
