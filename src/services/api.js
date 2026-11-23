import defaultFoods from '../data/defaultFoods.json';
import defaultDishes from '../data/defaultDishes.json';
import defaultExercises from '../data/defaultExercises.json';
import {
  generateDeterministicPlanLocally,
  swapDishLocally,
  upgradeBudgetVariety,
  generate7DayMealPlan,
  calculateBiometrics
} from './localEngine';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function isJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json');
}

export async function fetchFoods(category = null) {
  try {
    const url = category ? `${API_BASE}/foods?category=${category}` : `${API_BASE}/foods`;
    const res = await fetch(url);
    if (!res.ok || !isJsonResponse(res)) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return defaultFoods;
  } catch (err) {
    console.warn('Backend unavailable, using bundled foods catalog:', err.message);
    if (category) {
      return defaultFoods.filter(f => f.category === category);
    }
    return defaultFoods;
  }
}

export async function fetchDishes(slot = null, dietType = null) {
  try {
    let url = `${API_BASE}/dishes`;
    const params = new URLSearchParams();
    if (slot) params.append('slot', slot);
    if (dietType) params.append('diet_type', dietType);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Backend unavailable');
    return await res.json();
  } catch (err) {
    let filtered = defaultDishes;
    if (slot) filtered = filtered.filter(d => d.slot === slot);
    if (dietType) filtered = filtered.filter(d => d.diet_type === dietType);
    return filtered;
  }
}

export async function fetchExercises(environment = null) {
  try {
    const url = environment ? `${API_BASE}/exercises?environment=${environment}` : `${API_BASE}/exercises`;
    const res = await fetch(url);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Backend unavailable');
    return await res.json();
  } catch (err) {
    if (environment) {
      return defaultExercises.filter(ex => ex.environment === environment);
    }
    return defaultExercises;
  }
}

