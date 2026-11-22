import os
import json
import statistics
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session

from database import SessionLocal
from models import LivePrice, UserPriceOverride, PriceSyncLog
from engine import FOOD_MAP, FOODS_LIST

logger = logging.getLogger("price_sync")

# AGMARKNET API URL
AGMARKNET_API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Configuration from Environment Variables
def get_config():
    return {
        "api_key": os.getenv("DATA_GOV_IN_KEY", "").strip(),
        "state": os.getenv("PRICE_STATE", "Uttar Pradesh").strip(),
        "markup": float(os.getenv("RETAIL_MARKUP", "1.30")),
        "sync_secret": os.getenv("SYNC_SECRET", "").strip()
    }

# Mapping of volatile fresh produce food_ids from foods.json to AGMARKNET commodities
# Explicit grams_per_unit required for unit == "piece" items (e.g. banana: 120g)
COMMODITY_MAPPING: Dict[str, Dict[str, Any]] = {
    "onion": {"commodity": "Onion", "grams_per_unit": None},
    "tomato": {"commodity": "Tomato", "grams_per_unit": None},
    "potato": {"commodity": "Potato", "grams_per_unit": None},
    "spinach": {"commodity": "Spinach", "grams_per_unit": None},
    "carrot": {"commodity": "Carrot", "grams_per_unit": None},
    "cauliflower": {"commodity": "Cauliflower", "grams_per_unit": None},
    "bhindi": {"commodity": "Bhindi(Ladies Finger)", "grams_per_unit": None},
    "capsicum": {"commodity": "Capsicum", "grams_per_unit": None},
    "cucumber": {"commodity": "Cucumbar(Kheera)", "grams_per_unit": None},
    "lauki": {"commodity": "Bottle gourd", "grams_per_unit": None},
    "green_peas": {"commodity": "Peas Wet", "grams_per_unit": None},
    "banana": {"commodity": "Banana", "grams_per_unit": 120.0},
    "apple": {"commodity": "Apple", "grams_per_unit": 150.0},
    "papaya": {"commodity": "Papaya", "grams_per_unit": None},
    "guava": {"commodity": "Guava", "grams_per_unit": 150.0},
    "orange": {"commodity": "Orange", "grams_per_unit": 140.0},
    "pomegranate": {"commodity": "Pomegranate", "grams_per_unit": 200.0},
}


def get_effective_prices(db: Session, user_id: str = "default") -> Dict[str, Dict[str, Any]]:
    """
    3-Tier Price Precedence Engine (Strictly Enforced):
    1. User local overrides (user_price_overrides)
    2. Daily synced live prices (live_prices)
    3. Baseline food catalog prices (foods.json)

    Returns { food_id: { "price": float, "source": str, "unit": str } }
    """
    # 1. Fetch user overrides
    user_overrides = {
        row.food_id: row.custom_price
        for row in db.query(UserPriceOverride).filter(UserPriceOverride.user_id == user_id).all()
        if row.custom_price > 0
    }

    # 2. Fetch cached live prices
    live_prices = {
        row.food_id: row.price_per_unit
        for row in db.query(LivePrice).all()
        if row.price_per_unit > 0
    }

    effective = {}
    for f in FOODS_LIST:
        fid = f["id"]
        unit = f["unit"]
        baseline_price = f["price_per_100g_or_unit_inr"]

        if fid in user_overrides:
            effective[fid] = {
                "price": round(float(user_overrides[fid]), 2),
                "source": "custom",
                "unit": unit
            }
        elif fid in live_prices:
            effective[fid] = {
                "price": round(float(live_prices[fid]), 2),
                "source": "agmarknet_daily",
                "unit": unit
            }
        else:
            effective[fid] = {
                "price": round(float(baseline_price), 2),
                "source": "baseline",
                "unit": unit
            }

    return effective


