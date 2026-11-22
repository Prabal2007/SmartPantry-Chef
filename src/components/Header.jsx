import React from 'react';
import { Flame, Dumbbell, UtensilsCrossed, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Header({
  activeView,
  setActiveView,
  profile,
  sufficiency,
  minimumGap
}) {
  const views = [
    { id: 'wizard', label: '1. Onboarding & Biometrics', icon: Dumbbell },
    { id: 'dashboard', label: '2. Roadmap & Macros', icon: Flame },
    { id: 'meals', label: '3. Pantry & Meal Timetable', icon: UtensilsCrossed },
    { id: 'workouts', label: '4. Workout Plan', icon: Calendar }
  ];

  const isSufficient = sufficiency?.is_sufficient;
  const gapCost = minimumGap?.min_gap_cost_inr || 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950 font-black text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-400 bg-clip-text text-transparent">
                  NutriForge
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  Deterministic
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Pantry, Budget-Gap & Physique Planner
              </p>
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            {profile && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <span className={`font-bold text-xs flex items-center gap-1 ${
                  profile.diet_type === 'veg' ? 'text-emerald-400' : profile.diet_type === 'eggetarian' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  <span>{profile.diet_type === 'veg' ? '🌱 Pure Veg' : profile.diet_type === 'eggetarian' ? '🥚 Veg + Eggs' : '🥩 Non-Veg'}</span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Goal:</span>
                <span className="font-bold uppercase text-amber-400 tracking-wide">
                  {profile.goal?.replace('_', ' ')}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300 font-medium">{profile.weight_kg}kg → {profile.target_weight_kg}kg</span>
              </div>
            )}

            {sufficiency && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold ${
                isSufficient
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              }`}>
                {isSufficient ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pantry 100% Sufficient (₹0)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Min Gap: ₹{gapCost}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation View Selector */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {views.map((v) => {
              const active = activeView === v.id;
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{v.label}</span>
                </button>
              );
            })}
          </nav>

        </div>
      </div>
    </header>
  );
}
