import React, { useState } from 'react';
import { Dumbbell, ExternalLink, CheckSquare, Square, Clock, Award, Flame } from 'lucide-react';
import { generateFullPlan } from '../services/api';

export default function WorkoutView({
  workoutPlan,
  setWorkoutPlan,
  profile,
  setProfile,
  pantry,
  extraBudget
}) {
  const [completedExercises, setCompletedExercises] = useState({});
  const [isSwitching, setIsSwitching] = useState(false);

  if (!workoutPlan || !workoutPlan.schedule) return null;

  const currentEnv = workoutPlan.environment || profile.workout_environment;

  const handleToggleEnvironment = async (newEnv) => {
    if (newEnv === currentEnv) return;
    setIsSwitching(true);
    try {
      const updatedProfile = { ...profile, workout_environment: newEnv };
      setProfile(updatedProfile);

      // Call generate endpoint to reload workout timetable while keeping current diet plan intact
      const res = await generateFullPlan({
        profile: updatedProfile,
        pantry: pantry,
        extra_budget_inr: extraBudget?.extra_budget_inr || 0
      });
      if (res.workout_plan) {
        setWorkoutPlan(res.workout_plan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitching(false);
    }
  };

  const toggleExerciseCheck = (exKey) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exKey]: !prev[exKey]
    }));
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Top Banner: Training Strategy & With Gym vs Without Gym Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {workoutPlan.days_per_week}-Day Split • {workoutPlan.experience_level}
            </span>
            <span className="text-xs text-slate-400 font-medium capitalize">
              Goal: {workoutPlan.goal?.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {currentEnv === 'with_gym' ? 'Commercial Gym Hypertrophy Schedule' : 'Home Bodyweight & Calisthenics Schedule'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            {currentEnv === 'with_gym'
              ? 'Tuned for barbell progressive overload, mechanical tension, and machine-stabilized isolation.'
              : 'Tuned for relative bodyweight strength, progressive push-up variations, and inverted rows with zero gym machines.'}
          </p>
        </div>

        {/* Live Environment Switcher Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => handleToggleEnvironment('with_gym')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              currentEnv === 'with_gym'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏋️‍♂️ With Gym</span>
          </button>

          <button
            type="button"
            disabled={isSwitching}
            onClick={() => handleToggleEnvironment('without_gym')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              currentEnv === 'without_gym'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏠 Without Gym (Home)</span>
          </button>
        </div>
      </div>

      {/* Days Schedule Grid */}
      <div className="space-y-6">
        {workoutPlan.schedule.map((day) => (
          <div key={day.day_num} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            
            {/* Day Title */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-amber-500" />
                <span>{day.day_name}</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {day.exercises.length} Exercises Scheduled
              </span>
            </div>

            {/* Exercise Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {day.exercises.map((ex, exIdx) => {
                const exKey = `d${day.day_num}_e${exIdx}_${ex.id}`;
                const isCompleted = !!completedExercises[exKey];

                return (
                  <div
                    key={exKey}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isCompleted
                        ? 'bg-slate-950/80 border-emerald-500/40 opacity-70'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-900 text-amber-400 border border-slate-800">
                            {ex.muscle_group}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-snug">{ex.name}</h4>
                        </div>

                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleExerciseCheck(exKey)}
                          className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Reps & Rest Badges */}
                      <div className="flex items-center gap-2 text-xs font-mono-num">
                        <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 font-bold">
                          {ex.sets} sets × {ex.rep_range?.replace(/\s*\([^)]*\)/g, '') || ex.rep_range}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {ex.rest_seconds}s rest
                        </span>
                      </div>

                      {/* Progression Cue */}
                      <p className="text-xs text-slate-400 leading-relaxed pt-1">
                        <strong className="text-slate-300">Cue: </strong>{ex.progression_cue}
                      </p>
                    </div>

                    {/* Tutorial Video Link (Verified non-broken YouTube Search/Tutorial) */}
                    <div className="pt-2 border-t border-slate-900 flex justify-end">
                      <a
                        href={ex.tutorial_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-400 hover:text-amber-300 border border-slate-800 text-xs font-bold transition-all"
                      >
                        <span>Watch Form Guide</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
