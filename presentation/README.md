# 📊 NutriForge — Project Presentation Deck
> **Course:** Software Engineering (B.Tech 2nd Year / Sem-3)  
> **Direct Downloads:** [Download PowerPoint (.pptx)](./NutriForge_Presentation.pptx) &bull; [View/Download Presentation (PDF)](./NutriForge_Presentation.pdf)  
> **Live Web Application:** [https://smart-pantry-chef-tau.vercel.app/](https://smart-pantry-chef-tau.vercel.app/)  

---

## 🖼️ Slide 1: NutriForge — From Kitchen Inventory to Target Build
### *A Deterministic Pantry Meal-Prep, Budget-Gap & Physique Planner*

* **🎯 Core Purpose:**  
  Eliminates AI calorie hallucinations, wasted groceries, and unrealistic fitness plans by pairing real kitchen inventory with exact nutrition math, daily market pricing, and adaptable workouts.
* **👥 Built For:**  
  Students, home cooks, and fitness beginners/intermediates using practical Indian household staples (Veg, Eggetarian, and Non-Veg).
* **🛡️ Non-Negotiable Engineering Invariants:**
  * **Zero LLM Hallucinations:** Every dish, macro, and price is strictly drawn from verified structured JSON datasets.
  * **Strict Atwater Identity:** Calories across all dishes and summaries strictly equal `4P + 4C + 9F`.
  * **Zero Phantom Ingredients:** Dishes only use ingredients present in `UserPantry ∪ MinimumGapCart ∪ ExtraBudgetCart`.

### 🗺️ The 5-Stage User Journey
| Stage 01 | Stage 02 | Stage 03 | Stage 04 | Stage 05 |
| :---: | :---: | :---: | :---: | :---: |
| **Profile & Body Comp** | **Pantry Audit & Gap** | **Live Pricing & Meals** | **Gym / Home Split** | **Roadmap & Check-Ins** |
| Guided setup & ML body fat | 5-gate audit & ₹0 extra / gap cart | Daily Mandi sync & 7-day plan | With/Without Gym splits | 52-wk curve & stall detector |

---

## 🖼️ Slide 2: Step 1 — Smart Onboarding & 3-Tier Body Composition
### *Accurate Calorie & Macro Targets Without Guesswork*

* **📋 Guided Setup:**  
  Users enter age, sex, height, weight, activity level, diet type (Veg / Eggetarian / Non-Veg), target weight, and goal (Fat Loss Cut, Lean Bulk, or Body Recomposition).

* **⚙️ 3-Tier Body Composition Options (User Picks Their Comfort Level):**
  * **Tier 1 — Quick Mode (Default):** Uses Mifflin-St Jeor TDEE equations paired with 4 visual current-build reference cards.
  * **Tier 2 — Smart Tape-Measure ML Model:** Optional waist, hip, and arm inputs sent to a Python `GradientBoostingRegressor` (trained on CDC NHANES DEXA schema) returning predicted Body Fat %, Lean Body Mass (LBM), Skeletal Muscle % (SMM), and an honest confidence range (MAE ±2.1%).
  * **Tier 3 — Machine Scan Import:** Direct InBody or DEXA input upgrading BMR math to Katch-McArdle using Lean Body Mass (strictly separated from SMM) for accurate protein targets.

> **✅ Outcome:** Automatically sets safe daily calories, protein, carbs, fats, and realistic weekly weight-change bounds.

---

## 🖼️ Slide 3: Step 2 — Pantry Sufficiency Audit & Budget-Gap Optimizer
### *Cook What You Own First, or Invest the Exact Minimum Needed*

* **📦 Quantity-Based Pantry Intake:**  
  Users log real available quantities (grams, kg, liters, pieces) across 5 categories: Vegetables, Fruits, Proteins & Legumes, Grains & Carbs, and Dairy & Fats—with a **one-click Student Kitchen Preset** for instant setup.
* **🔍 5-Gate Weekly Sufficiency Check:**
  * **Gate 1:** Protein $\ge 90\%$ weekly target
  * **Gate 2:** Calories $\ge 90\%$ weekly target
  * **Gate 3:** Vegetables $\ge 1400\text{g}$ (14 servings)
  * **Gate 4:** Fruits $\ge 7\text{ servings}$
  * **Gate 5:** Cookable dish available for all 4 slots (Breakfast, Lunch, Snack, Dinner)

### 🌿 Dual-Branch Decision Model:
* **Branch A — Pantry Sufficient (₹0 Extra):**  
  Unlocks a zero-waste 7-day meal plan built exclusively from owned ingredients with zero phantom items.
* **Branch B — Stock Deficient (2-Step Investment Prompt):**
  * **Step 1 (Minimum Gap Cart):** Computes exact shortfalls and builds the cheapest shopping list ranked by lowest cost per gram of protein and produce serving.
  * **Step 2 (Extra-Budget Variety Slider):** Asks how much more the user can invest (+₹0 to +₹1,500) and dynamically unlocks tastier staples (paneer, curd, peanut butter) and new dishes in real time.

---

## 🖼️ Slide 4: Step 3 — Automatic Daily Pricing & 7-Day Meal Timetable
### *Real Indian Staples, Live Market Rates & One-Tap Cooking Guides*

* **🏷️ 3-Layer Automated Pricing Engine:**
  * **Daily Mandi Sync:** Background APScheduler updates volatile produce/pulse prices daily at 2:30 PM IST from India's AGMARKNET feed with median filtering and a ±50% outlier sanity guard.
  * **Inline Local Price Overrides:** Users can edit any item's local shop price directly in the shopping list, instantly recalculating their gap cart and unlocked dishes.
  * **Honest Cost Ranges:** Displays transparent ±5% bill estimates with live source badges (`Mandi Live`, `Custom`, or `Retail Baseline`).

* **🍲 Interactive 7-Day Meal Timetable (45+ Staples, 35+ Hardcoded Dishes):**
  * Every meal enforces exact macro math ($4\text{P} + 4\text{C} + 9\text{F} = \text{Calories}$) with zero AI-invented recipes.
  * **Live User Controls:** Swap any meal from cookable alternatives, adjust serving multipliers (0.75x to 1.5x), deduct cooked meals from pantry stock, and open YouTube Video Recipe or Written Recipe links directly on every meal card.

---

## 🖼️ Slide 5: Step 4 — Adaptive Gym & Home Workout Timetable
### *Structured Progressive Overload—With or Without Equipment*

* **🔄 Instant Gym vs. Home Switcher:**  
  Users toggle between **With Gym** (barbell, dumbbell, cable compounds) and **Without Gym / Home** (push-up variations, backpack rows, Bulgarian split squats, chair dips, core work) at any time without losing their diet plan.
* **📅 Goal-Matched Weekly Splits (45+ Curated Exercises):**  
  Adapts to 3, 4, 5, or 6 days/week (Full Body, Upper/Lower, Push/Pull/Legs) with tailored sets, rep ranges, rest timers, and weekly progression cues.
* **✅ Actionable Daily Execution:**  
  Every exercise card includes **daily completion checkboxes** to track workouts and a one-tap **Watch Form Guide** YouTube tutorial link so beginners always lift safely with proper form.

---

## 🖼️ Slide 6: Step 5 — Physique Roadmap, Real Check-Ins & Adaptive Loop
### *Turning Weekly Reality Into Continuous Progress*

* **📈 Accurate Projected Weight Curve:**  
  Plots a monotonic weekly roadmap anchored at user's starting weight (using the 7,700 kcal per kg energy model) that cleanly clamps at target weight with zero overshoot.
* **📊 Honest Nutrition Dashboard:**  
  Tracks daily calories, protein, carbs, fats, fiber, and veg/fruit servings—explicitly flagging overshoots (e.g. `144% / +33g over`) instead of hiding them behind capped 100% bars.
* **⚖️ Real Weekly Check-Ins & Auto-Adjustment:**  
  Logs exact morning weights in SQLite. If real weight stalls for 2 consecutive weeks, the engine automatically nudges daily calories by **±150 kcal** to restart progress.

---

### 💻 Technology Stack
* **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide React
* **Backend:** Python 3.11, FastAPI, SQLite (SQLAlchemy), APScheduler, pytest
* **Data & ML:** CDC NHANES Regressor Pipeline (`joblib`) & AGMARKNET Government API
