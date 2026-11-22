import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChefHat,
  Clock,
  Flame,
  Dumbbell,
  Edit2,
  ExternalLink,
  Play,
  BookOpen
} from 'lucide-react';
import {
  swapDish,
  fetchPriceStatus,
  triggerPriceSync,
  setPriceOverride,
  deletePriceOverride
} from '../services/api';

export default function MealPlanView({
  mealPlan,
  setMealPlan,
  sufficiency,
  minimumGap,
  extraBudget,
  onExtraBudgetChange,
  onRefreshPlan,
  targetCalories,
  targetProtein,
  foods
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [activeSwapSlot, setActiveSwapSlot] = useState(null); // { dayIndex, slot, currentDishId }
  const [cookedMeals, setCookedMeals] = useState({});
  const [sliderVal, setSliderVal] = useState(extraBudget?.extra_budget_inr || 0);

  // Market Price Sync state
  const [priceStatus, setPriceStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [editPriceInput, setEditPriceInput] = useState('');

  useEffect(() => {
    loadPriceStatus();
  }, []);

  const loadPriceStatus = async () => {
    try {
      const data = await fetchPriceStatus();
      setPriceStatus(data);
    } catch (err) {
      console.error('Failed to load price status:', err);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await triggerPriceSync();
      await loadPriceStatus();
      if (onRefreshPlan) await onRefreshPlan();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartEdit = (foodId, currentPrice) => {
    setEditingFoodId(foodId);
    setEditPriceInput(currentPrice.toString());
  };

  const handleSaveOverride = async (foodId) => {
    const parsed = parseFloat(editPriceInput);
    if (isNaN(parsed) || parsed <= 0) return;
    try {
      await setPriceOverride(foodId, parsed);
      setEditingFoodId(null);
      await loadPriceStatus();
      if (onRefreshPlan) await onRefreshPlan();
    } catch (err) {
      console.error('Failed to override price:', err);
    }
  };

  const handleResetOverride = async (foodId) => {
    try {
      await deletePriceOverride(foodId);
      if (editingFoodId === foodId) setEditingFoodId(null);
      await loadPriceStatus();
      if (onRefreshPlan) await onRefreshPlan();
    } catch (err) {
      console.error('Failed to reset price:', err);
    }
  };

  if (!mealPlan || mealPlan.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-400">
        <p>No meal plan generated yet. Complete the onboarding wizard first.</p>
      </div>
    );
  }

  const currentDay = mealPlan.find(d => d.day_index === selectedDayIndex) || mealPlan[0];
  const isSufficient = sufficiency?.is_sufficient;
  const shortfalls = sufficiency?.shortfalls || {};
  const minGapCost = minimumGap?.min_gap_cost_inr || 0;
  const minShoppingList = minimumGap?.itemized_shopping_list || [];
  const extraShoppingList = extraBudget?.extra_shopping_list || [];
  const unlockedDishes = extraBudget?.unlocked_dishes || [];

  const handleSliderCommit = (val) => {
    setSliderVal(val);
    onExtraBudgetChange(val);
  };

  const handleSwapSelect = async (newDishId, slot) => {
    try {
      const res = await swapDish({
        day_index: selectedDayIndex,
        slot: slot,
        new_dish_id: newDishId,
        serving_multiplier: 1.0,
        day_meals: currentDay.meals,
        target_calories: targetCalories,
        target_protein: targetProtein
      });

      // Update meal plan state in parent
      setMealPlan(prev => prev.map(d => {
        if (d.day_index === selectedDayIndex) {
          return {
            ...d,
            meals: res.meals,
            summary: res.summary
          };
        }
        return d;
      }));
      setActiveSwapSlot(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMultiplierChange = async (meal, mult) => {
    try {
      const res = await swapDish({
        day_index: selectedDayIndex,
        slot: meal.slot,
        new_dish_id: meal.dish_id,
        serving_multiplier: mult,
        day_meals: currentDay.meals,
        target_calories: targetCalories,
        target_protein: targetProtein
      });

      setMealPlan(prev => prev.map(d => {
        if (d.day_index === selectedDayIndex) {
          return {
            ...d,
            meals: res.meals,
            summary: res.summary
          };
        }
        return d;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCooked = (mealId) => {
    setCookedMeals(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  const getSlotColor = (slot) => {
    switch (slot) {
      case 'breakfast': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'lunch': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'snack': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'dinner': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* =========================================================================
          MODULE C: TOP BANNER & 2-STEP INVESTMENT OPTIMIZER PANEL
         ========================================================================= */}
      {isSufficient ? (
        // BRANCH 1: Pantry is Sufficient
        <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-3xl p-6 sm:p-7 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Your Pantry Has Enough Resources (₹0 Extra Required)</h3>
              <p className="text-xs sm:text-sm text-emerald-300/80 mt-0.5">
                All 5 sufficiency gates passed. Every meal in this 7-day schedule uses strictly ingredients from your current kitchen stock.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // BRANCH 2: Pantry Lacks Resources — 2-Step Investment Card
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          
          {/* Automatic Daily Market Price Engine - Live Status Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              {priceStatus?.mode === 'live_synced' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live AGMARKNET Prices ({priceStatus.live_item_count} Items Synced)
                </span>
              ) : priceStatus?.mode === 'stale' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Market Prices Stale (&gt;24h)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Baseline Food Catalog Prices
                </span>
              )}

              {priceStatus?.last_synced_at && (
                <span className="text-[11px] text-slate-400">
                  Synced: {new Date(priceStatus.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({priceStatus.state})
                </span>
              )}
              {priceStatus?.overrides_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                  {priceStatus.overrides_count} User Override{priceStatus.overrides_count > 1 ? 's' : ''} Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Trigger on-demand AGMARKNET daily price sync"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Market Prices'}</span>
              </button>
            </div>
          </div>

          {/* Step 1: Minimum Mandatory Investment */}
          <div className="space-y-4 border-b border-slate-800 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Pantry Deficit & Minimum Mandatory Investment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your kitchen stock lacks key gates for your target build.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Minimum Weekly Cart:</span>
                <div className="text-2xl font-black text-amber-400 font-mono-num">
                  ₹{minGapCost} <span className="text-xs font-normal text-slate-500">/ week</span>
                </div>
                {minimumGap?.estimated_range_min !== undefined && (
                  <div className="text-[11px] text-slate-400 font-mono-num font-medium">
                    Est. Range: ₹{minimumGap.estimated_range_min} – ₹{minimumGap.estimated_range_max}
                  </div>
                )}
              </div>
            </div>

            {/* Exact Shortfalls Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Weekly Resource Gaps:</span>
              {shortfalls.missing_protein_g > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800 font-mono-num font-bold">
                  Short by {shortfalls.missing_protein_g}g Protein
                </span>
              )}
              {shortfalls.missing_calories > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800 font-mono-num font-bold">
                  Short by {shortfalls.missing_calories} kcal
                </span>
              )}
              {shortfalls.missing_veg_g > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono-num font-bold">
                  Short by {shortfalls.missing_veg_g}g Veggies
                </span>
              )}
              {shortfalls.missing_fruit_servings > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800 font-mono-num font-bold">
                  Short by {shortfalls.missing_fruit_servings} Fruit Servings
                </span>
              )}
            </div>

            {/* Minimum Gap Itemized Shopping List Table */}
            {minShoppingList.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Minimum Gap Shopping List ({minShoppingList.length} items)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {minShoppingList.map(item => {
                    const isEditing = editingFoodId === item.food_id;
                    const unitLabel = item.unit === 'piece' ? 'pc' : item.unit === 'ml' ? '100ml' : '100g';
                    return (
                      <div key={item.food_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{item.name}</span>
                              {item.price_source === 'custom' ? (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Custom Local
                                </span>
                              ) : item.price_source === 'agmarknet_daily' ? (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Live AGMARKNET
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  Baseline
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                              {item.quantity} {item.unit}
                            </div>
                          </div>
                          <span className="text-amber-400 font-bold font-mono-num text-sm">₹{item.line_cost_inr}</span>
                        </div>

                        {/* Price Resolution & Inline Editing */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 pt-1.5 border-t border-slate-800/80">
                            <span className="text-[11px] text-slate-400 font-mono-num">₹</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0.1"
                              value={editPriceInput}
                              onChange={(e) => setEditPriceInput(e.target.value)}
                              className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-amber-500 text-white text-xs font-mono-num focus:outline-none"
                              autoFocus
                            />
                            <span className="text-[10px] text-slate-500">/{unitLabel}</span>
                            <button
                              type="button"
                              onClick={() => handleSaveOverride(item.food_id)}
                              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold hover:bg-amber-400 ml-auto"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFoodId(null)}
                              className="px-1 text-[10px] text-slate-400 hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-400 font-mono-num">
                              <span>₹{item.unit_price_inr}/{unitLabel}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item.food_id, item.unit_price_inr)}
                                className="p-0.5 hover:text-amber-400 text-slate-500 transition-colors"
                                title="Edit local retail price"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {item.price_source === 'custom' && (
                                <button
                                  type="button"
                                  onClick={() => handleResetOverride(item.food_id)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 underline ml-1"
                                  title="Reset to live or baseline catalog price"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            <a
                              href={`https://www.google.com/search?q=buy+${encodeURIComponent(item.name)}+price+india`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 text-[10px]"
                            >
                              <span>Check Live</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Extra Investment Prompt for More Variety */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Want More Dish Variety & Tastier Options?
                </h4>
                <p className="text-xs text-slate-400">
                  How much MORE can you invest above ₹{minGapCost} this week to unlock paneer, chicken breast, oats, or Greek yogurt?
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Extra Budget Added:</span>
                <div className="text-xl font-bold text-emerald-400 font-mono-num">+₹{sliderVal}</div>
              </div>
            </div>

            {/* Quick-Select Tiers & Slider */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '+₹0 [Strict Minimum]', val: 0 },
                  { label: '+₹250', val: 250 },
                  { label: '+₹500', val: 500 },
                  { label: '+₹1000', val: 1000 }
                ].map(b => (
                  <button
                    key={b.val}
                    type="button"
                    onClick={() => handleSliderCommit(b.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      sliderVal === b.val
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={sliderVal}
                  onChange={(e) => setSliderVal(parseFloat(e.target.value) || 0)}
                  onMouseUp={() => handleSliderCommit(sliderVal)}
                  onTouchEnd={() => handleSliderCommit(sliderVal)}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <span className="text-xs font-mono-num text-slate-400 w-16 text-right">₹{sliderVal}</span>
              </div>
            </div>

            {/* Newly Unlocked Dishes Display */}
            {unlockedDishes.length > 0 && (
              <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-3xl space-y-3">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>{unlockedDishes.length} Additional Dishes Unlocked from Your Extra Budget:</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {unlockedDishes.map(d => {
                    const videoUrl = d.video_recipe_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(d.name)}+healthy+recipe`;
                    const webUrl = d.web_recipe_url || `https://www.google.com/search?q=${encodeURIComponent(d.name)}+easy+step+by+step+recipe`;
                    return (
                      <div
                        key={d.id}
                        className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs font-semibold text-slate-200 flex items-center gap-2.5 shadow-sm"
                      >
                        <span>✨ <strong className="text-white">{d.name}</strong> <span className="text-slate-400 text-[10px]">({d.slot})</span></span>
                        <div className="flex items-center gap-2 border-l border-slate-700/80 pl-2.5">
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-red-400 hover:text-red-300 font-bold text-[11px] flex items-center gap-1 hover:underline"
                            title="Watch Video Recipe on YouTube"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Recipe ↗</span>
                          </a>
                          <span className="text-slate-600">·</span>
                          <a
                            href={webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline"
                            title="Read Written Recipe"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>Read ↗</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Cart Items */}
            {extraShoppingList.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Upgraded Shopping List Additions ({extraShoppingList.length} items):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {extraShoppingList.map(item => (
                    <div key={item.food_id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.quantity} {item.unit}</div>
                      </div>
                      <span className="text-emerald-400 font-bold font-mono-num">+₹{item.line_cost_inr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}


      {/* =========================================================================
          7-DAY MEAL TIMETABLE
         ========================================================================= */}
      <div className="space-y-6">
        
        {/* Horizontal Day Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {mealPlan.map(d => {
            const isSelected = d.day_index === selectedDayIndex;
            return (
              <button
                key={d.day_index}
                onClick={() => setSelectedDayIndex(d.day_index)}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex flex-col items-center min-w-[105px] border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{d.day_name}</span>
                <span className={`text-[10px] font-mono-num mt-0.5 ${isSelected ? 'text-slate-950 font-black' : 'text-slate-500'}`}>
                  {d.summary?.calories} kcal
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Header Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Active Schedule
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">{currentDay.day_name}</h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono-num bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
            <div>
              <span className="text-slate-500">Total: </span>
              <strong className="text-white font-bold">{currentDay.summary?.calories} kcal</strong>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500">P: </span>
              <strong className="text-rose-400 font-bold">{currentDay.summary?.protein_g}g</strong>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500">C: </span>
              <strong className="text-sky-400 font-bold">{currentDay.summary?.carbs_g}g</strong>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500">F: </span>
              <strong className="text-amber-400 font-bold">{currentDay.summary?.fats_g}g</strong>
            </div>
          </div>
        </div>

        {/* 4 Meal Slots Grid (Breakfast, Lunch, Snack, Dinner) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {currentDay.meals.map(meal => {
            const isCooked = !!cookedMeals[meal.meal_id];
            const isRecipeOpen = expandedRecipeId === meal.meal_id;
            const isSwapOpen = activeSwapSlot === meal.slot;
            const videoUrl = meal.video_recipe_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(meal.name)}+healthy+recipe`;
            const webUrl = meal.web_recipe_url || `https://www.google.com/search?q=${encodeURIComponent(meal.name)}+easy+step+by+step+recipe`;

            return (
              <div
                key={meal.meal_id}
                className={`bg-slate-900 border rounded-3xl transition-all overflow-hidden flex flex-col justify-between ${
                  isCooked ? 'border-emerald-500/50 bg-slate-900/70 opacity-80' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-800/80 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getSlotColor(meal.slot)}`}>
                          {meal.slot}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {meal.prep_time_mins} mins
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white pt-1">{meal.name}</h4>
                    </div>

                    {/* Serving Multiplier Selector */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {[0.75, 1.0, 1.25, 1.5].map(m => (
                        <button
                          key={m}
                          onClick={() => handleMultiplierChange(meal, m)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono-num transition-all ${
                            meal.serving_multiplier === m
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Macros Badges */}
                  <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono-num">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> {meal.calories} kcal
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-rose-400 font-bold">P: {meal.protein_g}g</span>
                      <span className="text-sky-400 font-bold">C: {meal.carbs_g}g</span>
                      <span className="text-amber-300 font-bold">F: {meal.fats_g}g</span>
                    </div>
                  </div>

                  {/* Exact Ingredient Weights */}
                  <div className="p-5 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Exact Measured Ingredients:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {meal.ingredients.map(ing => {
                        const food = foods.find(f => f.id === ing.food_id);
                        const scaledAmt = Math.round(ing.amount * (meal.serving_multiplier || 1.0) * 10) / 10;
                        const unit = food?.unit || 'g';
                        return (
                          <span
                            key={ing.food_id}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300"
                          >
                            {food?.name || ing.food_id}: <strong className="text-white font-mono-num">{scaledAmt}{unit}</strong>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Bottom Actions, Recipe Links & Recipe Drawer */}
                <div className="border-t border-slate-800 bg-slate-950/40">
                  
                  {/* Compact Recipe Action Links Bar */}
                  <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-850 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Recipes:
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                        title="Watch Step-by-Step Cooking Video on YouTube"
                      >
                        <Play className="w-3 h-3 fill-red-400 text-red-400" />
                        <span>Watch Recipe ↗</span>
                      </a>
                      <a
                        href={webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 hover:text-amber-200 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                        title="Read Step-by-Step Written Recipe"
                      >
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        <span>Read Recipe ↗</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-3 px-5 flex items-center justify-between text-xs">
                    
                    {/* Swap Dish Trigger */}
                    <button
                      type="button"
                      onClick={() => setActiveSwapSlot(isSwapOpen ? null : meal.slot)}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Swap Dish</span>
                    </button>

                    {/* Recipe Instructions Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedRecipeId(isRecipeOpen ? null : meal.meal_id)}
                      className="text-slate-300 hover:text-white font-semibold flex items-center gap-1"
                    >
                      <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isRecipeOpen ? 'Hide Recipe' : 'View Recipe'}</span>
                      {isRecipeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Mark Cooked Action */}
                    <button
                      type="button"
                      onClick={() => toggleCooked(meal.meal_id)}
                      className={`flex items-center gap-1 font-bold ${
                        isCooked ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCooked ? 'Cooked' : 'Mark Cooked'}</span>
                    </button>
                  </div>

                  {/* Swap Options Modal / Dropdown */}
                  {isSwapOpen && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Alternative Cookable Dishes:
                        </span>
                        <span className="text-[10px] text-slate-500">Preview recipe before swapping</span>
                      </div>
                      {meal.swap_options && meal.swap_options.length > 0 ? (
                        <div className="space-y-2">
                          {meal.swap_options.map(alt => {
                            const altId = typeof alt === 'string' ? alt : alt.id;
                            const altName = typeof alt === 'string' ? alt.replace(/_/g, ' ') : (alt.name || alt.id.replace(/_/g, ' '));
                            const altVideoUrl = typeof alt === 'object' && alt.video_recipe_url
                              ? alt.video_recipe_url
                              : `https://www.youtube.com/results?search_query=${encodeURIComponent(altName)}+healthy+recipe`;
                            const altWebUrl = typeof alt === 'object' && alt.web_recipe_url
                              ? alt.web_recipe_url
                              : `https://www.google.com/search?q=${encodeURIComponent(altName)}+easy+step+by+step+recipe`;

                            return (
                              <div
                                key={altId}
                                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-xs truncate capitalize">{altName}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <a
                                      href={altVideoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span>Watch Recipe ↗</span>
                                    </a>
                                    <span className="text-slate-600">·</span>
                                    <a
                                      href={altWebUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                                    >
                                      <BookOpen className="w-2.5 h-2.5" />
                                      <span>Read Recipe ↗</span>
                                    </a>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSwapSelect(altId, meal.slot)}
                                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 self-end sm:self-center transition-all shadow-sm"
                                >
                                  <span>Swap Dish ↵</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No alternate dishes available from current stock.</p>
                      )}
                    </div>
                  )}

                  {/* Collapsible Recipe Drawer */}
                  {isRecipeOpen && (
                    <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-4">
                      
                      {/* Prominent Recipe Action Buttons */}
                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ChefHat className="w-4 h-4 text-amber-400" />
                            <span>Culinary Walkthrough & Video</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Watch preparation tutorial or read detailed culinary guides</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Watch on YouTube ↗</span>
                          </a>
                          <a
                            href={webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Full Recipe ↗</span>
                          </a>
                        </div>
                      </div>

                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Step-by-Step Cooking Instructions:
                      </span>
                      <ol className="space-y-2 text-xs text-slate-300">
                        {meal.recipe_steps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold text-[10px] flex items-center justify-center mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
