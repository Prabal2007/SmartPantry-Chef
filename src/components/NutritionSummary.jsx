import React from 'react';
import { Flame, Dumbbell, Wheat, Droplet, TrendingUp, Info } from 'lucide-react';

export default function NutritionSummary({
  summary,
  targetCalories = 2000,
  targetProtein = 75,
  targetCarbs = 250,
  targetFats = 65
}) {
  if (!summary) return null;

  const calPct = Math.min(100, Math.round((summary.totalCalories / targetCalories) * 100));
  const protPct = Math.min(100, Math.round((summary.totalProtein / targetProtein) * 100));
  const carbPct = Math.min(100, Math.round((summary.totalCarbs / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((summary.totalFats / targetFats) * 100));

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 sm:p-7 space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daily Nutrient Summary</h2>
            <p className="text-xs text-slate-500">Estimated daily macro average vs standard RDA recommended baseline.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <Info className="w-4 h-4" /> RDA baseline standard
        </div>
      </div>

      {/* 4 Nutrient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Calories Card */}
        <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-200/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-600" /> Calories
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
              {calPct}% Target
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{summary.totalCalories}</span>
            <span className="text-xs text-slate-500 font-medium">/ {targetCalories} kcal</span>
          </div>

          <div className="w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${calPct}%` }}
            ></div>
          </div>
        </div>

        {/* Protein Card */}
        <div className="bg-gradient-to-br from-rose-50/80 to-rose-100/40 border border-rose-200/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-rose-600" /> Protein
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
              {protPct}% Target
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{summary.totalProtein}g</span>
            <span className="text-xs text-slate-500 font-medium">/ {targetProtein}g</span>
          </div>

          <div className="w-full bg-rose-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-rose-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${protPct}%` }}
            ></div>
          </div>
        </div>

        {/* Carbohydrates Card */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 border border-emerald-200/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Wheat className="w-4 h-4 text-emerald-600" /> Carbs
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              {carbPct}% Target
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{summary.totalCarbs}g</span>
            <span className="text-xs text-slate-500 font-medium">/ {targetCarbs}g</span>
          </div>

          <div className="w-full bg-emerald-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${carbPct}%` }}
            ></div>
          </div>
        </div>

        {/* Healthy Fats Card */}
        <div className="bg-gradient-to-br from-sky-50/80 to-sky-100/40 border border-sky-200/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-sky-600" /> Fats
            </span>
            <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
              {fatPct}% Target
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{summary.totalFats}g</span>
            <span className="text-xs text-slate-500 font-medium">/ {targetFats}g</span>
          </div>

          <div className="w-full bg-sky-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-sky-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${fatPct}%` }}
            ></div>
          </div>
        </div>

      </div>

    </div>
  );
}
