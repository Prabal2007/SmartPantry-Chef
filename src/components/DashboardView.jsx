import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Dumbbell, Target, TrendingUp, Apple, Carrot, Scale, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { logWeight, fetchWeightLogs, deleteWeightLog } from '../services/api';

export default function DashboardView({
  biometrics,
  planSummary,
  goal,
  onNavigateToMeals
}) {
  const [weightLogs, setWeightLogs] = useState([]);
  const [newWeight, setNewWeight] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [stallAlert, setStallAlert] = useState(null);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    loadWeightLogs();
  }, []);

  const loadWeightLogs = async () => {
    try {
      const logs = await fetchWeightLogs();
      setWeightLogs(logs);
    } catch (err) {
      console.error('Failed to load weight check-ins:', err);
    }
  };

  const handleLogWeightSubmit = async (e) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (!w || w <= 0) return;

    setIsLogging(true);
    try {
      const cleanWeight = Math.round(w * 10) / 10;
      const res = await logWeight({ weight_kg: cleanWeight, notes: newNotes });
      setNewWeight('');
      setNewNotes('');
      if (res.adjustment) {
        setStallAlert(res.adjustment);
      } else {
        setStallAlert(null);
      }
      await loadWeightLogs();
    } catch (err) {
      console.error('Failed to record check-in:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDeleteCheckIn = async (id) => {
    try {
      await deleteWeightLog(id);
      await loadWeightLogs();
    } catch (err) {
      console.error('Failed to delete check-in log:', err);
    }
  };

  // Recharts: Combined chronological timeline of projected target + actual check-ins
  const chartData = useMemo(() => {
    const map = new Map();

    // 1. Projected timeline points
    (biometrics?.weight_projection || []).forEach(pt => {
      const d = pt.date;
      if (!d) return;
      map.set(d, {
        date: d,
        timestamp: Date.parse(d) || 0,
        projected_weight_kg: pt.projected_weight_kg ?? pt.weight_kg,
        actual_weight_kg: null,
        notes: null
      });
    });

    // 2. Overlay actual user check-ins on matching timeline
    (weightLogs || []).forEach(l => {
      const d = l.date || l.logged_at;
      if (!d) return;
      if (map.has(d)) {
        const entry = map.get(d);
        entry.actual_weight_kg = l.weight_kg;
        if (l.notes) entry.notes = l.notes;
      } else {
        map.set(d, {
          date: d,
          timestamp: Date.parse(d) || 0,
          projected_weight_kg: null,
          actual_weight_kg: l.weight_kg,
          notes: l.notes || null
        });
      }
    });

    // Strict chronological sort by numeric timestamp
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [biometrics?.weight_projection, weightLogs]);

  // Dynamic Y-axis domain with tight ±2 kg padding
  const yDomain = useMemo(() => {
    const vals = [];
    chartData.forEach(p => {
      if (typeof p.projected_weight_kg === 'number') vals.push(p.projected_weight_kg);
      if (typeof p.actual_weight_kg === 'number') vals.push(p.actual_weight_kg);
    });
    if (biometrics?.target_weight_kg) vals.push(biometrics.target_weight_kg);
    if (vals.length === 0) return [60, 80];
    const minW = Math.min(...vals);
    const maxW = Math.max(...vals);
    return [Math.floor(minW - 2), Math.ceil(maxW + 2)];
  }, [chartData, biometrics?.target_weight_kg]);

  if (!biometrics) return null;

  // Macro Calculations
  const targetCals = biometrics.target_calories;
  const plannedCals = planSummary?.calories || targetCals;

  const targetP = biometrics.protein_target_g;
  const plannedP = planSummary?.protein_g || targetP;

  const targetC = biometrics.carbs_target_g;
  const plannedC = planSummary?.carbs_g || targetC;

  const targetF = biometrics.fats_target_g;
  const plannedF = planSummary?.fats_g || targetF;

  const plannedFiber = planSummary?.fiber_g || 28.0;

  // Invariant 4: Honest target percentage (never clamped to 100%)
  const getHonestPercentage = (actual, target) => {
    if (!target || target <= 0) return 100;
    return Math.round((actual / target) * 100);
  };

  const pPct = getHonestPercentage(plannedP, targetP);
  const cPct = getHonestPercentage(plannedC, targetC);
  const fPct = getHonestPercentage(plannedF, targetF);
  const calPct = getHonestPercentage(plannedCals, targetCals);

  // Honest overshoot / deficit formatting
  const formatHonestDelta = (actual, target, unit = 'g') => {
    const diff = Math.round((actual - target) * 10) / 10;
    if (diff > 0) return `+${diff}${unit} over`;
    if (diff < 0) return `${diff}${unit} deficit`;
    return 'exact target';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Top Banner: Physique Roadmap Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Active Strategy: {goal?.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              BMR Formula: <strong className="text-slate-200 capitalize">{biometrics.bmr_formula?.replace('_', ' ')}</strong>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Daily Target: <span className="text-amber-400 font-mono-num">{targetCals} kcal</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Target calculated from BMR ({biometrics.bmr} kcal) × Activity Multiplier → TDEE ({biometrics.tdee} kcal), adjusted for your timeline over ~{biometrics.estimated_weeks} weeks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNavigateToMeals}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <span>View 7-Day Meal Timetable ↗</span>
          </button>
        </div>
      </div>

      {/* 4 Biometrics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Basal Metabolic Rate</span>
          <div className="text-2xl font-black text-white font-mono-num">{biometrics.bmr} <span className="text-xs font-normal text-slate-500">kcal/day</span></div>
          <p className="text-[11px] text-slate-500">Resting cellular baseline</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expenditure (TDEE)</span>
          <div className="text-2xl font-black text-amber-400 font-mono-num">{biometrics.tdee} <span className="text-xs font-normal text-slate-500">kcal/day</span></div>
          <p className="text-[11px] text-slate-500">Maintenance energy burn</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lean Body Mass (LBM)</span>
          <div className="text-2xl font-black text-emerald-400 font-mono-num">
            {biometrics.lbm_kg ? `${biometrics.lbm_kg} kg` : 'Standard Est.'}
          </div>
          <p className="text-[11px] text-slate-500">
            {biometrics.body_fat_pct ? `${biometrics.body_fat_pct}% Body Fat` : 'Body fat not specified'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Skeletal Muscle Mass</span>
          <div className="text-2xl font-black text-sky-400 font-mono-num">
            {biometrics.smm_kg ? `${biometrics.smm_kg} kg` : 'Standard Est.'}
          </div>
          <p className="text-[11px] text-slate-500">
            {biometrics.skeletal_muscle_pct ? `${biometrics.skeletal_muscle_pct}% of total weight` : 'Estimated from LBM'}
          </p>
        </div>
      </div>

      {/* Macro Tracking & Honest Target Display Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" /> Daily Macro Breakdown & Honest Compliance
          </h3>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Identity: Calories = 4P + 4C + 9F
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Calories Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Calories</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                calPct > 105 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {calPct}% ({formatHonestDelta(plannedCals, targetCals, 'kcal')})
              </span>
            </div>

            <div className="flex items-baseline justify-between font-mono-num">
              <span className="text-2xl font-black text-white">{plannedCals}</span>
              <span className="text-xs text-slate-500">/ {targetCals} kcal</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, calPct)}%` }}
              ></div>
            </div>
          </div>

          {/* Protein Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Protein</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                pPct >= 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {pPct}% ({formatHonestDelta(plannedP, targetP, 'g')})
              </span>
            </div>

            <div className="flex items-baseline justify-between font-mono-num">
              <span className="text-2xl font-black text-white">{plannedP}g</span>
              <span className="text-xs text-slate-500">/ {targetP}g</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pPct)}%` }}
              ></div>
            </div>
          </div>

          {/* Carbs Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Carbs</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                {cPct}% ({formatHonestDelta(plannedC, targetC, 'g')})
              </span>
            </div>

            <div className="flex items-baseline justify-between font-mono-num">
              <span className="text-2xl font-black text-white">{plannedC}g</span>
              <span className="text-xs text-slate-500">/ {targetC}g</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, cPct)}%` }}
              ></div>
            </div>
          </div>

          {/* Fats Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Fats</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                {fPct}% ({formatHonestDelta(plannedF, targetF, 'g')})
              </span>
            </div>

            <div className="flex items-baseline justify-between font-mono-num">
              <span className="text-2xl font-black text-white">{plannedF}g</span>
              <span className="text-xs text-slate-500">/ {targetF}g</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, fPct)}%` }}
              ></div>
            </div>
          </div>

        </div>

        {/* Micronutrient & Produce Tracker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <Carrot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300">Vegetable Intake</span>
              <p className="text-xs text-slate-400">~200g / day (1.4 kg weekly target)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300">Fruit Intake</span>
              <p className="text-xs text-slate-400">1 fresh fruit / day (7 servings weekly)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300">Dietary Fiber</span>
              <p className="text-xs text-emerald-400 font-mono-num">{plannedFiber}g / day (Healthy Gut Target)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Projection Chart & Weight Check-In Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Recharts Weight Projection Curve & Actual Overlays (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Projected Weight Curve vs Actuals
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: {biometrics.target_weight_kg} kg (~{biometrics.estimated_weeks} weeks)
              </p>
            </div>

            {/* Visual Legend */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400"></span>
                <span className="text-slate-300">Projected Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">Actual Check-In</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(dStr) => {
                    const d = new Date(dStr);
                    if (isNaN(d.getTime())) return dStr;
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis stroke="#64748b" domain={yDomain} unit="kg" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  labelFormatter={(dStr) => {
                    const d = new Date(dStr);
                    if (isNaN(d.getTime())) return `Date: ${dStr}`;
                    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  }}
                  formatter={(val, name) => [`${val} kg`, name === 'projected_weight_kg' ? 'Projected Target' : 'Actual Check-In']}
                />
                <Line
                  type="monotone"
                  dataKey="projected_weight_kg"
                  name="projected_weight_kg"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="actual_weight_kg"
                  name="actual_weight_kg"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#064e3b' }}
                  activeDot={{ r: 7 }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Weight Check-In & Stall Adjuster Widget (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" /> Weekly Weight Check-In
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Log your weigh-in. If weight stalls for 2 consecutive check-ins, NutriForge auto-recalibrates ±150 kcal.
            </p>
          </div>

          {/* Stall Alert Banner */}
          {stallAlert && (
            <div className="p-3.5 bg-amber-950/60 border border-amber-500/60 rounded-xl text-xs space-y-1 text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertCircle className="w-4 h-4" /> Plateau Detected!
              </div>
              <p className="text-[11px] leading-relaxed">{stallAlert.message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogWeightSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                placeholder="Weight (kg)"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                required
              />
              <input
                type="text"
                placeholder="Notes (e.g. Week 1)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLogging || !newWeight}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLogging ? 'Recording...' : 'Record Check-In'}</span>
            </button>
          </form>

          {/* User Submitted Check-Ins List */}
          <div className="space-y-2 pt-2 border-t border-slate-800 max-h-52 overflow-y-auto">
            {weightLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No weekly check-ins logged yet. Log your first morning weight below.
              </p>
            ) : (
              weightLogs.slice().reverse().map(l => (
                <div key={l.id} className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800/80 group">
                  <div>
                    <span className="font-mono-num text-emerald-400 font-bold text-sm">{l.weight_kg} kg</span>
                    {l.notes && <span className="text-[11px] text-slate-400 ml-2">({l.notes})</span>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-slate-500 font-mono-num">{l.date || l.logged_at}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCheckIn(l.id)}
                      className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                      title="Delete check-in"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
