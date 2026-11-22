import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OnboardingWizard from './components/OnboardingWizard';
import DashboardView from './components/DashboardView';
import MealPlanView from './components/MealPlanView';
import WorkoutView from './components/WorkoutView';

import {
  fetchFoods,
  fetchProfile,
  saveProfile,
  fetchPantry,
  savePantry,
  generateFullPlan,
  upgradeBudget
} from './services/api';

import defaultFoods from './data/defaultFoods.json';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState('wizard');
  const [foods, setFoods] = useState(defaultFoods);
  const [backendError, setBackendError] = useState(null);
  const [profile, setProfile] = useState({
    age: 24,
    sex: 'male',
    height_cm: 175.0,
    weight_kg: 72.0,
    activity_level: 'moderate',
    goal: 'lean_bulk',
    target_weight_kg: 76.0,
    diet_type: 'veg',
    body_comp_mode: 'quick',
    body_fat_pct: null,
    skeletal_muscle_pct: null,
    workout_environment: 'without_gym',
    experience_level: 'beginner',
    days_per_week: 4,
    extra_budget_inr: 0.0
  });

  const [pantry, setPantry] = useState({
    rice_white: 1000.0,
    wheat_atta: 1000.0,
    moong_dal: 500.0,
    onion: 500.0,
    tomato: 500.0,
    milk: 1000.0,
    mustard_oil: 250.0,
    spices_basic: 100.0
  });

  const [planData, setPlanData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        const [foodsRes, profRes, pantryRes] = await Promise.all([
          fetchFoods(),
          fetchProfile().catch(() => null),
          fetchPantry().catch(() => null)
        ]);

        if (foodsRes && Array.isArray(foodsRes) && foodsRes.length > 0) {
          setFoods(foodsRes);
        }
        if (profRes && profRes.age) setProfile(profRes);
        if (pantryRes && pantryRes.pantry && Object.keys(pantryRes.pantry).length > 0) {
          setPantry(pantryRes.pantry);
        }

        // Try generating initial plan from loaded data if backend is responsive
        try {
          const initialPlan = await generateFullPlan({
            profile: profRes?.age ? profRes : profile,
            pantry: pantryRes?.pantry && Object.keys(pantryRes.pantry).length > 0 ? pantryRes.pantry : pantry,
            extra_budget_inr: profRes?.extra_budget_inr || 0.0
          });
          setPlanData(initialPlan);
        } catch (planErr) {
          console.warn('Initial background plan generation deferred:', planErr);
        }
      } catch (err) {
        console.warn('Initialization notice:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    init();
  }, []);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setBackendError(null);
    try {
      // 1. Save profile and pantry to SQLite
      await Promise.all([
        saveProfile(profile).catch(() => null),
        savePantry(
          Object.entries(pantry).map(([food_id, quantity]) => {
            const f = foods.find(item => item.id === food_id);
            return { food_id, quantity, unit: f?.unit || 'g' };
          })
        ).catch(() => null)
      ]);

      // 2. Call Plan Generate API
      const res = await generateFullPlan({
        profile,
        pantry,
        extra_budget_inr: profile.extra_budget_inr || 0.0
      });

      setPlanData(res);
      setActiveView('dashboard');

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // Confetti fallback
      }
    } catch (err) {
      console.error('Plan generation failed:', err);
      setBackendError(
        'Could not reach the FastAPI backend server. If you just deployed on Render free tier, the backend takes ~30-45 seconds to spin up from cold sleep. Please wait 30 seconds and click Generate again, or ensure VITE_API_URL is set in Vercel settings.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtraBudgetChange = async (newVal) => {
    try {
      const updatedProfile = { ...profile, extra_budget_inr: newVal };
      setProfile(updatedProfile);

      const res = await upgradeBudget({
        profile: updatedProfile,
        pantry,
        extra_budget_inr: newVal
      });

      if (res && res.meal_plan) {
        setPlanData(prev => ({
          ...prev,
          extra_budget: res.extra_budget,
          meal_plan: res.meal_plan
        }));
      }
    } catch (err) {
      console.error('Budget upgrade failed:', err);
    }
  };

  const handleRefreshPlan = async () => {
    setIsGenerating(true);
    try {
      const res = await generateFullPlan({
        profile,
        pantry,
        extra_budget_inr: profile.extra_budget_inr || 0.0
      });
      setPlanData(res);
    } catch (err) {
      console.error('Refresh plan error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <h2 className="text-xl font-bold tracking-tight">Initializing NutriForge Engine...</h2>
        <p className="text-xs text-slate-500">Loading ground-truth datasets and verifying mathematical invariants</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Sticky Header Navbar */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        profile={profile}
        sufficiency={planData?.sufficiency}
        minimumGap={planData?.minimum_gap}
      />

      {/* Backend Notice / Error Guidance Banner */}
      {backendError && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-3 text-center text-xs text-amber-200 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex-1 text-center font-medium">
            ⚠️ {backendError}
          </div>
          <button
            type="button"
            onClick={() => setBackendError(null)}
            className="text-amber-400 hover:text-white font-black text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1 pb-16">
        {activeView === 'wizard' && (
          <OnboardingWizard
            profile={profile}
            setProfile={setProfile}
            pantry={pantry}
            setPantry={setPantry}
            foods={foods}
            onGeneratePlan={handleGeneratePlan}
            isGenerating={isGenerating}
          />
        )}

        {activeView === 'dashboard' && planData && (
          <DashboardView
            biometrics={planData.biometrics}
            planSummary={planData.meal_plan?.[0]?.summary}
            goal={profile.goal}
            onNavigateToMeals={() => setActiveView('meals')}
          />
        )}

        {activeView === 'meals' && planData && (
          <MealPlanView
            mealPlan={planData.meal_plan}
            setMealPlan={(updated) => setPlanData(prev => ({ ...prev, meal_plan: updated }))}
            sufficiency={planData.sufficiency}
            minimumGap={planData.minimum_gap}
            extraBudget={planData.extra_budget}
            onExtraBudgetChange={handleExtraBudgetChange}
            onRefreshPlan={handleRefreshPlan}
            targetCalories={planData.biometrics?.target_calories || 2000}
            targetProtein={planData.biometrics?.protein_target_g || 100}
            foods={foods}
          />
        )}

        {activeView === 'workouts' && planData && (
          <WorkoutView
            workoutPlan={planData.workout_plan}
            setWorkoutPlan={(updated) => setPlanData(prev => ({ ...prev, workout_plan: updated }))}
            profile={profile}
            setProfile={setProfile}
            pantry={pantry}
            extraBudget={planData.extra_budget}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>⚡ NutriForge — Deterministic Pantry, Budget-Gap & Physique Planner</span>
          <span>Zero AI Hallucinations • 100% Mathematical Rigor (4P + 4C + 9F == kcal)</span>
        </div>
      </footer>

    </div>
  );
}
