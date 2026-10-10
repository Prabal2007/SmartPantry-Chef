import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PantryManager from './components/PantryManager';
import PlanConfig from './components/PlanConfig';
import NutritionSummary from './components/NutritionSummary';
import MealScheduleCard from './components/MealScheduleCard';
import GroceryDrawer from './components/GroceryDrawer';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';

import { INITIAL_PANTRY_ITEMS } from './data/presetIngredients';
import { generateMealPlanWithAI } from './services/aiMealService';
import confetti from 'canvas-confetti';
import { Sparkles, Utensils, ChefHat, RefreshCw } from 'lucide-react';

export default function App() {
  // 1. LocalStorage state initialization
  const [pantryItems, setPantryItems] = useState(() => {
    const saved = localStorage.getItem('smartpantry_items');
    return saved ? JSON.parse(saved) : INITIAL_PANTRY_ITEMS;
  });

  const [duration, setDuration] = useState(1); // 1 or 7
  const [dietPreference, setDietPreference] = useState('Balanced');
  const [strictness, setStrictness] = useState('flexible'); // 'strict' or 'flexible'
  const [targetCalories, setTargetCalories] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(75);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('smartpantry_gemini_key') || '');

  const [mealPlan, setMealPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [bookmarkedMeals, setBookmarkedMeals] = useState(() => {
    const saved = localStorage.getItem('smartpantry_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  const [isGroceryDrawerOpen, setIsGroceryDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('smartpantry_items', JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    localStorage.setItem('smartpantry_bookmarks', JSON.stringify(bookmarkedMeals));
  }, [bookmarkedMeals]);

  useEffect(() => {
    localStorage.setItem('smartpantry_gemini_key', apiKey);
  }, [apiKey]);

  // Initial meal plan generation on mount
  useEffect(() => {
    handleGeneratePlan(true);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Pantry Management
  const handleAddItem = (name, category) => {
    const exists = pantryItems.some(i => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast(`"${name}" is already in your pantry!`, 'warning');
      return;
    }
    const newItem = { id: Date.now().toString(), name, category };
    setPantryItems(prev => [...prev, newItem]);
    showToast(`Added "${name}" to pantry!`);
  };

  const handleRemoveItem = (id) => {
    const item = pantryItems.find(i => i.id === id);
    setPantryItems(prev => prev.filter(i => i.id !== id));
    if (item) showToast(`Removed "${item.name}"`);
  };

  const handleClearCategory = (categoryId) => {
    setPantryItems(prev => prev.filter(i => i.category !== categoryId));
    showToast(`Cleared category items`);
  };

  const handleClearAll = () => {
    setPantryItems([]);
    showToast(`Cleared entire pantry`, 'warning');
  };

  const handleResetPantry = () => {
    setPantryItems(INITIAL_PANTRY_ITEMS);
    showToast(`Reset pantry to default staples!`);
  };

  // Bookmark Toggle
  const handleToggleBookmark = (mealId) => {
    setBookmarkedMeals(prev => {
      const active = prev.includes(mealId);
      if (active) {
        showToast('Meal removed from bookmarks');
        return prev.filter(id => id !== mealId);
      } else {
        showToast('Meal saved to bookmarks!');
        return [...prev, mealId];
      }
    });
  };

  // Generate Meal Plan Action
  const handleGeneratePlan = async (isInitial = false) => {
    setIsLoading(true);
    try {
      const plan = await generateMealPlanWithAI({
        pantryItems,
        duration,
        dietPreference,
        strictness,
        targetCalories,
        targetProtein,
        apiKey
      });

      setMealPlan(plan);

      if (!isInitial) {
        showToast(`Successfully generated ${duration}-Day Meal Chart!`);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {
          // Fallback if confetti fails
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating meal plan. Please check settings.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract total count of missing ingredients across current plan
  const countMissingIngredients = () => {
    if (!mealPlan || !mealPlan.days) return 0;
    const set = new Set();
    mealPlan.days.forEach(d => {
      d.meals.forEach(m => {
        m.missingIngredients?.forEach(i => set.add(i));
      });
    });
    return set.size;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16">
      
      {/* Sticky Header Navbar */}
      <Header
        pantryCount={pantryItems.length}
        missingCount={countMissingIngredients()}
        duration={duration}
        targetCalories={targetCalories}
        targetProtein={targetProtein}
        onOpenGroceryDrawer={() => setIsGroceryDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetPantry={handleResetPantry}
        hasApiKey={!!apiKey}
      />

      {/* Hero Header Banner */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI Kitchen Inventory & Macro Engine
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Turn Kitchen Ingredients into <span className="text-emerald-400">Nutrient-Balanced</span> Meals
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Input what you have in your fridge & pantry. SmartPantry Chef creates complete calorie & macro calculated breakfast, lunch, dinner, and snacks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleGeneratePlan(false)}
              disabled={isLoading}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <ChefHat className="w-5 h-5" /> Quick Regenerate
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 z-10 w-full space-y-8">
        
        {/* Section 1 & 2: Pantry Manager & Plan Config Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Kitchen Inventory (7 cols) */}
          <div className="lg:col-span-7">
            <PantryManager
              pantryItems={pantryItems}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onClearCategory={handleClearCategory}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Right Column: Meal Config Controls (5 cols) */}
          <div className="lg:col-span-5">
            <PlanConfig
              duration={duration}
              setDuration={setDuration}
              dietPreference={dietPreference}
              setDietPreference={setDietPreference}
              strictness={strictness}
              setStrictness={setStrictness}
              targetCalories={targetCalories}
              setTargetCalories={setTargetCalories}
              targetProtein={targetProtein}
              setTargetProtein={setTargetProtein}
              onGenerate={() => handleGeneratePlan(false)}
              isLoading={isLoading}
            />
          </div>

        </div>

        {/* Section 3: Nutrient Summary Bar */}
        {mealPlan && (
          <NutritionSummary
            summary={mealPlan.summary}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
          />
        )}

        {/* Section 4: Meal Schedule Cards (1-Day or 7-Day View) */}
        {mealPlan && (
          <div className="space-y-4">
            <MealScheduleCard
              plan={mealPlan}
              bookmarkedMeals={bookmarkedMeals}
              onToggleBookmark={handleToggleBookmark}
            />
          </div>
        )}

      </main>

      {/* Slide-Over Missing Groceries Drawer */}
      <GroceryDrawer
        isOpen={isGroceryDrawerOpen}
        onClose={() => setIsGroceryDrawerOpen(false)}
        plan={mealPlan}
      />

      {/* Settings Modal (Gemini API Config) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={(key) => {
          setApiKey(key);
          showToast(key ? 'Gemini API Key saved!' : 'Gemini API Key removed');
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>SmartPantry Chef • Zero Waste AI Kitchen Inventory Manager & Macro Planner</p>
      </footer>

    </div>
  );
}