async def sync_daily_prices(db: Session, client: Optional[httpx.AsyncClient] = None) -> Dict[str, Any]:
    """
    Fetches wholesale modal prices from Government of India AGMARKNET API,
    applies median aggregation, strict wholesale-to-retail conversion,
    and a ±50% sanity clamp against foods.json baseline.
    Never crashes on timeouts or network errors; logs all runs to price_sync_logs.
    """
    cfg = get_config()
    api_key = cfg["api_key"]
    state = cfg["state"]
    markup = cfg["markup"]
    now_iso = datetime.now(timezone.utc).isoformat()

    # Rule 4: Zero Fake "Synced Today" Lies
    if not api_key:
        log_entry = PriceSyncLog(
            status="skipped",
            state=state,
            updated_count=0,
            skipped_items_json=json.dumps(["DATA_GOV_IN_KEY not configured"]),
            error_message="DATA_GOV_IN_KEY environment variable is not set. Operating in baseline mode.",
            synced_at=now_iso
        )
        db.add(log_entry)
        db.commit()
        return {
            "status": "skipped",
            "state": state,
            "updated_count": 0,
            "message": "DATA_GOV_IN_KEY is not configured. Running in baseline mode.",
            "synced_at": now_iso
        }

    updated_count = 0
    skipped_items: List[Dict[str, Any]] = []
    close_client = False

    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        close_client = True

    try:
        for food_id, meta in COMMODITY_MAPPING.items():
            if food_id not in FOOD_MAP:
                continue

            food = FOOD_MAP[food_id]
            commodity = meta["commodity"]
            grams_per_unit = meta["grams_per_unit"]
            baseline = food["price_per_100g_or_unit_inr"]

            params = {
                "api-key": api_key,
                "format": "json",
                "filters[state]": state,
                "filters[commodity]": commodity,
                "limit": 50
            }

            try:
                resp = await client.get(AGMARKNET_API_URL, params=params)
                if resp.status_code != 200:
                    skipped_items.append({
                        "food_id": food_id,
                        "reason": f"HTTP {resp.status_code} error from AGMARKNET API"
                    })
                    continue

                data = resp.json()
                records = data.get("records", [])
                if not records:
                    skipped_items.append({
                        "food_id": food_id,
                        "reason": f"No market records found for commodity '{commodity}' in '{state}'"
                    })
                    continue

                # Filter valid positive numbers
                valid_modal_prices = []
                for rec in records:
                    raw_val = rec.get("modal_price")
                    if raw_val is not None:
                        try:
                            val = float(raw_val)
                            if val > 0:
                                valid_modal_prices.append(val)
                        except (ValueError, TypeError):
                            continue

                if not valid_modal_prices:
                    skipped_items.append({
                        "food_id": food_id,
                        "reason": f"No valid positive modal price found in records for '{commodity}'"
                    })
                    continue

                # Rule 3: Outlier Sanity Guard using median
                median_quintal = statistics.median(valid_modal_prices)

                # Rule 2: Strict Unit Conversion Safety
                # Quintal = 100 kg = 1,000 * 100g = 100,000 g
                if food["unit"] == "piece":
                    grams = grams_per_unit or 120.0
                    calculated_price = round((median_quintal / 100000.0) * grams * markup, 2)
                else: # 'g' or 'ml'
                    calculated_price = round((median_quintal / 1000.0) * markup, 2)

                # Rule 3: Reject any retail price deviating > ±50% from foods.json baseline
                lower_bound = round(0.50 * baseline, 2)
                upper_bound = round(1.50 * baseline, 2)

                if calculated_price < lower_bound or calculated_price > upper_bound:
                    skipped_items.append({
                        "food_id": food_id,
                        "reason": f"Price ₹{calculated_price} rejected: outside ±50% sanity bounds (₹{lower_bound} - ₹{upper_bound})"
                    })
                    continue

                # Update or Insert into live_prices
                existing = db.query(LivePrice).filter(LivePrice.food_id == food_id).first()
                if not existing:
                    existing = LivePrice(
                        food_id=food_id,
                        price_per_unit=calculated_price,
                        raw_modal_quintal=median_quintal,
                        source="agmarknet_daily",
                        state=state,
                        updated_at=now_iso
                    )
                    db.add(existing)
                else:
                    existing.price_per_unit = calculated_price
                    existing.raw_modal_quintal = median_quintal
                    existing.source = "agmarknet_daily"
                    existing.state = state
                    existing.updated_at = now_iso

                updated_count += 1

            except (httpx.TimeoutException, httpx.RequestError) as ex:
                skipped_items.append({
                    "food_id": food_id,
                    "reason": f"Network exception: {type(ex).__name__}"
                })
                continue
            except Exception as ex:
                skipped_items.append({
                    "food_id": food_id,
                    "reason": f"Unexpected error: {str(ex)}"
                })
                continue

    finally:
        if close_client:
            await client.aclose()

    # Determine overall status
    if updated_count == len(COMMODITY_MAPPING):
        status = "ok"
    elif updated_count > 0:
        status = "partial"
    else:
        status = "failed"

    log_entry = PriceSyncLog(
        status=status,
        state=state,
        updated_count=updated_count,
        skipped_items_json=json.dumps(skipped_items),
        error_message=f"{len(skipped_items)} items skipped" if skipped_items else None,
        synced_at=now_iso
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": status,
        "state": state,
        "updated_count": updated_count,
        "total_mapped": len(COMMODITY_MAPPING),
        "skipped_items": skipped_items,
        "synced_at": now_iso
    }