export async function predictBodyComp(payload) {
  try {
    const res = await fetch(`${API_BASE}/predict/body-comp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Backend prediction unavailable');
    return await res.json();
  } catch (err) {
    // Deterministic U.S. Navy formula fallback
    const { sex, height_cm, waist_cm, neck_cm, hip_cm, weight_kg } = payload;
    let bf = 15.0;
    if (sex === 'male') {
      const denom = (1.0324 - (0.19077 * Math.log10(Math.max(1, waist_cm - neck_cm)))) + (0.15456 * Math.log10(height_cm));
      bf = Math.round(((495.0 / denom) - 450.0) * 10) / 10;
    } else {
      const denom = (1.29579 - (0.35004 * Math.log10(Math.max(1, waist_cm + (hip_cm || 95.0) - neck_cm)))) + (0.22100 * Math.log10(height_cm));
      bf = Math.round(((495.0 / denom) - 450.0) * 10) / 10;
    }
    bf = Math.max(5.0, Math.min(50.0, bf));
    const lbm = Math.round(weight_kg * (1.0 - (bf / 100.0)) * 10) / 10;
    const smmPct = Math.round((lbm * 0.54 / weight_kg) * 1000) / 10;
    return {
      body_fat_pct: bf,
      skeletal_muscle_pct: smmPct,
      lean_mass_kg: lbm,
      source: 'navy_formula_client_fallback'
    };
  }
}

export async function fetchProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Failed to fetch user profile');
    return await res.json();
  } catch (err) {
    const saved = localStorage.getItem('nutriforge_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  }
}

export async function saveProfile(profile) {
  try {
    localStorage.setItem('nutriforge_profile', JSON.stringify(profile));
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Cloud save deferred');
    return await res.json();
  } catch (err) {
    return { status: 'saved_locally', profile };
  }
}

export async function fetchPantry() {
  try {
    const res = await fetch(`${API_BASE}/pantry`);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Failed to fetch pantry');
    return await res.json();
  } catch (err) {
    const saved = localStorage.getItem('nutriforge_pantry');
    if (saved) {
      try { return { status: 'success', pantry: JSON.parse(saved) }; } catch (e) {}
    }
    return null;
  }
}

export async function savePantry(items) {
  try {
    const pantryMap = {};
    (items || []).forEach(it => {
      pantryMap[it.food_id] = it.quantity;
    });
    localStorage.setItem('nutriforge_pantry', JSON.stringify(pantryMap));

    const res = await fetch(`${API_BASE}/pantry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Cloud save deferred');
    return await res.json();
  } catch (err) {
    return { status: 'saved_locally' };
  }
}

export async function loadStudentPreset() {
  const studentItems = {
    rice_white: 1000.0,
    wheat_atta: 1000.0,
    moong_dal: 500.0,
    onion: 500.0,
    tomato: 500.0,
    potato: 500.0,
    milk: 1000.0,
    curd: 400.0,
    mustard_oil: 250.0,
    spices_basic: 100.0
  };

  try {
    const res = await fetch(`${API_BASE}/pantry/preset-student`, { method: 'POST' });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Backend preset unavailable');
    return await res.json();
  } catch (err) {
    localStorage.setItem('nutriforge_pantry', JSON.stringify(studentItems));
    return { status: 'success', pantry: studentItems };
  }
}

export async function generateFullPlan(payload) {
  try {
    const res = await fetch(`${API_BASE}/plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok || !isJsonResponse(res)) {
      throw new Error(`Backend returned status ${res.status}`);
    }
    const data = await res.json();
    if (data && data.meal_plan) return data;
    throw new Error('Malformed backend plan');
  } catch (err) {
    console.info('FastAPI backend unreachable or cold-starting. Executing deterministic client engine fallback.');
    return generateDeterministicPlanLocally(payload);
  }
}

export async function upgradeBudget(payload) {
  try {
    const res = await fetch(`${API_BASE}/plan/upgrade-budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok || !isJsonResponse(res)) {
      throw new Error(`Backend returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    const { profile, pantry, extra_budget_inr } = payload;
    const biometrics = calculateBiometrics(profile);
    const extraBudget = upgradeBudgetVariety(
      Object.keys(pantry || {}),
      {},
      extra_budget_inr,
      profile.diet_type
    );
    const availableFoodIds = new Set([
      ...Object.keys(pantry || {}),
      ...Object.keys(extraBudget.extra_cart || {})
    ]);
    const mealPlan = generate7DayMealPlan(
      availableFoodIds,
      profile.diet_type,
      biometrics.target_calories,
      biometrics.protein_target_g
    );
    return {
      extra_budget: extraBudget,
      meal_plan: mealPlan
    };
  }
}

export async function swapDish(payload) {
  try {
    const res = await fetch(`${API_BASE}/plan/swap-dish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Backend swap unavailable');
    return await res.json();
  } catch (err) {
    return swapDishLocally(payload);
  }
}

export async function logWeight(payload) {
  try {
    const res = await fetch(`${API_BASE}/weight-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Cloud log deferred');
    return await res.json();
  } catch (err) {
    const logs = JSON.parse(localStorage.getItem('nutriforge_weight_logs') || '[]');
    const newLog = {
      id: Date.now(),
      weight_kg: payload.weight_kg,
      notes: payload.notes || '',
      logged_at: new Date().toISOString()
    };
    logs.push(newLog);
    localStorage.setItem('nutriforge_weight_logs', JSON.stringify(logs));
    return { status: 'success', log: newLog, adjustment: null };
  }
}

export async function fetchWeightLogs() {
  try {
    const res = await fetch(`${API_BASE}/weight-logs`);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Cloud logs unavailable');
    return await res.json();
  } catch (err) {
    const saved = localStorage.getItem('nutriforge_weight_logs');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function deleteWeightLog(id) {
  try {
    const res = await fetch(`${API_BASE}/checkin/${id}`, { method: 'DELETE' });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Cloud delete deferred');
    return await res.json();
  } catch (err) {
    let logs = JSON.parse(localStorage.getItem('nutriforge_weight_logs') || '[]');
    logs = logs.filter(l => l.id !== id);
    localStorage.setItem('nutriforge_weight_logs', JSON.stringify(logs));
    return { status: 'success' };
  }
}

export async function fetchPriceStatus(userId = 'default') {
  try {
    const res = await fetch(`${API_BASE}/prices/status?user_id=${userId}`);
    if (!res.ok || !isJsonResponse(res)) throw new Error('Market price sync unavailable');
    return await res.json();
  } catch (err) {
    return {
      status: 'baseline_active',
      last_sync: new Date().toISOString(),
      volatile_count: 5,
      cached_count: 5,
      user_overrides_count: 0
    };
  }
}

export async function triggerPriceSync(syncSecret = '') {
  try {
    const headers = {};
    if (syncSecret) headers['X-Sync-Secret'] = syncSecret;
    const res = await fetch(`${API_BASE}/prices/sync`, { method: 'POST', headers });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Sync failed');
    return await res.json();
  } catch (err) {
    return { status: 'skipped', message: 'Backend price service is offline' };
  }
}

export async function setPriceOverride(foodId, customPrice, userId = 'default') {
  try {
    const res = await fetch(`${API_BASE}/prices/override/${foodId}?user_id=${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_price: parseFloat(customPrice) })
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Price override deferred');
    return await res.json();
  } catch (err) {
    return { status: 'success', food_id: foodId, price: customPrice };
  }
}

export async function deletePriceOverride(foodId, userId = 'default') {
  try {
    const res = await fetch(`${API_BASE}/prices/override/${foodId}?user_id=${userId}`, {
      method: 'DELETE'
    });
    if (!res.ok || !isJsonResponse(res)) throw new Error('Reset deferred');
    return await res.json();
  } catch (err) {
    return { status: 'success' };
  }
}
