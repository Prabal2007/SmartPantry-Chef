import React, { useState } from 'react';
import { ShoppingBag, X, CheckSquare, Square, Copy, Check, Trash2, ShoppingCart } from 'lucide-react';

export default function GroceryDrawer({
  isOpen,
  onClose,
  plan
}) {
  const [checkedItems, setCheckedItems] = useState([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Extract all missing ingredients across all days and meals in the plan
  const missingItemsMap = new Map();

  if (plan && plan.days) {
    plan.days.forEach(day => {
      day.meals.forEach(meal => {
        if (meal.missingIngredients && meal.missingIngredients.length > 0) {
          meal.missingIngredients.forEach(item => {
            const current = missingItemsMap.get(item) || [];
            current.push(`${day.dayName} (${meal.type})`);
            missingItemsMap.set(item, current);
          });
        }
      });
    });
  }

  const missingItemList = Array.from(missingItemsMap.entries()).map(([name, usedIn]) => ({
    name,
    usedIn
  }));

  const toggleCheck = (name) => {
    if (checkedItems.includes(name)) {
      setCheckedItems(checkedItems.filter(i => i !== name));
    } else {
      setCheckedItems([...checkedItems, name]);
    }
  };

  const handleCopyList = () => {
    if (missingItemList.length === 0) return;
    const text = `🛒 SmartPantry Chef - Missing Grocery Shopping List:\n\n` +
      missingItemList.map(item => `- [${checkedItems.includes(item.name) ? 'x' : ' '}] ${item.name}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Missing Groceries Drawer</h3>
                <p className="text-xs text-slate-500">Items needed to fulfill your active plan</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Missing Items List Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {missingItemList.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">No Missing Ingredients!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Your current pantry covers 100% of all recipes in your generated meal plan.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pb-2 border-b border-slate-100">
                  <span>{missingItemList.length} Items to Buy</span>
                  <span>{checkedItems.length} / {missingItemList.length} Completed</span>
                </div>

                <div className="space-y-2.5">
                  {missingItemList.map((item) => {
                    const isChecked = checkedItems.includes(item.name);
                    return (
                      <div
                        key={item.name}
                        onClick={() => toggleCheck(item.name)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-slate-50 border-slate-200 text-slate-400 line-through opacity-70'
                            : 'bg-white border-amber-200/80 shadow-sm text-slate-800 hover:border-amber-400'
                        }`}
                      >
                        <button className="mt-0.5 text-slate-400 hover:text-amber-600">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <Square className="w-5 h-5 text-amber-500" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="text-sm font-bold leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-medium">
                            Needed for: {item.usedIn.slice(0, 2).join(', ')} {item.usedIn.length > 2 ? `+${item.usedIn.length - 2} more` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer Action Buttons */}
          {missingItemList.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <button
                onClick={handleCopyList}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied Shopping List!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Shopping List to Clipboard
                  </>
                )}
              </button>

              {checkedItems.length > 0 && (
                <button
                  onClick={() => setCheckedItems([])}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Uncheck All Items
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
