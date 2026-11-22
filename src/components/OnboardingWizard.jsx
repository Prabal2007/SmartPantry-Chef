import React, { useState, useEffect } from 'react';
import { Dumbbell, Utensils, Calendar, Sparkles, Scale, Activity, Check, ChevronRight, ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { predictBodyComp, loadStudentPreset } from '../services/api';

export default function OnboardingWizard({
  profile,
  setProfile,
  pantry,
  setPantry,
  foods,
  onGeneratePlan,
  isGenerating
}) {
  const [step, setStep] = useState(1);
  const [tapeInputs, setTapeInputs] = useState({
    waist_cm: 82.0,
    hip_cm: 90.0,
    arm_cm: 34.0,
    neck_cm: 38.0
  });
  const [mlResult, setMlResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 4 Visual Reference Build Tiers mapping to baseline BF%
  const BUILD_TIERS = [
    {
      id: 'lean',
      title: 'Tier 1: Lean & Athletic',
      bf_male: 12.0,
      bf_female: 20.0,
      desc: 'Visible abs outline, sharp vascularity, tight waist.'
    },
    {
      id: 'fit',
      title: 'Tier 2: Defined & Fit',
      bf_male: 17.0,
      bf_female: 25.0,
      desc: 'Flat stomach, muscular shape, moderate separation.'
    },
    {
      id: 'soft',
      title: 'Tier 3: Soft / Offseason',
      bf_male: 22.0,
      bf_female: 30.0,
      desc: 'Fuller build, no abdominal definition, solid foundation.'
    },
    {
      id: 'heavy',
      title: 'Tier 4: Elevated Body Fat',
      bf_male: 28.0,
      bf_female: 36.0,
      desc: 'Higher visceral and abdominal fat stores.'
    }
  ];

  const handleSelectBuildTier = (tier) => {
    const bf = profile.sex === 'male' ? tier.bf_male : tier.bf_female;
    setProfile(prev => ({
      ...prev,
      body_fat_pct: bf
    }));
  };

  const handleRunMlPrediction = async () => {
    setIsPredicting(true);
    try {
      const res = await predictBodyComp({
        age: profile.age,
        sex: profile.sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        waist_cm: parseFloat(tapeInputs.waist_cm) || 82.0,
        hip_cm: parseFloat(tapeInputs.hip_cm) || 90.0,
        arm_cm: parseFloat(tapeInputs.arm_cm) || 34.0,
        neck_cm: parseFloat(tapeInputs.neck_cm) || 38.0
      });
      setMlResult(res);
      setProfile(prev => ({
        ...prev,
        body_fat_pct: res.body_fat_pct,
        skeletal_muscle_pct: res.skeletal_muscle_pct
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handlePantryQuantityChange = (foodId, val, unit) => {
    const num = parseFloat(val) || 0;
    setPantry(prev => {
      const updated = { ...prev };
      if (num <= 0) {
        delete updated[foodId];
      } else {
        updated[foodId] = num;
      }
      return updated;
    });
  };

  const handleLoadStudentPreset = async () => {
    try {
      const res = await loadStudentPreset();
      if (res.pantry) {
        setPantry(res.pantry);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isFoodCompliantWithDiet = (food, dietType) => {
    const tags = food?.diet_tags || [];
    const id = food?.id || '';
    const isNonVeg = tags.includes('non_veg') || ['chicken_breast', 'fish_rohu'].includes(id);
    const isEgg = tags.includes('egg') || ['eggs', 'egg_whites'].includes(id);

    if (dietType === 'veg') {
      return !isNonVeg && !isEgg;
    }
    if (dietType === 'eggetarian') {
      return !isNonVeg;
    }
    return true; // 'non_veg'
  };

  const handleDietChange = (newDiet) => {
    setProfile(prev => ({ ...prev, diet_type: newDiet }));
    // Immediately cleanse non-compliant foods from current pantry inventory
    setPantry(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(foodId => {
        const food = foods.find(f => f.id === foodId);
        if (food && !isFoodCompliantWithDiet(food, newDiet)) {
          delete updated[foodId];
        }
      });
      return updated;
    });
  };

  const categories = [
    { id: 'all', label: 'All Items' },
    {
      id: 'protein',
      label: profile.diet_type === 'veg'
        ? '🌱 Proteins & Legumes'
        : profile.diet_type === 'eggetarian'
        ? '🥚 Proteins & Eggs'
        : '🥩 Proteins, Meat & Eggs'
    },
    { id: 'grain', label: '🌾 Grains & Carbs' },
    { id: 'vegetable', label: '🥦 Vegetables' },
    { id: 'fruit', label: '🍎 Fruits' },
    { id: 'dairy_fat', label: '🥛 Dairy, Fats & Basics' }
  ];

  const filteredFoods = foods.filter(f => {
    const matchDiet = isFoodCompliantWithDiet(f, profile.diet_type);
    const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDiet && matchCat && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Wizard Progress Steps Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-800 -z-0"></div>
          
          {[
            { num: 1, label: 'Biometrics & Body Comp' },
            { num: 2, label: 'Kitchen Pantry Stock' },
            { num: 3, label: 'Workout Environment' }
          ].map(s => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center relative z-10">
                <button
                  onClick={() => setStep(s.num)}
                  className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 font-black shadow-lg shadow-amber-500/30'
                      : isDone
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : s.num}
                </button>
                <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Biometrics, Target Build & Body Composition */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-amber-500" /> Biometrics & Physique Objectives
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic calculations based on Mifflin-St Jeor, Katch-McArdle, and safe metabolic rates.
            </p>
          </div>

          {/* Primary Biometrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Age</label>
              <input
                type="number"
                min="14"
                max="90"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 20 })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Biological Sex</label>
              <select
                value={profile.sex}
                onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Height (cm)</label>
              <input
                type="number"
                value={profile.height_cm}
                onChange={(e) => setProfile({ ...profile, height_cm: parseFloat(e.target.value) || 170 })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={profile.weight_kg}
                onChange={(e) => setProfile({ ...profile, weight_kg: parseFloat(e.target.value) || 70 })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Goal & Diet Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Physique Goal</label>
              <select
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="cut">Fat Loss / Cut (-400 kcal)</option>
                <option value="lean_bulk">Lean Muscle Bulk (+300 kcal)</option>
                <option value="recomp">Body Recomposition (Maintenance)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={profile.target_weight_kg}
                onChange={(e) => setProfile({ ...profile, target_weight_kg: parseFloat(e.target.value) || profile.weight_kg })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Activity Level</label>
              <select
                value={profile.activity_level}
                onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="sedentary">Sedentary (Desk Job, 1.2x)</option>
                <option value="light">Lightly Active (1-3 days, 1.375x)</option>
                <option value="moderate">Moderately Active (3-5 days, 1.55x)</option>
                <option value="active">Very Active (Heavy Labor/Athletics, 1.725x)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Dietary Pattern</label>
              <select
                value={profile.diet_type}
                onChange={(e) => handleDietChange(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="veg">🟢 Pure Vegetarian (Zero Eggs, Zero Meat/Fish)</option>
                <option value="eggetarian">🟡 Vegetarian with Eggs (Eggs Allowed, Zero Meat/Fish)</option>
                <option value="non_veg">🔴 Non-Vegetarian (All: Meat, Fish, Eggs)</option>
              </select>
            </div>
          </div>

          {/* 3-Tier Body Composition Input Mode */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Body Composition & BMR Mode
                </h3>
                <p className="text-xs text-slate-400">
                  Select your input tier to calculate or refine your Lean Body Mass (LBM) and BMR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'quick', title: '1. Quick Mode (Default)', desc: 'Standard Mifflin-St Jeor formula' },
                { id: 'smart_ml', title: '2. Smart Estimate (ML Model)', desc: 'Tape measures + NHANES ML prediction' },
                { id: 'scan', title: '3. Machine Scan Import', desc: 'Direct DEXA / InBody scan entry' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, body_comp_mode: m.id })}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    profile.body_comp_mode === m.id
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-200">{m.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Sub-Panel: Quick Mode Visual Build Reference */}
            {profile.body_comp_mode === 'quick' && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">
                    Visual Build Reference (Optional: Tap to estimate baseline body fat)
                  </span>
                  {profile.body_fat_pct && (
                    <span className="text-xs font-bold text-amber-400">
                      Selected: ~{profile.body_fat_pct}% BF (Katch-McArdle Active)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {BUILD_TIERS.map(t => {
                    const targetBf = profile.sex === 'male' ? t.bf_male : t.bf_female;
                    const isSelected = profile.body_fat_pct === targetBf;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectBuildTier(t)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{t.title}</span>
                          <span className="text-amber-400 font-mono-num">~{targetBf}%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{t.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Panel: Smart Estimate Mode (ML Tape Measurements) */}
            {profile.body_comp_mode === 'smart_ml' && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Tape Circumference Inputs
                  </span>
                  <span className="text-[11px] text-slate-500">NHANES Dual-Xray Calibrated</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Waist (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tapeInputs.waist_cm}
                      onChange={(e) => setTapeInputs({ ...tapeInputs, waist_cm: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Hips (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tapeInputs.hip_cm}
                      onChange={(e) => setTapeInputs({ ...tapeInputs, hip_cm: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Arm Flexed (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tapeInputs.arm_cm}
                      onChange={(e) => setTapeInputs({ ...tapeInputs, arm_cm: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Neck (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tapeInputs.neck_cm}
                      onChange={(e) => setTapeInputs({ ...tapeInputs, neck_cm: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRunMlPrediction}
                    disabled={isPredicting}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isPredicting ? 'Computing Regression Model...' : 'Predict Body Comp with ML'}
                  </button>

                  {mlResult && (
                    <div className="flex items-center gap-3 text-xs bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-400">Body Fat: </span>
                        <strong className="text-amber-400 font-mono-num">{mlResult.body_fat_pct}%</strong>
                        <span className="text-slate-500 text-[10px]"> (±{mlResult.confidence_band_mae}%)</span>
                      </div>
                      <div className="h-4 w-px bg-slate-800"></div>
                      <div>
                        <span className="text-slate-400">LBM: </span>
                        <strong className="text-emerald-400 font-mono-num">{mlResult.lean_body_mass_kg}kg</strong>
                      </div>
                      <div className="h-4 w-px bg-slate-800"></div>
                      <div>
                        <span className="text-slate-400">SMM: </span>
                        <strong className="text-sky-400 font-mono-num">{mlResult.skeletal_muscle_mass_kg}kg</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Panel: Direct Machine Scan Mode */}
            {profile.body_comp_mode === 'scan' && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Scan Body Fat Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 16.5"
                    value={profile.body_fat_pct || ''}
                    onChange={(e) => setProfile({ ...profile, body_fat_pct: parseFloat(e.target.value) || null })}
                    className="w-full mt-1.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Scan Skeletal Muscle Mass % (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 44.0"
                    value={profile.skeletal_muscle_pct || ''}
                    onChange={(e) => setProfile({ ...profile, skeletal_muscle_pct: parseFloat(e.target.value) || null })}
                    className="w-full mt-1.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Forward Button */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Continue to Pantry Stock</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Kitchen Pantry Stock */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                <Utensils className="w-6 h-6 text-amber-500" /> Current Available Pantry Goods
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter actual quantities currently in your kitchen. NutriForge audits sufficiency against all 5 gates.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadStudentPreset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition-all self-start sm:self-center flex items-center gap-2 shadow-sm"
            >
              <span>⚡ Load Student Kitchen Preset</span>
            </button>
          </div>

          {/* Active Dietary Filter Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dietary Filter:</span>
              <span className="text-xs text-slate-300 font-medium">
                {profile.diet_type === 'veg' && '🌱 Pure Veg (Non-veg & eggs excluded)'}
                {profile.diet_type === 'eggetarian' && '🥚 Veg + Eggs (Non-veg excluded, eggs included)'}
                {profile.diet_type === 'non_veg' && '🥩 Non-Vegetarian (All pantry goods available)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {[
                { id: 'veg', label: 'Pure Veg', icon: '🌱' },
                { id: 'eggetarian', label: 'With Eggs', icon: '🥚' },
                { id: 'non_veg', label: 'Non-Veg', icon: '🥩' }
              ].map(opt => {
                const isActive = profile.diet_type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleDietChange(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? opt.id === 'veg'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : opt.id === 'eggetarian'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Responsive 2-3 Column Food Item Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredFoods.map(food => {
              const currentQty = pantry[food.id] || '';
              const hasQty = !!pantry[food.id];

              return (
                <div
                  key={food.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    hasQty
                      ? 'bg-amber-950/20 border-amber-500/70 shadow-sm'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{food.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>₹{food.price_per_100g_or_unit_inr}/{food.unit === 'piece' ? 'pc' : food.unit === 'ml' ? '100ml' : '100g'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 font-mono-num">{food.protein_per_100}g P</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={food.unit === 'piece' ? '1' : '50'}
                      min="0"
                      placeholder="0"
                      value={currentQty}
                      onChange={(e) => handlePantryQuantityChange(food.id, e.target.value, food.unit)}
                      className="w-20 px-2.5 py-1.5 bg-slate-900 border border-slate-750 rounded-lg text-xs text-right font-mono-num text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] font-bold text-slate-400 w-8 text-left">{food.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invariant Check: Selected Pantry Summary Counter */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>
              Total Unique Items in Stock: <strong className="text-amber-400 font-bold">{Object.keys(pantry).length}</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              Only pantry items with quantity &gt; 0 are counted.
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Continue to Workout Mode</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Workout Environment & Plan Generation */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-amber-500" /> Training Environment & Split Setup
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select whether you have access to a commercial gym or prefer bodyweight/home progression.
            </p>
          </div>

          {/* Prominent Environment Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setProfile({ ...profile, workout_environment: 'with_gym' })}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                profile.workout_environment === 'with_gym'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-3xl mb-2">🏋️‍♂️</div>
              <h3 className="text-base font-bold text-white">With Gym Access</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Compound barbells, cable stations, dumbbell presses, leg press machines, and isolated hypertrophy movements.
              </p>
            </div>

            <div
              onClick={() => setProfile({ ...profile, workout_environment: 'without_gym' })}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                profile.workout_environment === 'without_gym'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-3xl mb-2">🏠</div>
              <h3 className="text-base font-bold text-white">Without Gym / Home</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Calisthenics, progressive push-up variations, table/backpack inverted rows, split squats, core holds with zero commercial equipment needed.
              </p>
            </div>
          </div>

          {/* Frequency & Experience Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Experience Level
              </label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['beginner', 'intermediate'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setProfile({ ...profile, experience_level: lvl })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      profile.experience_level === lvl
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Training Days Per Week
              </label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[3, 4, 5, 6].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setProfile({ ...profile, days_per_week: days })}
                    className={`py-3 rounded-xl text-xs font-extrabold transition-all border ${
                      profile.days_per_week === days
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Button: Instant Plan Generation */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onGeneratePlan}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>{isGenerating ? 'Evaluating Pantry & Generating Deterministic Plan...' : 'Generate NutriForge Diet & Physique Plan'}</span>
            </button>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Pantry
              </button>
              <span>100% Deterministic Math • 0 Phantom Ingredients</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
