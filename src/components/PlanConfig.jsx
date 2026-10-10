import React from 'react';
import { Calendar, Sliders, ShieldCheck, Sparkles, Loader2, Target, Flame } from 'lucide-react';

export default function PlanConfig({
  duration,
  setDuration,
  dietPreference,
  setDietPreference,
  strictness,
  setStrictness,
  targetCalories,
  setTargetCalories,
  targetProtein,
  setTargetProtein,
  onGenerate,
  isLoading
}) {
  const DIET_OPTIONS = [
    { id: 'Balanced', label: 'Balanced', desc: 'Equal macros & nutrient variety', icon: '🥗' },
    { id: 'Vegetarian', label: 'Vegetarian', desc: 'No meat or fish', icon: '🥕' },
    { id: 'High-Protein', label: 'High-Protein', desc: 'Maximizes protein intake', icon: '🍗' },
    { id: 'Vegan', label: 'Vegan', desc: '100% plant-based items', icon: '🌱' },
    { id: 'Low-Carb', label: 'Low-Carb', desc: 'Reduced carbs, higher fats', icon: '🥑' },
    { id: 'Non-Vegetarian', label: 'Non-Veg', desc: 'Includes chicken, fish & eggs', icon: '🥩' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 sm:p-7 space-y-6">
      
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Meal Plan Configuration</h2>
            <p className="text-xs text-slate-500">Tune your target duration, diet preferences, and pantry strictness.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Duration Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> Planning Duration
          </label>
          
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setDuration(1)}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                duration === 1
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚡ 1 Day Quick Plan</span>
              <span className="text-[10px] font-medium text-slate-400">Instant Daily Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setDuration(7)}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                duration === 7
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📅 7-Day Weekly Chart</span>
              <span className="text-[10px] font-medium text-slate-400">Full Week Meal Prep</span>
            </button>
          </div>
        </div>

        {/* 2. Pantry Strictness Toggle */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pantry Strictness
          </label>

          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setStrictness('strict')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                strictness === 'strict'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1 text-emerald-700">
                🔒 Strict Pantry Only
              </div>
              <p className="text-[10px] font-normal text-slate-500 mt-0.5">Zero new groceries needed</p>
            </button>

            <button
              type="button"
              onClick={() => setStrictness('flexible')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                strictness === 'flexible'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1 text-amber-700">
                ✨ Flexible Mode
              </div>
              <p className="text-[10px] font-normal text-slate-500 mt-0.5">Allow 2-3 missing staples</p>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Dietary Preference Grid */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Dietary Preference
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DIET_OPTIONS.map((opt) => {
            const active = dietPreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDietPreference(opt.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  active
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-xl mb-1">{opt.icon}</div>
                <div>
                  <div className={`text-xs font-bold ${active ? 'text-emerald-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Nutritional Target Adjustment Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
        
        {/* Calorie Target Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Daily Target Calories:
            </span>
            <span className="font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border text-xs">
              {targetCalories} kcal
            </span>
          </div>
          <input
            type="range"
            min="1200"
            max="3500"
            step="50"
            value={targetCalories}
            onChange={(e) => setTargetCalories(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Protein Target Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-sky-500" /> Daily Target Protein:
            </span>
            <span className="font-extrabold text-sky-700 bg-white px-2 py-0.5 rounded-lg border text-xs">
              {targetProtein} g
            </span>
          </div>
          <input
            type="range"
            min="40"
            max="180"
            step="5"
            value={targetProtein}
            onChange={(e) => setTargetProtein(Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer"
          />
        </div>

      </div>

      {/* Primary CTA Call To Action Button */}
      <div className="pt-2">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all transform active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Pantry & Synthesizing AI Meal Chart...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
              <span>Generate Nutritious {duration}-Day Meal Chart</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