def get_price_status_report(db: Session, user_id: str = "default") -> Dict[str, Any]:
    """
    Returns honest sync status without fake 'synced today' timestamps.
    """
    cfg = get_config()
    api_key = cfg["api_key"]
    state = cfg["state"]

    live_count = db.query(LivePrice).count()
    overrides_count = db.query(UserPriceOverride).filter(UserPriceOverride.user_id == user_id).count()
    last_log = db.query(PriceSyncLog).order_by(PriceSyncLog.id.desc()).first()

    mode = "baseline_only"
    last_synced_at = None

    if last_log and last_log.status in ["ok", "partial"] and live_count > 0:
        try:
            synced_dt = datetime.fromisoformat(last_log.synced_at)
            now_dt = datetime.now(timezone.utc)
            # Normalize naive datetimes if needed
            if synced_dt.tzinfo is None:
                synced_dt = synced_dt.replace(tzinfo=timezone.utc)
            age_hours = (now_dt - synced_dt).total_seconds() / 3600.0

            if age_hours <= 24.0:
                mode = "live_synced"
            else:
                mode = "stale"
            last_synced_at = last_log.synced_at
        except Exception:
            mode = "stale" if live_count > 0 else "baseline_only"
    elif not api_key:
        mode = "baseline_only"

    effective_map = get_effective_prices(db, user_id=user_id)

    return {
        "mode": mode,
        "state": state,
        "api_key_configured": bool(api_key),
        "last_synced_at": last_synced_at,
        "last_sync_status": last_log.status if last_log else None,
        "live_item_count": live_count,
        "total_food_count": len(FOODS_LIST),
        "overrides_count": overrides_count,
        "effective_prices": effective_map
    }


async def sync_if_stale(max_age_hours: int = 24):
    """
    Non-blocking background check on server boot.
    If no sync exists or older than max_age_hours, runs sync_daily_prices.
    """
    cfg = get_config()
    if not cfg["api_key"]:
        logger.info("DATA_GOV_IN_KEY not configured. Skipping background sync_if_stale.")
        return

    db = SessionLocal()
    try:
        last_log = db.query(PriceSyncLog).filter(PriceSyncLog.status.in_(["ok", "partial"])).order_by(PriceSyncLog.id.desc()).first()
        needs_sync = False

        if not last_log:
            needs_sync = True
        else:
            try:
                synced_dt = datetime.fromisoformat(last_log.synced_at)
                if synced_dt.tzinfo is None:
                    synced_dt = synced_dt.replace(tzinfo=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - synced_dt).total_seconds() / 3600.0
                if age_hours >= max_age_hours:
                    needs_sync = True
            except Exception:
                needs_sync = True

        if needs_sync:
            logger.info("Triggering non-blocking background AGMARKNET price sync (stale cache detected)...")
            await sync_daily_prices(db)
    except Exception as e:
        logger.warning(f"Background sync_if_stale encountered error: {e}")
    finally:
        db.close()
