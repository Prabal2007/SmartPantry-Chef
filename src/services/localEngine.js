import defaultFoods from '../data/defaultFoods.json';
import defaultDishes from '../data/defaultDishes.json';
import defaultExercises from '../data/defaultExercises.json';

const FOOD_MAP = {};
defaultFoods.forEach(f => {
  FOOD_MAP[f.id] = f;
});

const DISH_MAP = {};
defaultDishes.forEach(d => {
  DISH_MAP[d.id] = d;
});

export function normalizeDietType(dietType) {
  const dt = (dietType || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (['veg', 'vegetarian', 'pure_veg', 'pureveg', 'vegan'].includes(dt)) return 'veg';
  if (['eggetarian', 'egg', 'eggs', 'with_eggs', 'veg_with_egg', 'veg_with_eggs'].includes(dt)) return 'eggetarian';
  return 'non_veg';
}

export function isFoodCompliantWithDiet(food, dietType) {
  const fTags = (food.diet_tags || []).map(t => t.toLowerCase());
  const fid = food.id || '';
  const isNonVeg = fTags.includes('non_veg') || ['chicken_breast', 'fish_rohu'].includes(fid);
  const isEgg = fTags.includes('egg') || ['eggs', 'egg_whites'].includes(fid);

  const dt = normalizeDietType(dietType);
  if (dt === 'veg') return !isNonVeg && !isEgg;
  if (dt === 'eggetarian') return !isNonVeg;
  return true;
}

export function isDishCompliantWithDiet(dish, dietType) {
  const dt = normalizeDietType(dietType);
  const dishDiet = (dish.diet_type || '').toLowerCase();

  if (dt === 'veg') {
    if (dishDiet !== 'veg') return false;
    for (const ing of (dish.ingredients || [])) {
      const f = FOOD_MAP[ing.food_id];
      if (f && !isFoodCompliantWithDiet(f, 'veg')) return false;
    }
    return true;
  }
  if (dt === 'eggetarian') {
    if (!['veg', 'eggetarian'].includes(dishDiet)) return false;
    for (const ing of (dish.ingredients || [])) {
      const f = FOOD_MAP[ing.food_id];
      if (f && !isFoodCompliantWithDiet(f, 'eggetarian')) return false;
    }
    return true;
  }
  return true;
}

export function filterDishesByDiet(dishes, dietType) {
  return dishes.filter(d => isDishCompliantWithDiet(d, dietType));
}

export function filterPantryByDiet(pantry, dietType) {
  const dt = normalizeDietType(dietType);
  const result = {};
  for (const [fid, qty] of Object.entries(pantry || {})) {
    const f = FOOD_MAP[fid];
    if (f && qty > 0 && isFoodCompliantWithDiet(f, dt)) {
      result[fid] = qty;
    }
  }
  return result;
}

export function isDishCookable(dish, availableFoodIds) {
  const foodSet = availableFoodIds instanceof Set ? availableFoodIds : new Set(availableFoodIds);
  for (const ing of (dish.ingredients || [])) {
    if (!foodSet.has(ing.food_id)) return false;
  }
  return true;
}

export function calculateDishCost(dish) {
  let cost = 0.0;
  for (const ing of (dish.ingredients || [])) {
    const food = FOOD_MAP[ing.food_id];
    if (!food) continue;
    const factor = ing.amount / (food.unit === 'piece' ? 1.0 : 100.0);
    cost += (food.price_per_100g_or_unit_inr || 0.0) * factor;
  }
  return Math.round(cost * 100) / 100;
}

export function calculateBiometrics(profile, startDate = null) {
  const age = profile.age || 24;
  const sex = (profile.sex || 'male').toLowerCase();
  const heightCm = profile.height_cm || 175.0;
  const weightKg = profile.weight_kg || 72.0;
  const activityLevel = (profile.activity_level || 'moderate').toLowerCase();
  const goal = profile.goal || 'lean_bulk';
  const targetWeightKg = profile.target_weight_kg || 76.0;
  const bodyFatPct = profile.body_fat_pct;
  const skeletalMusclePct = profile.skeletal_muscle_pct;

  let lbmKg = null;
  let smmKg = null;
  let bmrFormula = 'mifflin_st_jeor';
  let bmr = 0;

  if (bodyFatPct && bodyFatPct > 0) {
    lbmKg = Math.round(weightKg * (1.0 - (bodyFatPct / 100.0)) * 10) / 10;
    bmr = Math.round(370.0 + (21.6 * lbmKg));
    bmrFormula = 'katch_mcardle';
  } else {
    if (sex === 'male') {
      bmr = Math.round((10.0 * weightKg) + (6.25 * heightCm) - (5.0 * age) + 5.0);
    } else {
      bmr = Math.round((10.0 * weightKg) + (6.25 * heightCm) - (5.0 * age) - 161.0);
    }
  }

  if (skeletalMusclePct && skeletalMusclePct > 0) {
    smmKg = Math.round(weightKg * (skeletalMusclePct / 100.0) * 10) / 10;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  let targetCalories = tdee;
  if (goal === 'cut') {
    const rawTarget = tdee - 400;
    const minFloor = sex === 'male' ? 1400 : 1200;
    targetCalories = Math.max(minFloor, rawTarget);
  } else if (goal === 'lean_bulk') {
    targetCalories = tdee + 300;
  } else {
    targetCalories = tdee;
  }

  let rawProtein = lbmKg ? 2.0 * lbmKg : 1.8 * targetWeightKg;
  const minProtein = Math.round(1.6 * weightKg * 10) / 10;
  const maxProtein = Math.round(2.2 * weightKg * 10) / 10;
  let proteinG = Math.round(Math.max(minProtein, Math.min(maxProtein, rawProtein)) * 10) / 10;

  const fatCals = targetCalories * 0.25;
  const fatsG = Math.round((fatCals / 9.0) * 10) / 10;

  const usedCals = (proteinG * 4.0) + (fatsG * 9.0);
  const remainingCals = Math.max(0.0, targetCalories - usedCals);
  let carbsG = Math.round((remainingCals / 4.0) * 10) / 10;

  // Strict Calorie-Macro Identity adjustment
  let finalCals = Math.round((proteinG * 4.0) + (carbsG * 4.0) + (fatsG * 9.0));
  if (finalCals !== targetCalories) {
    const diff = targetCalories - finalCals;
    carbsG = Math.round((carbsG + (diff / 4.0)) * 10) / 10;
  }
  finalCals = Math.round((proteinG * 4.0) + (carbsG * 4.0) + (fatsG * 9.0));

  // Weight trajectory projection
  const dailyDeltaKcal = finalCals - tdee;
  const rawWeeklyChangeKg = (dailyDeltaKcal * 7.0) / 7700.0;
  const startW = Math.round(weightKg * 100) / 100;
  const targetW = Math.round(targetWeightKg * 100) / 100;

  const baseDate = startDate ? new Date(startDate) : new Date();
  const formatIsoDate = (d) => d.toISOString().split('T')[0];

  const projection = [
    {
      week: 0,
      date: formatIsoDate(baseDate),
      projected_weight_kg: startW,
      weight_kg: startW
    }
  ];

  const isRecomp = (goal === 'recomp') || (targetW === startW) || (goal === 'cut' && targetW >= startW) || (goal === 'lean_bulk' && targetW <= startW);
  let estimatedWeeks = 12;

  if (isRecomp) {
    for (let w = 1; w <= 12; w++) {
      const d = new Date(baseDate.getTime() + w * 7 * 86400000);
      projection.push({
        week: w,
        date: formatIsoDate(d),
        projected_weight_kg: startW,
        weight_kg: startW
      });
    }
  } else if (goal === 'cut') {
    let weeklyChangeKg = -0.45;
    if (rawWeeklyChangeKg < 0) {
      weeklyChangeKg = Math.max(-0.75, Math.min(-0.25, rawWeeklyChangeKg));
    }
    weeklyChangeKg = Math.round(weeklyChangeKg * 10000) / 10000;

    let w = 1;
    const maxHorizon = 52;
    while (w <= maxHorizon) {
      const d = new Date(baseDate.getTime() + w * 7 * 86400000);
      let projected = Math.round((startW + (w * weeklyChangeKg)) * 100) / 100;
      if (projected <= targetW || w === maxHorizon) {
        projected = targetW;
        projection.push({
          week: w,
          date: formatIsoDate(d),
          projected_weight_kg: projected,
          weight_kg: projected
        });
        break;
      } else {
        projection.push({
          week: w,
          date: formatIsoDate(d),
          projected_weight_kg: projected,
          weight_kg: projected
        });
        w += 1;
      }
    }
    estimatedWeeks = w;
  } else {
    // lean_bulk
    let weeklyChangeKg = 0.25;
    if (rawWeeklyChangeKg > 0) {
      weeklyChangeKg = Math.max(0.15, Math.min(0.45, rawWeeklyChangeKg));
    }
    weeklyChangeKg = Math.round(weeklyChangeKg * 10000) / 10000;

    let w = 1;
    const maxHorizon = 52;
    while (w <= maxHorizon) {
      const d = new Date(baseDate.getTime() + w * 7 * 86400000);
      let projected = Math.round((startW + (w * weeklyChangeKg)) * 100) / 100;
      if (projected >= targetW || w === maxHorizon) {
        projected = targetW;
        projection.push({
          week: w,
          date: formatIsoDate(d),
          projected_weight_kg: projected,
          weight_kg: projected
        });
        break;
      } else {
        projection.push({
          week: w,
          date: formatIsoDate(d),
          projected_weight_kg: projected,
          weight_kg: projected
        });
        w += 1;
      }
    }
    estimatedWeeks = w;
  }

  return {
    bmr,
    bmr_formula: bmrFormula,
    tdee,
    target_calories: finalCals,
    protein_target_g: proteinG,
    carbs_target_g: carbsG,
    fats_target_g: fatsG,
    lean_body_mass_kg: lbmKg,
    skeletal_muscle_mass_kg: smmKg,
    body_fat_pct: bodyFatPct,
    skeletal_muscle_pct: skeletalMusclePct,
    estimated_weeks: estimatedWeeks,
    projection
  };
}

export function evaluatePantrySufficiency(pantry, dailyCalories, dailyProtein, dietType) {
  const weeklyCalsTarget = dailyCalories * 7;
  const weeklyProteinTarget = dailyProtein * 7.0;
  const weeklyVegTarget = 1400.0;
  const weeklyFruitTarget = 7.0;

  let availCals = 0.0;
  let availProtein = 0.0;
  let availVegG = 0.0;
  let availFruitServings = 0.0;
  const pantryFoodIds = new Set();

  const dietPantry = filterPantryByDiet(pantry, dietType);
  for (const [fid, qty] of Object.entries(dietPantry)) {
    const food = FOOD_MAP[fid];
    if (!food || qty <= 0) continue;
    pantryFoodIds.add(fid);

    const factor = qty / (food.unit === 'piece' ? 1.0 : 100.0);
    availCals += food.calories_per_100 * factor;
    availProtein += food.protein_per_100 * factor;

    if (food.category === 'vegetable') {
      availVegG += food.unit === 'g' ? qty : qty * 100.0;
    } else if (food.category === 'fruit') {
      availFruitServings += food.unit === 'piece' ? qty : (qty / 100.0);
    }
  }

  const gateProtein = availProtein >= (0.90 * weeklyProteinTarget);
  const gateCals = availCals >= (0.90 * weeklyCalsTarget);
  const gateVeg = availVegG >= weeklyVegTarget;
  const gateFruit = availFruitServings >= weeklyFruitTarget;

  const allowedDishes = filterDishesByDiet(defaultDishes, dietType);
  const cookableBySlot = { breakfast: [], lunch: [], snack: [], dinner: [] };

  for (const d of allowedDishes) {
    if (isDishCookable(d, pantryFoodIds)) {
      if (cookableBySlot[d.slot]) {
        cookableBySlot[d.slot].push(d);
      }
    }
  }

  const missingSlots = Object.keys(cookableBySlot).filter(slot => cookableBySlot[slot].length === 0);
  const gateDishes = missingSlots.length === 0;
  const isSufficient = gateProtein && gateCals && gateVeg && gateFruit && gateDishes;

  const shortfalls = {
    missing_protein_g: Math.max(0.0, Math.round((weeklyProteinTarget - availProtein) * 10) / 10),
    missing_calories: Math.max(0, Math.round(weeklyCalsTarget - availCals)),
    missing_veg_g: Math.max(0.0, Math.round((weeklyVegTarget - availVegG) * 10) / 10),
    missing_fruit_servings: Math.max(0.0, Math.round((weeklyFruitTarget - availFruitServings) * 10) / 10),
    missing_slots: missingSlots
  };

  return {
    is_sufficient: isSufficient,
    gates: {
      protein_gate: { passed: gateProtein, available: Math.round(availProtein * 10) / 10, target: Math.round(weeklyProteinTarget * 10) / 10 },
      calorie_gate: { passed: gateCals, available: Math.round(availCals), target: weeklyCalsTarget },
      vegetable_gate: { passed: gateVeg, available_g: Math.round(availVegG * 10) / 10, target_g: weeklyVegTarget },
      fruit_gate: { passed: gateFruit, available_servings: Math.round(availFruitServings * 10) / 10, target_servings: weeklyFruitTarget },
      cookable_slots_gate: { passed: gateDishes, missing_slots: missingSlots }
    },
    shortfalls
  };
}

export function solveMinimumGap(pantry, shortfalls, dietType) {
  const dt = normalizeDietType(dietType);
  const compliantFoods = defaultFoods.filter(f => isFoodCompliantWithDiet(f, dt));
  const dietPantry = filterPantryByDiet(pantry, dt);

  const gapCart = {};
  let remainingProtein = shortfalls.missing_protein_g || 0.0;
  let remainingCals = shortfalls.missing_calories || 0;
  let remainingVeg = shortfalls.missing_veg_g || 0.0;
  let remainingFruit = shortfalls.missing_fruit_servings || 0.0;
  const missingSlots = new Set(shortfalls.missing_slots || []);

  const allowedDishes = filterDishesByDiet(defaultDishes, dt);
  const activeFoodIds = new Set(Object.keys(dietPantry));

  for (const slot of missingSlots) {
    const slotDishes = allowedDishes.filter(d => d.slot === slot);
    if (!slotDishes.length) continue;
    slotDishes.sort((a, b) => calculateDishCost(a) - calculateDishCost(b));
    const bestDish = slotDishes[0];
    for (const ing of (bestDish.ingredients || [])) {
      const fid = ing.food_id;
      if (!activeFoodIds.has(fid)) {
        const weeklyAmt = ing.amount * 7;
        gapCart[fid] = (gapCart[fid] || 0.0) + weeklyAmt;
        activeFoodIds.add(fid);
      }
    }
  }

  for (const [fid, qty] of Object.entries(gapCart)) {
    const food = FOOD_MAP[fid];
    if (!food) continue;
    const factor = qty / (food.unit === 'piece' ? 1.0 : 100.0);
    remainingProtein = Math.max(0.0, remainingProtein - (food.protein_per_100 * factor));
    remainingCals = Math.max(0, remainingCals - Math.round(food.calories_per_100 * factor));
    if (food.category === 'vegetable') {
      const vegGrams = food.unit === 'g' ? qty : qty * 100.0;
      remainingVeg = Math.max(0.0, remainingVeg - vegGrams);
    } else if (food.category === 'fruit') {
      const fruitServ = food.unit === 'piece' ? qty : (qty / 100.0);
      remainingFruit = Math.max(0.0, remainingFruit - fruitServ);
    }
  }

  if (remainingVeg > 0) {
    const vegFoods = compliantFoods.filter(f => f.category === 'vegetable');
    vegFoods.sort((a, b) => (a.price_per_100g_or_unit_inr || 0) - (b.price_per_100g_or_unit_inr || 0));
    const cheapestVeg = vegFoods[0] || FOOD_MAP['spinach'];
    if (cheapestVeg) {
      const addG = Math.ceil(remainingVeg);
      gapCart[cheapestVeg.id] = (gapCart[cheapestVeg.id] || 0.0) + addG;
      const factor = addG / 100.0;
      remainingProtein = Math.max(0.0, remainingProtein - (cheapestVeg.protein_per_100 * factor));
      remainingCals = Math.max(0, remainingCals - Math.round(cheapestVeg.calories_per_100 * factor));
      remainingVeg = 0.0;
    }
  }

  if (remainingFruit > 0) {
    const fruitFoods = compliantFoods.filter(f => f.category === 'fruit');
    fruitFoods.sort((a, b) => (a.price_per_100g_or_unit_inr || 0) - (b.price_per_100g_or_unit_inr || 0));
    const cheapestFruit = fruitFoods[0] || FOOD_MAP['banana'];
    if (cheapestFruit) {
      const addServ = Math.ceil(remainingFruit);
      gapCart[cheapestFruit.id] = (gapCart[cheapestFruit.id] || 0.0) + addServ;
      const factor = addServ / (cheapestFruit.unit === 'piece' ? 1.0 : 100.0);
      remainingProtein = Math.max(0.0, remainingProtein - (cheapestFruit.protein_per_100 * factor));
      remainingCals = Math.max(0, remainingCals - Math.round(cheapestFruit.calories_per_100 * factor));
      remainingFruit = 0.0;
    }
  }

  if (remainingProtein > 0) {
    const proteinFoods = compliantFoods.filter(f => f.protein_per_100 > 5.0 && f.budget_tier === 'essential');
    proteinFoods.sort((a, b) => ((a.price_per_100g_or_unit_inr || 0) / a.protein_per_100) - ((b.price_per_100g_or_unit_inr || 0) / b.protein_per_100));
    const bestProteinFood = proteinFoods[0] || FOOD_MAP['soya_chunks'];
    if (bestProteinFood) {
      const protPerUnit = bestProteinFood.protein_per_100;
      const neededUnits = Math.ceil(remainingProtein / protPerUnit);
      const addQty = neededUnits * (bestProteinFood.unit === 'piece' ? 1.0 : 100.0);
      gapCart[bestProteinFood.id] = (gapCart[bestProteinFood.id] || 0.0) + addQty;
      const factor = addQty / (bestProteinFood.unit === 'piece' ? 1.0 : 100.0);
      remainingProtein = 0.0;
      remainingCals = Math.max(0, remainingCals - Math.round(bestProteinFood.calories_per_100 * factor));
    }
  }

  if (remainingCals > 0) {
    const carbFoods = compliantFoods.filter(f => ['grain', 'protein'].includes(f.category) && f.budget_tier === 'essential');
    carbFoods.sort((a, b) => ((a.price_per_100g_or_unit_inr || 0) / Math.max(1, a.calories_per_100)) - ((b.price_per_100g_or_unit_inr || 0) / Math.max(1, b.calories_per_100)));
    const bestCarbFood = carbFoods[0] || FOOD_MAP['wheat_atta'];
    if (bestCarbFood) {
      const calsPerUnit = bestCarbFood.calories_per_100;
      const neededUnits = Math.ceil(remainingCals / calsPerUnit);
      const addQty = neededUnits * 100.0;
      gapCart[bestCarbFood.id] = (gapCart[bestCarbFood.id] || 0.0) + addQty;
      remainingCals = 0;
    }
  }

  const itemizedList = [];
  let totalCostInr = 0.0;
  for (const [fid, qty] of Object.entries(gapCart)) {
    const food = FOOD_MAP[fid];
    if (!food || qty <= 0) continue;
    const factor = qty / (food.unit === 'piece' ? 1.0 : 100.0);
    const itemCost = Math.round((food.price_per_100g_or_unit_inr || 0) * factor * 100) / 100;
    totalCostInr += itemCost;
    itemizedList.push({
      food_id: fid,
      name: food.name,
      quantity: qty,
      unit: food.unit,
      cost_inr: itemCost,
      price_source: 'baseline'
    });
  }

  return {
    min_gap_cost_inr: Math.round(totalCostInr * 100) / 100,
    gap_cart: gapCart,
    itemized_shopping_list: itemizedList
  };
}

export function upgradeBudgetVariety(currentPantryIds, minGapCart, extraBudgetInr, dietType) {
  if (!extraBudgetInr || extraBudgetInr <= 0) {
    return {
      extra_budget_inr: 0.0,
      spent_extra_inr: 0.0,
      estimated_range_min: 0.0,
      estimated_range_max: 0.0,
      extra_cart: {},
      extra_shopping_list: [],
      unlocked_dishes: []
    };
  }

  const dt = normalizeDietType(dietType);
  const compliantPantryIds = new Set(
    Array.from(currentPantryIds || []).filter(fid => FOOD_MAP[fid] && isFoodCompliantWithDiet(FOOD_MAP[fid], dt))
  );
  const combinedIds = new Set([...compliantPantryIds, ...Object.keys(minGapCart || {})]);

  const allowedDishes = filterDishesByDiet(defaultDishes, dt);
  const lockedDishes = allowedDishes.filter(d => !isDishCookable(d, combinedIds));

  const dishUnlockCandidates = [];
  for (const d of lockedDishes) {
    const missingIngs = (d.ingredients || []).filter(ing => !combinedIds.has(ing.food_id));
    let cost = 0.0;
    for (const ing of missingIngs) {
      const f = FOOD_MAP[ing.food_id];
      if (!f) continue;
      const factor = (ing.amount * 7) / (f.unit === 'piece' ? 1.0 : 100.0);
      cost += (f.price_per_100g_or_unit_inr || 0) * factor;
    }
    dishUnlockCandidates.push({
      dish: d,
      missing_ings: missingIngs,
      unlock_cost_inr: Math.round(cost * 100) / 100
    });
  }

  dishUnlockCandidates.sort((a, b) => a.unlock_cost_inr - b.unlock_cost_inr);

  let budgetRemaining = extraBudgetInr;
  const extraCart = {};
  const unlockedDishes = [];

  for (const cand of dishUnlockCandidates) {
    if (cand.unlock_cost_inr <= budgetRemaining) {
      budgetRemaining -= cand.unlock_cost_inr;
      unlockedDishes.push({
        dish_id: cand.dish.id,
        name: cand.dish.name,
        slot: cand.dish.slot,
        unlock_cost_inr: cand.unlock_cost_inr,
        missing_ingredients: cand.missing_ings,
        video_recipe_url: cand.dish.video_recipe_url,
        web_recipe_url: cand.dish.web_recipe_url
      });

      for (const ing of cand.missing_ings) {
        const amt = ing.amount * 7;
        extraCart[ing.food_id] = (extraCart[ing.food_id] || 0.0) + amt;
        combinedIds.add(ing.food_id);
      }
    }
  }

  const extraShoppingList = [];
  let spentTotal = 0.0;
  for (const [fid, qty] of Object.entries(extraCart)) {
    const f = FOOD_MAP[fid];
    if (!f) continue;
    const factor = qty / (f.unit === 'piece' ? 1.0 : 100.0);
    const cost = Math.round((f.price_per_100g_or_unit_inr || 0) * factor * 100) / 100;
    spentTotal += cost;
    extraShoppingList.push({
      food_id: fid,
      name: f.name,
      quantity: qty,
      unit: f.unit,
      cost_inr: cost,
      price_source: 'baseline'
    });
  }

  return {
    extra_budget_inr: extraBudgetInr,
    spent_extra_inr: Math.round(spentTotal * 100) / 100,
    estimated_range_min: Math.round(spentTotal * 0.95 * 100) / 100,
    estimated_range_max: Math.round(spentTotal * 1.05 * 100) / 100,
    extra_cart: extraCart,
    extra_shopping_list: extraShoppingList,
    unlocked_dishes: unlockedDishes
  };
}

export function generate7DayMealPlan(availableFoodIds, dietType, targetCalories, targetProtein) {
  const dt = normalizeDietType(dietType);
  const allowedDishes = filterDishesByDiet(defaultDishes, dt);
  const cookable = allowedDishes.filter(d => isDishCookable(d, availableFoodIds));

  const bySlot = {
    breakfast: cookable.filter(d => d.slot === 'breakfast'),
    lunch: cookable.filter(d => d.slot === 'lunch'),
    snack: cookable.filter(d => d.slot === 'snack'),
    dinner: cookable.filter(d => d.slot === 'dinner')
  };

  for (const slot of ['breakfast', 'lunch', 'snack', 'dinner']) {
    if (!bySlot[slot].length) {
      bySlot[slot] = cookable.length ? cookable : allowedDishes;
    }
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const planDays = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const dayName = days[dayIdx];
    const bList = bySlot.breakfast;
    const lList = bySlot.lunch;
    const sList = bySlot.snack;
    const dList = bySlot.dinner;

    const bDish = bList[dayIdx % bList.length];
    const lDish = lList[dayIdx % lList.length];
    const sDish = sList[dayIdx % sList.length];
    const dDish = dList[dayIdx % dList.length];

    const dayMeals = [];
    for (const [d, slot] of [[bDish, 'breakfast'], [lDish, 'lunch'], [sDish, 'snack'], [dDish, 'dinner']]) {
      const swapOpts = [];
      for (const opt of bySlot[slot]) {
        if (opt.id !== d.id && isDishCompliantWithDiet(opt, dt)) {
          swapOpts.push({
            id: opt.id,
            name: opt.name,
            slot: opt.slot,
            calories: opt.calories,
            protein_g: opt.protein_g,
            prep_time_mins: opt.prep_time_mins || 15,
            video_recipe_url: opt.video_recipe_url,
            web_recipe_url: opt.web_recipe_url
          });
          if (swapOpts.length >= 4) break;
        }
      }

      const dishCost = calculateDishCost(d);
      dayMeals.push({
        meal_id: `${d.id}_${dayIdx}_${slot}`,
        dish_id: d.id,
        name: d.name,
        slot,
        prep_time_mins: d.prep_time_mins,
        protein_g: d.protein_g,
        carbs_g: d.carbs_g,
        fats_g: d.fats_g,
        fiber_g: d.fiber_g,
        calories: d.calories,
        cost_inr: dishCost,
        serving_multiplier: 1.0,
        ingredients: d.ingredients,
        recipe_steps: d.recipe_steps,
        swap_options: swapOpts,
        video_recipe_url: d.video_recipe_url,
        web_recipe_url: d.web_recipe_url
      });
    }

    const dayP = Math.round(dayMeals.reduce((acc, m) => acc + m.protein_g, 0) * 10) / 10;
    const dayC = Math.round(dayMeals.reduce((acc, m) => acc + m.carbs_g, 0) * 10) / 10;
    const dayF = Math.round(dayMeals.reduce((acc, m) => acc + m.fats_g, 0) * 10) / 10;
    const dayFiber = Math.round(dayMeals.reduce((acc, m) => acc + m.fiber_g, 0) * 10) / 10;
    const dayCals = Math.round((dayP * 4.0) + (dayC * 4.0) + (dayF * 9.0));

    planDays.push({
      day_index: dayIdx + 1,
      day_name: dayName,
      meals: dayMeals,
      summary: {
        calories: dayCals,
        protein_g: dayP,
        carbs_g: dayC,
        fats_g: dayF,
        fiber_g: dayFiber,
        target_calories: targetCalories,
        target_protein_g: targetProtein
      }
    });
  }

  return planDays;
}

export function generateWorkoutPlan(environment, experienceLevel = 'beginner', daysPerWeek = 4, goal = 'lean_bulk') {
  const env = (environment || '').toLowerCase() === 'with_gym' ? 'with_gym' : 'without_gym';
  const catalog = defaultExercises.filter(ex => ex.environment === env);

  const byMuscle = {};
  catalog.forEach(ex => {
    byMuscle[ex.muscle_group] = byMuscle[ex.muscle_group] || [];
    byMuscle[ex.muscle_group].push(ex);
  });

  const splitDays = [];
  const daysCount = parseInt(daysPerWeek) || 4;

  if (daysCount === 3) {
    const splitNames = ['Full Body A', 'Full Body B', 'Full Body C'];
    splitNames.forEach((sname, idx) => {
      const exList = [];
      ['chest', 'back', 'legs', 'shoulders', 'core'].forEach(mg => {
        const pool = byMuscle[mg] || [];
        if (pool.length) exList.push({ ...pool[idx % pool.length] });
      });
      splitDays.push({ day_num: idx + 1, day_name: `Day ${idx + 1}: ${sname}`, exercises: exList });
    });
  } else if (daysCount === 4) {
    const splits = [
      ['Upper Body A', ['chest', 'back', 'shoulders', 'arms']],
      ['Lower Body A', ['legs', 'legs', 'core', 'core']],
      ['Upper Body B', ['chest', 'back', 'shoulders', 'arms']],
      ['Lower Body B', ['legs', 'legs', 'core', 'core']]
    ];
    splits.forEach(([sname, mgs], idx) => {
      const exList = [];
      mgs.forEach((mg, mgIdx) => {
        const pool = byMuscle[mg] || [];
        if (pool.length) exList.push({ ...pool[(idx + mgIdx) % pool.length] });
      });
      splitDays.push({ day_num: idx + 1, day_name: `Day ${idx + 1}: ${sname}`, exercises: exList });
    });
  } else if (daysCount === 5) {
    const splits = [
      ['Upper Body Focus', ['chest', 'back', 'shoulders', 'arms']],
      ['Lower Body Focus', ['legs', 'legs', 'core']],
      ['Push Day', ['chest', 'shoulders', 'arms', 'core']],
      ['Pull Day', ['back', 'back', 'arms', 'core']],
      ['Legs & Core', ['legs', 'legs', 'core', 'full_body']]
    ];
    splits.forEach(([sname, mgs], idx) => {
      const exList = [];
      mgs.forEach((mg, mgIdx) => {
        const pool = byMuscle[mg] || byMuscle.core || [];
        if (pool.length) exList.push({ ...pool[(idx + mgIdx) % pool.length] });
      });
      splitDays.push({ day_num: idx + 1, day_name: `Day ${idx + 1}: ${sname}`, exercises: exList });
    });
  } else {
    // 6 days
    const splits = [
      ['Push A', ['chest', 'shoulders', 'arms']],
      ['Pull A', ['back', 'back', 'arms']],
      ['Legs A', ['legs', 'legs', 'core']],
      ['Push B', ['chest', 'shoulders', 'arms']],
      ['Pull B', ['back', 'back', 'arms']],
      ['Legs B', ['legs', 'legs', 'core']]
    ];
    splits.forEach(([sname, mgs], idx) => {
      const exList = [];
      mgs.forEach((mg, mgIdx) => {
        const pool = byMuscle[mg] || byMuscle.core || [];
        if (pool.length) exList.push({ ...pool[(idx + mgIdx) % pool.length] });
      });
      splitDays.push({ day_num: idx + 1, day_name: `Day ${idx + 1}: ${sname}`, exercises: exList });
    });
  }

  return {
    environment: env,
    experience_level: experienceLevel,
    days_per_week: daysCount,
    goal,
    schedule: splitDays
  };
}

export function generateDeterministicPlanLocally({ profile, pantry, extra_budget_inr = 0.0 }) {
  const p = profile || {};
  const biometrics = calculateBiometrics(p);
  const cleanPantry = filterPantryByDiet(pantry || {}, p.diet_type);

  const sufficiency = evaluatePantrySufficiency(
    cleanPantry,
    biometrics.target_calories,
    biometrics.protein_target_g,
    p.diet_type
  );

  let minimumGap = { min_gap_cost_inr: 0.0, gap_cart: {}, itemized_shopping_list: [] };
  if (!sufficiency.is_sufficient) {
    minimumGap = solveMinimumGap(cleanPantry, sufficiency.shortfalls, p.diet_type);
  }

  const extraBudget = upgradeBudgetVariety(
    Object.keys(cleanPantry),
    minimumGap.gap_cart,
    extra_budget_inr,
    p.diet_type
  );

  const availableFoodIds = new Set([
    ...Object.keys(cleanPantry),
    ...Object.keys(minimumGap.gap_cart || {}),
    ...Object.keys(extraBudget.extra_cart || {})
  ]);

  const mealPlan = generate7DayMealPlan(
    availableFoodIds,
    p.diet_type,
    biometrics.target_calories,
    biometrics.protein_target_g
  );

  const workoutPlan = generateWorkoutPlan(
    p.workout_environment,
    p.experience_level,
    p.days_per_week,
    p.goal
  );

  return {
    biometrics,
    sufficiency,
    minimum_gap: minimumGap,
    extra_budget: extraBudget,
    meal_plan: mealPlan,
    workout_plan: workoutPlan,
    engine_source: 'client_local_deterministic'
  };
}

export function swapDishLocally({ day_index, slot, new_dish_id, serving_multiplier = 1.0, day_meals, target_calories, target_protein }) {
  const newDish = DISH_MAP[new_dish_id];
  if (!newDish) throw new Error('Dish not found');

  const mult = Math.max(0.5, Math.min(3.0, parseFloat(serving_multiplier) || 1.0));
  const baseCost = calculateDishCost(newDish);

  const updatedMeals = (day_meals || []).map(m => {
    if (m.slot === slot) {
      const p = Math.round(newDish.protein_g * mult * 10) / 10;
      const c = Math.round(newDish.carbs_g * mult * 10) / 10;
      const f = Math.round(newDish.fats_g * mult * 10) / 10;
      const fiber = Math.round(newDish.fiber_g * mult * 10) / 10;
      const cals = Math.round((p * 4.0) + (c * 4.0) + (f * 9.0));
      return {
        ...m,
        dish_id: newDish.id,
        name: newDish.name,
        prep_time_mins: newDish.prep_time_mins,
        protein_g: p,
        carbs_g: c,
        fats_g: f,
        fiber_g: fiber,
        calories: cals,
        cost_inr: Math.round(baseCost * mult * 100) / 100,
        serving_multiplier: mult,
        ingredients: newDish.ingredients,
        recipe_steps: newDish.recipe_steps,
        video_recipe_url: newDish.video_recipe_url,
        web_recipe_url: newDish.web_recipe_url
      };
    }
    return m;
  });

  const dayP = Math.round(updatedMeals.reduce((acc, m) => acc + m.protein_g, 0) * 10) / 10;
  const dayC = Math.round(updatedMeals.reduce((acc, m) => acc + m.carbs_g, 0) * 10) / 10;
  const dayF = Math.round(updatedMeals.reduce((acc, m) => acc + m.fats_g, 0) * 10) / 10;
  const dayFiber = Math.round(updatedMeals.reduce((acc, m) => acc + m.fiber_g, 0) * 10) / 10;
  const dayCals = Math.round((dayP * 4.0) + (dayC * 4.0) + (dayF * 9.0));

  return {
    meals: updatedMeals,
    summary: {
      calories: dayCals,
      protein_g: dayP,
      carbs_g: dayC,
      fats_g: dayF,
      fiber_g: dayFiber,
      target_calories,
      target_protein_g: target_protein
    }
  };
}
