import React from 'react';
import { Utensils, ShoppingBag, Settings, Sparkles, RefreshCw, ChefHat } from 'lucide-react';

export default function Header({
  pantryCount,
  missingCount,
  duration,
  targetCalories,
  targetProtein,
  onOpenGroceryDrawer,
  onOpenSettings,
  onResetPantry,
  hasApiKey
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white transform hover:scale-105 transition-all">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-slate-900 via-emerald-950 to-emerald-800 bg-clip-text text-transparent">
                  SmartPantry Chef
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> AI-Powered
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Zero Waste Kitchen & Macro-Balanced Meal Planner
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Pantry:</span>
              <strong className="text-slate-900 font-bold">{pantryCount} items</strong>
            </div>

            <div className="h-4 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Mode:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                {duration === 7 ? '7-Day Plan' : '1-Day Plan'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>RDA Target:</span>
              <strong className="text-slate-900 font-bold">{targetCalories} kcal / {targetProtein}g P</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Missing Groceries Drawer Button */}
            <button
              onClick={onOpenGroceryDrawer}
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
              title="View Missing Ingredients Shopping List"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Grocery List</span>
              {missingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
                  {missingCount}
                </span>
              )}
            </button>

            {/* AI Settings Modal Button */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                hasApiKey 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Configure Gemini API Settings"
            >
              <Settings className={`w-4 h-4 ${hasApiKey ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden md:inline">{hasApiKey ? 'Gemini AI Active' : 'AI Settings'}</span>
            </button>

            {/* Reset Pantry Button */}
            <button
              onClick={onResetPantry}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Reset Pantry to Default Staples"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
