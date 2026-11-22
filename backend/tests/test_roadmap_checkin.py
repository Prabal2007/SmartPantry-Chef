import pytest
import os
import sys
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
import models
from main import app
from engine import calculate_biometrics

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
# 1. CURVE MATH TESTS
# ==============================================================================

def test_weight_projection_cut_monotonic_and_zero_overshoot():
    """
    Cut test (80 kg -> 74 kg):
    - Week 0 is exactly 80.0 kg starting at start_date.
    - Every week strictly decreases monotonically.
    - Timestamps increment by exactly 7 days.
    - Final week lands cleanly on 74.0 kg with zero overshoot.
    """
    start_date = "2026-11-01"
    bio = calculate_biometrics(
        age=26,
        sex="male",
        height_cm=178.0,
        weight_kg=80.0,
        activity_level="moderate",
        goal="cut",
        target_weight_kg=74.0,
        start_date=start_date
    )

    proj = bio["weight_projection"]
    assert len(proj) >= 2, "Projection should contain multiple weekly points"

    # Week 0 assertions
    assert proj[0]["week"] == 0
    assert proj[0]["date"] == "2026-11-01"
    assert proj[0]["projected_weight_kg"] == 80.0
    assert proj[0]["weight_kg"] == 80.0

    # Intermediate and final week assertions
    for i in range(1, len(proj)):
        prev_p = proj[i - 1]
        curr_p = proj[i]

        # Monotonically strictly decreasing
        assert curr_p["projected_weight_kg"] < prev_p["projected_weight_kg"], (
            f"Week {curr_p['week']} ({curr_p['projected_weight_kg']}) must be strictly less than "
            f"Week {prev_p['week']} ({prev_p['projected_weight_kg']})"
        )

        # Timestamps increment by exactly 7 days
        d_prev = datetime.fromisoformat(prev_p["date"])
        d_curr = datetime.fromisoformat(curr_p["date"])
        assert (d_curr - d_prev).days == 7

        # Never overshoot below target
        assert curr_p["projected_weight_kg"] >= 74.0, (
            f"Week {curr_p['week']} overshot target weight 74.0 kg: got {curr_p['projected_weight_kg']}"
        )

    # Final point lands exactly on target_weight
    final_point = proj[-1]
    assert final_point["projected_weight_kg"] == 74.0
    assert bio["estimated_weeks"] == final_point["week"]


def test_weight_projection_bulk_monotonic_and_zero_overshoot():
    """
    Bulk test (65 kg -> 70 kg):
    - Week 0 is exactly 65.0 kg starting at start_date.
    - Every week strictly increases monotonically.
    - Final week lands cleanly on 70.0 kg.
    """
    start_date = "2026-11-01"
    bio = calculate_biometrics(
        age=22,
        sex="male",
        height_cm=172.0,
        weight_kg=65.0,
        activity_level="moderate",
        goal="lean_bulk",
        target_weight_kg=70.0,
        start_date=start_date
    )

    proj = bio["weight_projection"]
    assert len(proj) >= 2

    # Week 0 assertions
    assert proj[0]["week"] == 0
    assert proj[0]["date"] == "2026-11-01"
    assert proj[0]["projected_weight_kg"] == 65.0

    # Monotonically strictly increasing
    for i in range(1, len(proj)):
        prev_p = proj[i - 1]
        curr_p = proj[i]
        assert curr_p["projected_weight_kg"] > prev_p["projected_weight_kg"]
        assert curr_p["projected_weight_kg"] <= 70.0

    # Final point lands exactly on target_weight
    assert proj[-1]["projected_weight_kg"] == 70.0


