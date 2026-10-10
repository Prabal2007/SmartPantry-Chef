import React, { useState } from 'react';
import { Clock, Flame, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Bookmark, Lightbulb, ChefHat, Copy, Check } from 'lucide-react';

export default function MealScheduleCard({
  plan,
  bookmarkedMeals = [],
  onToggleBookmark
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  if (!plan || !plan.days || plan.days.length === 0) return null;

  const currentDay = plan.days.find(d => d.dayIndex === selectedDayIndex) || plan.days[0];

  const handleCopyRecipe = (meal) => {
    const text = `${meal.title} (${meal.type})
Prep Time: ${meal.prepTime} | Calories: ${meal.calories} kcal
Macros: P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fats}g

Ingredients Used: ${meal.ingredientsUsed.join(', ')}
${meal.missingIngredients?.length ? `Missing Staples: ${meal.missingIngredients.join(', ')}` : ''}

Instructions:
${meal.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Chef Tip: ${meal.chefTip || 'Enjoy!'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(meal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSlotColor = (type) => {
    switch (type) {
      case 'Breakfast': return 'bg-amber-500 text-white';
      case 'Lunch': return 'bg-emerald-600 text-white';
      case 'Dinner': return 'bg-indigo-600 text-white';
      case 'Snack': return 'bg-rose-500 text-white';
      default: return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 7-Day / 1-Day Horizontal Day Tab Bar */}
      {plan.days.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {plan.days.map((day) => {
              const active = day.dayIndex === selectedDayIndex;
              return (
                <button
                  key={day.dayIndex}
                  onClick={() => setSelectedDayIndex(day.dayIndex)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex flex-col items-center min-w-[100px] ${
                    active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <span>Day {day.dayIndex}</span>
                  <span className={`text-[10px] font-medium ${active ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {day.dailyMacros?.calories || 0} kcal
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Title & Day Macros Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-5 rounded-3xl shadow-md">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Active Schedule View
          </span>
          <h2 className="text-2xl font-extrabold">{currentDay.dayName}</h2>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-2xl">
          <div>
            <span className="text-slate-400">Calories: </span>
            <strong className="text-white font-bold">{currentDay.dailyMacros?.calories} kcal</strong>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>
          <div>
            <span className="text-slate-400">Protein: </span>
            <strong className="text-emerald-400 font-bold">{currentDay.dailyMacros?.protein}g</strong>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>
          <div>
            <span className="text-slate-400">Carbs: </span>
            <strong className="text-amber-400 font-bold">{currentDay.dailyMacros?.carbs}g</strong>
          </div>
        </div>
      </div>

      {/* Meal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {currentDay.meals.map((meal) => {
          const isExpanded = expandedMealId === meal.id;
          const isBookmarked = bookmarkedMeals.includes(meal.id);

          return (
            <div
              key={meal.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                
                {/* Card Top Header */}
                <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${getSlotColor(meal.type)}`}>
                        {meal.type}
                      </span>
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {meal.prepTime}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 leading-snug pt-1">
                      {meal.title}
                    </h3>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => onToggleBookmark(meal.id)}
                    className={`p-2 rounded-xl border transition-all ${
                      isBookmarked
                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                    title={isBookmarked ? 'Remove Bookmark' : 'Save Meal'}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Macro Badges Bar */}
                <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-bold text-slate-800">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{meal.calories} kcal</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-100">
                      P: {meal.protein}g
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                      C: {meal.carbs}g
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-100">
                      F: {meal.fats}g
                    </span>
                  </div>
                </div>

                {/* Ingredients Used vs Missing Badges */}
                <div className="p-5 space-y-3">
                  
                  {/* Used Pantry Badges */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pantry Ingredients Used:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {meal.ingredientsUsed.map((ing, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Staples (if any) */}
                  {meal.missingIngredients && meal.missingIngredients.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Missing Grocery Staples:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {meal.missingIngredients.map((ing, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            + {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Collapsible Recipe Instructions & Chef Tip */}
              <div className="border-t border-slate-100 bg-slate-50/40">
                <button
                  onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                  className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-emerald-600" />
                    {isExpanded ? 'Hide Cooking Recipe' : 'View Step-by-Step Recipe'}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 animate-fadeIn">
                    
                    {/* Step-by-Step Instructions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Preparation Steps:
                      </h4>
                      <ol className="space-y-2 text-xs text-slate-700">
                        {meal.instructions.map((step, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Chef Tip Alert Box */}
                    {meal.chefTip && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                        <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Chef's Secret Tip: </strong>
                          <span>{meal.chefTip}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleCopyRecipe(meal)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        {copiedId === meal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Recipe!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy Recipe Text
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
