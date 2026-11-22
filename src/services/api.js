const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchFoods(category = null) {
  const url = category ? `${API_BASE}/foods?category=${category}` : `${API_BASE}/foods`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch foods');
  return res.json();
}

export async function fetchDishes(slot = null, dietType = null) {
  let url = `${API_BASE}/dishes`;
  const params = new URLSearchParams();
  if (slot) params.append('slot', slot);
  if (dietType) params.append('diet_type', dietType);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dishes');
  return res.json();
}

export async function fetchExercises(environment = null) {
  const url = environment ? `${API_BASE}/exercises?environment=${environment}` : `${API_BASE}/exercises`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch exercises');
  return res.json();
}

export async function predictBodyComp(payload) {
  const res = await fetch(`${API_BASE}/predict/body-comp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to run body comp prediction');
  return res.json();
}

export async function fetchProfile() {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function saveProfile(profile) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

export async function fetchPantry() {
  const res = await fetch(`${API_BASE}/pantry`);
  if (!res.ok) throw new Error('Failed to fetch pantry');
  return res.json();
}

export async function savePantry(items) {
  // items is an array of { food_id, quantity, unit }
  const res = await fetch(`${API_BASE}/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  if (!res.ok) throw new Error('Failed to save pantry items');
  return res.json();
}

export async function loadStudentPreset() {
  const res = await fetch(`${API_BASE}/pantry/preset-student`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to load student preset');
  return res.json();
}

export async function generateFullPlan(payload) {
  const res = await fetch(`${API_BASE}/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate plan');
  return res.json();
}

export async function upgradeBudget(payload) {
  const res = await fetch(`${API_BASE}/plan/upgrade-budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to upgrade budget plan');
  return res.json();
}

export async function swapDish(payload) {
  const res = await fetch(`${API_BASE}/plan/swap-dish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to swap dish');
  return res.json();
}

export async function logWeight(payload) {
  const res = await fetch(`${API_BASE}/weight-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to record weight log');
  return res.json();
}

export async function fetchWeightLogs() {
  const res = await fetch(`${API_BASE}/weight-logs`);
  if (!res.ok) throw new Error('Failed to fetch weight logs');
  return res.json();
}

export async function deleteWeightLog(id) {
  const res = await fetch(`${API_BASE}/checkin/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete check-in log');
  return res.json();
}


export async function fetchPriceStatus(userId = 'default') {
  const res = await fetch(`${API_BASE}/prices/status?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch market price status');
  return res.json();
}

export async function triggerPriceSync(syncSecret = '') {
  const headers = {};
  if (syncSecret) headers['X-Sync-Secret'] = syncSecret;
  const res = await fetch(`${API_BASE}/prices/sync`, {
    method: 'POST',
    headers
  });
  if (!res.ok) throw new Error('Failed to trigger daily price sync');
  return res.json();
}

export async function setPriceOverride(foodId, customPrice, userId = 'default') {
  const res = await fetch(`${API_BASE}/prices/override/${foodId}?user_id=${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ custom_price: parseFloat(customPrice) })
  });
  if (!res.ok) throw new Error('Failed to set price override');
  return res.json();
}

export async function deletePriceOverride(foodId, userId = 'default') {
  const res = await fetch(`${API_BASE}/prices/override/${foodId}?user_id=${userId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to reset price override');
  return res.json();
}