def test_weight_projection_recomp_flat_twelve_weeks_no_zero_division():
    """
    Recomp test (75 kg -> 75 kg):
    - Flat curve at 75.0 kg over a clean 12-week horizon.
    - Zero divide-by-zero crashes.
    """
    bio = calculate_biometrics(
        age=25,
        sex="male",
        height_cm=175.0,
        weight_kg=75.0,
        activity_level="moderate",
        goal="recomp",
        target_weight_kg=75.0
    )

    proj = bio["weight_projection"]
    assert len(proj) == 13 # Week 0 to Week 12
    assert bio["estimated_weeks"] == 12

    for p in proj:
        assert p["projected_weight_kg"] == 75.0
        assert p["weight_kg"] == 75.0


# ==============================================================================
# 2. CHECK-IN ROUND-TRIP & FIDELITY TESTS
# ==============================================================================

def test_checkin_lifecycle_and_exact_fidelity():
    """
    Check-In Lifecycle:
    - Fresh user starts with [] (0 check-ins, zero seeded/random rows).
    - Submit check-in weight_kg = 73.7 -> assert response AND subsequent GET return exact 73.7.
    - Submit second check-in weight_kg = 73.2 -> assert both entries persist in exact order.
    - Delete first check-in -> assert only 73.2 remains.
    """
    user_id = 1

    # 1. Fresh user starts with empty list
    r_init = client.get(f"/api/checkin?user_id={user_id}")
    assert r_init.status_code == 200
    assert r_init.json() == []

    # 2. Submit check-in 73.7 kg
    r_post1 = client.post("/api/checkin", json={
        "weight_kg": 73.7,
        "notes": "Morning fast, week 1",
        "date": "2026-11-15",
        "user_id": user_id
    })
    assert r_post1.status_code == 200
    res1 = r_post1.json()
    assert res1["logged"]["weight_kg"] == 73.7
    assert res1["logged"]["logged_at"] == "2026-11-15"
    id1 = res1["logged"]["id"]

    # Verify GET returns exact 73.7
    r_get1 = client.get(f"/api/checkin?user_id={user_id}")
    assert r_get1.status_code == 200
    data1 = r_get1.json()
    assert len(data1) == 1
    assert data1[0]["weight_kg"] == 73.7
    assert data1[0]["id"] == id1

    # 3. Submit second check-in 73.2 kg
    r_post2 = client.post("/api/checkin", json={
        "weight_kg": 73.2,
        "notes": "Morning fast, week 2",
        "date": "2026-11-22",
        "user_id": user_id
    })
    assert r_post2.status_code == 200
    res2 = r_post2.json()
    assert res2["logged"]["weight_kg"] == 73.2
    id2 = res2["logged"]["id"]

    # Verify both entries persist in chronological order
    r_get2 = client.get(f"/api/checkin?user_id={user_id}&sort=asc")
    assert r_get2.status_code == 200
    data2 = r_get2.json()
    assert len(data2) == 2
    assert data2[0]["id"] == id1
    assert data2[0]["weight_kg"] == 73.7
    assert data2[1]["id"] == id2
    assert data2[1]["weight_kg"] == 73.2

    # 4. Delete first check-in
    r_del = client.delete(f"/api/checkin/{id1}?user_id={user_id}")
    assert r_del.status_code == 200
    assert r_del.json()["status"] == "deleted"

    # Verify only second check-in remains
    r_get3 = client.get(f"/api/checkin?user_id={user_id}")
    assert r_get3.status_code == 200
    data3 = r_get3.json()
    assert len(data3) == 1
    assert data3[0]["id"] == id2
    assert data3[0]["weight_kg"] == 73.2


def test_calorie_stall_adjustment_trigger():
    """
    Stall adjustment triggers only on real consecutive check-ins showing no progress.
    """
    user_id = 99
    # Profile cut
    # Check-in 1: 75.0
    client.post("/api/checkin", json={"weight_kg": 75.0, "user_id": user_id})
    # Check-in 2: 75.05 (plateaued / did not drop)
    r2 = client.post("/api/checkin", json={"weight_kg": 75.05, "user_id": user_id})
    res2 = r2.json()
    assert res2["adjustment"] is not None
    assert res2["adjustment"]["stalled"] is True
    assert res2["adjustment"]["calorie_adjustment"] == -150
