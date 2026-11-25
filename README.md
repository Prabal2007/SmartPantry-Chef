# ⚡ NutriForge — Deterministic Pantry, Budget-Gap & Physique Planner

**NutriForge** is a production-grade, mathematically rigorous web application that generates deterministic diet plans, pantry-gap investment recommendations, and Gym / Home workout timetables to guide a user to their target build.

> **Course Deliverables (B.Tech Sem-3 Software Engineering):**  
> 📊 **[View Presentation Deck Online (Slides 1–6)](./presentation/README.md)** &bull; 📥 **[Download PowerPoint (.pptx)](./presentation/NutriForge_Presentation.pptx)** &bull; 📄 **[Download Presentation (PDF)](./presentation/NutriForge_Presentation.pdf)** &bull; 📄 **[View IEEE-830 SRS Document (PDF)](./SRS/SRS.pdf)**

---

## 🛡️ Non-Negotiable Engineering Invariants

1. **Zero LLM/AI Hallucinations for Diet or Math:** Every dish, macro, price, and exercise comes strictly from deterministic, structured JSON/SQLite datasets.
2. **Strict Calorie-Macro Identity:** At the ingredient, dish, and daily summary level, calories strictly satisfy:
   $$\text{calories} = \text{round}((\text{protein\_g} \times 4) + (\text{carbs\_g} \times 4) + (\text{fats\_g} \times 9))$$
3. **Zero Phantom Ingredients:** Dishes only use ingredients present in $\text{UserPantry} \cup \text{MinimumGapCart} \cup \text{ExtraBudgetCart}$.
4. **Honest Target Display:** Never clamps progress bars or percentages to 100% when overshooting (e.g. `132% (+27g over)`).
5. **No Mock Data in React:** Every dashboard metric, dish swap, budget calculation, and workout card is fetched live from FastAPI endpoints.
6. **UI Hygiene:** Clean, responsive 2–3 column grids with zero duplicate pill lists or developer-facing labels in the navigation bar.

---

## 🏗️ Architecture & Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts (Weight projection & macro charts) + Lucide React
- **Backend:** Python 3.11+ + FastAPI + Pydantic v2 + SQLite (via SQLAlchemy)
- **ML Module:** scikit-learn GradientBoostingRegressor calibrated on NHANES anthropometric schema + U.S. Navy / Lee anthropometric fallback
- **Testing:** `pytest` unit & integration tests covering math, sufficiency gates, gap solver, and REST endpoints

---

## 🚀 Running the Application

### 1. Start the FastAPI Backend
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Start the React Frontend
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests & Persona Audits
```bash
# Run pytest unit & integration test suite
python -m pytest backend/tests/

# Run end-to-end Persona 1 and Persona 2 audits
python backend/scripts/verify_personas.py
```

---

## 🧩 Core Domain Engines

### Module A: Biometrics & Target Build Engine
- **BMR:**
  - Standard Quick Mode: Mifflin-St Jeor equation.
  - LBM Known: Katch-McArdle equation: $370 + (21.6 \times \text{LBM})$. *(LBM and SMM are strictly distinguished)*.
- **Smart Estimate ML Mode:**
  - Predicts Body Fat %, LBM, and Skeletal Muscle Mass (SMM) with honest confidence intervals ($\pm \text{MAE}$).
- **Targets:**
  - $\text{TDEE} = \text{BMR} \times \text{activity\_multiplier}$
  - Goal Caloric Adjustment: Cut ($-400$ kcal), Lean Bulk ($+300$ kcal), Recomp (Maintenance).
  - Protein Target: $2.0 \times \text{LBM}$ (or $1.8 \times \text{target\_weight}$, clamped between $1.6$ and $2.2 \times \text{weight}$).
  - Fat Target: $25\%$ of daily calories / $9$.
  - Carb Target: Remaining daily calories / $4$.

### Module B & C: Pantry Sufficiency & Dual-Branch Investment Optimizer
- **5-Gate Sufficiency Audit:**
  - Gate 1: Protein $\ge 90\%$ weekly target
  - Gate 2: Calories $\ge 90\%$ weekly target
  - Gate 3: Vegetables $\ge 1400gm$ (14 servings)
  - Gate 4: Fruits $\ge 7$ servings
  - Gate 5: Cookable dishes available for all 4 slots (Breakfast, Lunch, Snack, Dinner)
- **Branch 1 (Sufficient):** Status banner **"100% Pantry Covered (₹0 extra)"**.
- **Branch 2 (Deficient):**
  - **Step 1:** Solves exact **Minimum Mandatory Investment (`₹ min_gap_cost`)** using lowest ₹ per gram of protein and lowest produce costs.
  - **Step 2:** Interactive **Extra Investment Slider (`+₹0` to `+₹1500`)** unlocking higher-tier items and displaying newly unlocked dishes.

### Module D & E: 7-Day Meal Timetable & Workout Engine
- **Meal Timetable:**
  - Breakfast, Lunch, Snack, Dinner with exact ingredient weights and live serving multiplier ($0.75\times$ to $1.5\times$).
  - Per-slot **Swap Dish** modal recalculating macros live.
  - Collapsible recipe instructions with step-by-step guidance.
- **Workout Timetable:**
  - Side-by-side toggle: **With Gym** vs. **Without Gym (Home)**.
  - 3, 4, 5, 6-day splits covering all muscle groups.
  - Every single exercise includes a verified, non-broken YouTube form tutorial link.
