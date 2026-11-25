# NutriForge — From Kitchen Inventory to Target Build
## A Deterministic Pantry Meal-Prep, Budget-Gap & Physique Planner

---

## SLIDE 1: NutriForge — From Kitchen Inventory to Target Build
### A Deterministic Pantry Meal-Prep, Budget-Gap & Physique Planner

* **Core Purpose:**  
  Eliminates AI calorie hallucinations, wasted groceries, and unrealistic fitness plans by pairing real kitchen inventory with exact nutrition math, daily market pricing, and adaptable workouts.
* **Built For:**  
  Students, home cooks, and fitness beginners/intermediates using practical Indian household staples (Veg, Eggetarian, and Non-Veg).
* **The 5-Stage User Journey:**  
  * **01:** Profile & Body Composition  
  * **02:** Pantry Audit & Budget-Gap Optimizer  
  * **03:** Live Pricing & 7-Day Meal Timetable  
  * **04:** Gym or Home Workout Planner  
  * **05:** Physique Roadmap & Weekly Check-Ins  

---

## SLIDE 2: Step 1 — Smart Onboarding & 3-Tier Body Composition
### Accurate Calorie & Macro Targets Without Guesswork

* **Guided Setup:**  
  Users enter age, sex, height, weight, activity level, diet type (Veg / Eggetarian / Non-Veg), target weight, and goal (Fat Loss Cut, Lean Bulk, or Body Recomposition).
* **3-Tier Body Composition Options (User Picks Their Comfort Level):**
  * **Tier 1 — Quick Mode (Default):**  
    Uses Mifflin-St Jeor TDEE equations paired with 4 visual current-build reference cards.
  * **Tier 2 — Smart Tape-Measure ML Model:**  
    Optional waist, hip, and arm inputs sent to a Python regression model (trained on CDC NHANES DEXA schema) returning predicted Body Fat %, Lean Body Mass, Skeletal Muscle %, and an honest confidence range.
  * **Tier 3 — Machine Scan Import:**  
    Direct InBody or DEXA input that upgrades BMR math to Katch-McArdle using Lean Body Mass (strictly separated from Skeletal Muscle Mass) for accurate protein targets.
* **Outcome:**  
  Automatically sets safe daily calories, protein, carbs, fats, and realistic weekly weight-change bounds.

---

## SLIDE 3: Step 2 — Pantry Sufficiency Audit & Budget-Gap Optimizer
### Cook What You Own First, or Invest the Exact Minimum Needed

* **Quantity-Based Pantry Intake:**  
  Users log real available quantities (grams, kg, liters, pieces) across 5 categories: Vegetables, Fruits, Proteins & Legumes, Grains & Carbs, and Dairy & Fats—with a one-click Student Kitchen Preset for instant setup.
* **5-Gate Weekly Sufficiency Check:**  
  Automatically audits whether current stock meets at least 90% of weekly protein and calorie needs, 14 vegetable servings, 7 fruit servings, and valid cookable meals.
* **Branch A — Pantry Sufficient (Rs. 0 Extra):**  
  Unlocks a zero-waste 7-day meal plan built exclusively from owned ingredients with zero phantom items.
* **Branch B — Stock Deficient (2-Step Investment Prompt):**
  * **Step 1 (Minimum Gap Cart):** Computes exact shortfalls and builds the cheapest shopping list ranked by lowest cost per gram of protein and produce serving.
  * **Step 2 (Extra-Budget Variety Slider):** Asks how much more the user can invest (+Rs. 0 to +Rs. 1,500) and dynamically unlocks tastier mid/premium staples and new dishes in real time.

---

## SLIDE 4: Step 3 — Automatic Daily Pricing & Interactive 7-Day Meal Timetable
### Real Indian Staples, Live Market Rates & One-Tap Cooking Guides

* **3-Layer Automated Pricing Engine:**
  * **Daily Mandi Sync:** Background scheduler updates volatile produce/pulse prices daily at 2:30 PM IST from India's AGMARKNET feed with median filtering and a +/- 50% outlier sanity guard.
  * **Inline Local Price Overrides:** Users can edit any item's local shop price directly in the shopping list, instantly recalculating their gap cart and unlocked dishes, or click "Check Live" to search online grocery stores.
  * **Honest Cost Ranges:** Displays transparent +/- 5% bill estimates with live source badges (Mandi Live, Custom, or Retail Baseline).
* **Interactive 7-Day Meal Timetable (45+ Staples, 35+ Hardcoded Dishes):**
  * Every meal enforces exact macro math ($4\text{P} + 4\text{C} + 9\text{F} = \text{Calories}$) with zero AI-invented recipes.
  * **Live Controls:** Swap any meal from cookable alternatives, adjust serving multipliers (0.75x to 1.5x), deduct cooked meals from pantry stock, and open YouTube Video Recipe or Written Recipe links right from every meal card.

---

## SLIDE 5: Step 4 — Adaptive Gym & Home Workout Timetable
### Structured Progressive Overload—With or Without Equipment

* **Instant Gym vs. Home Switcher:**  
  Users toggle between **With Gym** (barbell, dumbbell, cable compounds) and **Without Gym / Home** (push-up variations, backpack rows, Bulgarian split squats, chair dips, core work) at any time without losing their diet plan.
* **Goal-Matched Weekly Splits (45+ Exercises):**  
  Adapts to 3, 4, 5, or 6 days/week (Full Body, Upper/Lower, Push/Pull/Legs) with tailored sets, rep ranges, rest timers, and weekly progression cues.
* **Actionable Daily Execution:**  
  Every exercise card includes daily completion checkboxes to track workouts and a one-tap **Watch Form Guide** YouTube tutorial link so beginners always lift safely with proper form.

---

## SLIDE 6: Step 5 — Physique Roadmap, Real Check-Ins & Adaptive Loop
### Turning Weekly Reality Into Continuous Progress

* **Accurate Projected Weight Curve:**  
  Plots a monotonic weekly roadmap anchored at the user's starting weight (using the 7,700 kcal per kg energy model) that cleanly clamps at the target weight with zero overshoot.
* **Honest Nutrition Dashboard:**  
  Tracks daily calories, protein, carbs, fats, fiber, and daily veg/fruit servings—explicitly flagging overshoots (e.g., 144% / +33g over) instead of hiding them behind capped 100% bars.
* **Real Weekly Weight Check-Ins & Auto-Adjustment:**  
  Users log exact morning weights stored in SQLite (with full edit/delete control, zero fake/random data). If real weight stalls for 2 consecutive weeks, the engine automatically nudges daily calories by +/- 150 kcal to restart progress.
* **Built With:**  
  React, Vite, Tailwind CSS, Recharts | Python FastAPI, SQLite, APScheduler, pytest | NHANES ML Pipeline & AGMARKNET Live Feeds.
