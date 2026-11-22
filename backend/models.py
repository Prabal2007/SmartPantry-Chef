from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, PrimaryKeyConstraint
from datetime import datetime, timezone
from database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer, default=24)
    sex = Column(String, default="male") # "male", "female"
    height_cm = Column(Float, default=175.0)
    weight_kg = Column(Float, default=72.0)
    activity_level = Column(String, default="moderate") # "sedentary", "light", "moderate", "active"
    goal = Column(String, default="lean_bulk") # "cut", "lean_bulk", "recomp"
    target_weight_kg = Column(Float, default=76.0)
    diet_type = Column(String, default="veg") # "veg", "eggetarian", "non_veg"
    body_comp_mode = Column(String, default="quick") # "quick", "smart_ml", "scan"
    body_fat_pct = Column(Float, nullable=True)
    skeletal_muscle_pct = Column(Float, nullable=True)
    workout_environment = Column(String, default="without_gym") # "with_gym", "without_gym"
    experience_level = Column(String, default="beginner") # "beginner", "intermediate"
    days_per_week = Column(Integer, default=4)
    extra_budget_inr = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class PantryItem(Base):
    __tablename__ = "pantry_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, index=True)
    food_id = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="g")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class WeightLog(Base):
    __tablename__ = "weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, index=True)
    logged_date = Column(String, default=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    weight_kg = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class LivePrice(Base):
    __tablename__ = "live_prices"

    food_id = Column(String, primary_key=True, index=True)
    price_per_unit = Column(Float, nullable=False)
    raw_modal_quintal = Column(Float, nullable=True)
    source = Column(String, default="agmarknet_daily")
    state = Column(String, nullable=True)
    updated_at = Column(String, nullable=False) # ISO-8601 UTC string

class UserPriceOverride(Base):
    __tablename__ = "user_price_overrides"

    user_id = Column(String, default="default")
    food_id = Column(String, nullable=False)
    custom_price = Column(Float, nullable=False)
    updated_at = Column(String, nullable=False) # ISO-8601 UTC string

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "food_id"),
    )

class PriceSyncLog(Base):
    __tablename__ = "price_sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    status = Column(String, nullable=False) # "ok" | "partial" | "skipped" | "failed"
    state = Column(String, nullable=True)
    updated_count = Column(Integer, default=0)
    skipped_items_json = Column(Text, default="[]")
    error_message = Column(Text, nullable=True)
    synced_at = Column(String, nullable=False) # ISO-8601 UTC string
