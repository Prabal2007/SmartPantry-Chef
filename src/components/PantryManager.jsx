import React, { useState } from 'react';
import { Plus, X, Trash2, Tag, Check, Sparkles, Filter } from 'lucide-react';
import { INGREDIENT_CATEGORIES } from '../data/presetIngredients';

export default function PantryManager({
  pantryItems,
  onAddItem,
  onRemoveItem,
  onClearCategory,
  onClearAll
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [customInput, setCustomInput] = useState('');
  const [selectedCategoryForInput, setSelectedCategoryForInput] = useState('carbs');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onAddItem(customInput.trim(), selectedCategoryForInput);
    setCustomInput('');
  };

  const isItemInPantry = (name) => {
    return pantryItems.some(item => item.name.toLowerCase() === name.toLowerCase());
  };

  const handleTogglePreset = (presetName, categoryId) => {
    const existing = pantryItems.find(item => item.name.toLowerCase() === presetName.toLowerCase());
    if (existing) {
      onRemoveItem(existing.id);
    } else {
      onAddItem(presetName, categoryId);
    }
  };

  const filteredPantryItems = activeCategory === 'all'
    ? pantryItems
    : pantryItems.filter(item => item.category === activeCategory);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 sm:p-7 space-y-6">
      
      {/* Title & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Tag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Kitchen Pantry Inventory</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select what you currently have in your kitchen to generate a zero-waste meal plan.
          </p>
        </div>

        {pantryItems.length > 0 && (
          <button
            onClick={onClearAll}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200/60"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Pantry ({pantryItems.length})
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" /> All Items ({pantryItems.length})
        </button>

        {INGREDIENT_CATEGORIES.map(cat => {
          const count = pantryItems.filter(i => i.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Add Preset Pills */}
      <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Quick Tap Popular Staples
          </span>
          {activeCategory !== 'all' && (
            <span className="text-xs text-slate-400 font-medium">
              Click pill to add or remove
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {INGREDIENT_CATEGORIES
            .filter(cat => activeCategory === 'all' || activeCategory === cat.id)
            .flatMap(cat => cat.presets.map(preset => ({ preset, categoryId: cat.id, categoryColor: cat.badgeBg })))
            .map(({ preset, categoryId, categoryColor }) => {
              const active = isItemInPantry(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleTogglePreset(preset, categoryId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  {active ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                  <span>{preset}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Custom Item Text Input */}
      <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type custom ingredient (e.g. Greek Yogurt, Chia Seeds)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          <select
            value={selectedCategoryForInput}
            onChange={(e) => setSelectedCategoryForInput(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {INGREDIENT_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </form>

      {/* Active Pantry Tags Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Pantry Badges ({filteredPantryItems.length})
          </h3>
          {activeCategory !== 'all' && filteredPantryItems.length > 0 && (
            <button
              onClick={() => onClearCategory(activeCategory)}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
            >
              Clear Category
            </button>
          )}
        </div>

        {filteredPantryItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-500">Your pantry is empty!</p>
            <p className="text-xs text-slate-400 mt-1">Tap the quick preset chips above or type custom items to start planning.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredPantryItems.map((item) => {
              const categoryObj = INGREDIENT_CATEGORIES.find(c => c.id === item.category);
              return (
                <span
                  key={item.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    categoryObj ? categoryObj.color : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <span>{categoryObj?.icon}</span>
                  <span>{item.name}</span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-0.5 rounded-md hover:bg-black/10 transition-colors ml-0.5"
                    title={`Remove ${item.name}`}
                  >
                    <X className="w-3.5 h-3.5 text-current opacity-70 hover:opacity-100" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
