'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Camera, Plus, Trash2, Loader2, Check, X, Settings as SettingsIcon, TrendingUp,
  Dumbbell, Scale, ChevronLeft, ChevronRight, Target, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import * as storage from '@/lib/storage';
import {
  dateKey, formatDate, formatUSDate, calculateBMR, calculateTDEE,
  calculateAdjustedTDEE, MEAL_CATEGORIES, GOALS,
} from '@/lib/utils';
import type { Settings, FoodEntry, WeightLog, Workout } from '@/lib/storage';

type View = 'today' | 'history' | 'workout' | 'settings';

export default function IntakeApp({ userEmail }: { userEmail: string }) {
  const [view, setView] = useState<View>('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [weight, setWeight] = useState<WeightLog | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (settings) loadDay(currentDate);
  }, [currentDate, settings]);

  const init = async () => {
    setLoading(true);
    const s = await storage.getSettings();
    if (!s) {
      setShowOnboarding(true);
    } else {
      setSettings(s);
    }
    setLoading(false);
  };

  const loadDay = async (date: Date) => {
    const [foodData, weightData, workoutData] = await Promise.all([
      storage.getFoodEntries(date),
      storage.getWeight(date),
      storage.getWorkouts(date),
    ]);
    setEntries(foodData);
    setWeight(weightData);
    setWorkouts(workoutData);
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (showOnboarding || !settings) {
    return (
      <Onboarding
        onComplete={async (s) => {
          await saveSettings(s);
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {view === 'today' && (
        <TodayView
          date={currentDate}
          setDate={setCurrentDate}
          entries={entries}
          weight={weight}
          workouts={workouts}
          settings={settings}
          onReload={() => loadDay(currentDate)}
        />
      )}
      {view === 'history' && <HistoryView settings={settings} />}
      {view === 'workout' && (
        <WorkoutView
          date={currentDate}
          workouts={workouts}
          onReload={() => loadDay(currentDate)}
        />
      )}
      {view === 'settings' && (
        <SettingsView settings={settings} onSave={saveSettings} userEmail={userEmail} onSignOut={signOut} />
      )}

      <BottomNav view={view} setView={setView} />
    </div>
  );
}

// ============================================================================
// ONBOARDING
// ============================================================================
function Onboarding({ onComplete }: { onComplete: (s: Settings) => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [data, setData] = useState({
    age: 27,
    sex: 'male',
    heightFt: 5,
    heightIn: 9,
    weight: 151,
    activity: 'moderate',
    goal: 'recomp',
    proteinPerKg: 1.9,
  });

  const next = () => {
    setDirection('forward');
    setStep(step + 1);
  };
  const back = () => {
    setDirection('back');
    setStep(Math.max(0, step - 1));
  };

  const finish = () => {
    const totalHeightIn = data.heightFt * 12 + data.heightIn;
    const bmr = calculateBMR(data.weight, totalHeightIn, data.age, data.sex);
    const tdee = calculateTDEE(bmr, data.activity);
    const goal = GOALS.find((g) => g.id === data.goal)!;
    const calorieTarget = Math.round(tdee + goal.adjustment);
    const weightKg = data.weight * 0.453592;
    const proteinTarget = Math.round(weightKg * data.proteinPerKg);

    onComplete({
      age: data.age,
      sex: data.sex,
      height_in: totalHeightIn,
      weight: data.weight,
      activity: data.activity,
      goal: data.goal,
      protein_per_kg: data.proteinPerKg,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calorie_target: calorieTarget,
      protein_target: proteinTarget,
      carb_target: Math.round((calorieTarget * 0.4) / 4),
      fat_target: Math.round((calorieTarget * 0.3) / 9),
    });
  };

  const steps = [
    {
      title: 'set. track. achieve.',
      subtitle: 'Honest data. Your decisions.',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-stone-600 leading-relaxed">
            Three minutes to set up. We&apos;ll calculate your maintenance calories and protein target, you can adjust anything later.
          </p>
          <button onClick={next} className="w-full bg-stone-900 text-stone-50 py-4 text-xs uppercase tracking-widest font-semibold hover:bg-stone-700">
            Begin
          </button>
        </div>
      ),
    },
    {
      title: 'Stats',
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Age</label>
            <input type="number" value={data.age} onChange={(e) => setData({ ...data, age: Number(e.target.value) })} className="w-full px-3 py-3 border border-stone-300 rounded-sm focus:border-stone-900 outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Height</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input type="number" value={data.heightFt} onChange={(e) => setData({ ...data, heightFt: Number(e.target.value) })} className="w-full px-3 py-3 border border-stone-300 rounded-sm focus:border-stone-900 outline-none" />
                <span className="absolute right-3 top-3 text-xs text-stone-400">ft</span>
              </div>
              <div className="relative">
                <input type="number" value={data.heightIn} onChange={(e) => setData({ ...data, heightIn: Number(e.target.value) })} className="w-full px-3 py-3 border border-stone-300 rounded-sm focus:border-stone-900 outline-none" />
                <span className="absolute right-3 top-3 text-xs text-stone-400">in</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Weight (lbs)</label>
            <input type="number" value={data.weight} onChange={(e) => setData({ ...data, weight: Number(e.target.value) })} className="w-full px-3 py-3 border border-stone-300 rounded-sm focus:border-stone-900 outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={back} className="px-4 py-3 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Back</button>
            <button onClick={next} className="flex-1 bg-stone-900 text-stone-50 py-3 text-xs uppercase tracking-widest font-semibold">Next</button>
          </div>
        </div>
      ),
    },
    {
      title: 'Activity',
      subtitle: 'Outside of structured training',
      content: (
        <div className="space-y-3">
          {[
            { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little walking' },
            { id: 'light', label: 'Light', desc: 'Desk job + some walking' },
            { id: 'moderate', label: 'Moderate', desc: 'On feet often, lift 4-5x/week' },
            { id: 'active', label: 'Active', desc: 'Physical job + training' },
            { id: 'very_active', label: 'Very Active', desc: 'Manual labor + heavy training' },
          ].map((opt) => (
            <button key={opt.id} onClick={() => setData({ ...data, activity: opt.id })} className={`w-full text-left p-4 border-2 rounded-sm transition-all ${data.activity === opt.id ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300 hover:border-stone-500'}`}>
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className={`text-xs mt-1 ${data.activity === opt.id ? 'text-stone-300' : 'text-stone-500'}`}>{opt.desc}</div>
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={back} className="px-4 py-3 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Back</button>
            <button onClick={next} className="flex-1 bg-stone-900 text-stone-50 py-3 text-xs uppercase tracking-widest font-semibold">Next</button>
          </div>
        </div>
      ),
    },
    {
      title: 'Goal',
      content: (
        <div className="space-y-3">
          {GOALS.map((opt) => (
            <button key={opt.id} onClick={() => setData({ ...data, goal: opt.id })} className={`w-full text-left p-4 border-2 rounded-sm transition-all ${data.goal === opt.id ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300 hover:border-stone-500'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className={`text-xs mt-1 ${data.goal === opt.id ? 'text-stone-300' : 'text-stone-500'}`}>{opt.desc}</div>
                </div>
                <div className={`text-xs font-mono ${data.goal === opt.id ? 'text-stone-300' : 'text-stone-400'}`}>
                  {opt.adjustment > 0 ? '+' : ''}{opt.adjustment} cal
                </div>
              </div>
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={back} className="px-4 py-3 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Back</button>
            <button onClick={finish} className="flex-1 bg-stone-900 text-stone-50 py-3 text-xs uppercase tracking-widest font-semibold">Finish</button>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-5 overflow-hidden">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <div className="flex gap-1 mb-6">
            {steps.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-stone-200 overflow-hidden">
                {i <= step && <div key={`fill-${step}-${i}`} className="h-full bg-stone-900 progress-fill" />}
              </div>
            ))}
          </div>
          <div key={`header-${step}`}>
            <h1 className="display-font text-4xl font-extrabold mb-1 stagger-1">{current.title}</h1>
            {current.subtitle && <p className="text-xs uppercase tracking-widest text-stone-500 stagger-2">{current.subtitle}</p>}
          </div>
        </div>
        <div key={`content-${step}`} className={direction === 'forward' ? 'slide-forward' : 'slide-back'}>
          {current.content}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TODAY VIEW
// ============================================================================
function TodayView({
  date, setDate, entries, weight, workouts, settings, onReload,
}: {
  date: Date;
  setDate: (d: Date) => void;
  entries: FoodEntry[];
  weight: WeightLog | null;
  workouts: Workout[];
  settings: Settings;
  onReload: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[] | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [activeMeal, setActiveMeal] = useState('breakfast');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isToday = dateKey(date) === dateKey(new Date());

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const workoutCals = workouts.reduce((s, w) => s + (w.calories || 0), 0);
  const remaining = settings.calorie_target - totals.calories;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError('');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type, type: 'food' }),
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      const parsed = await response.json();

      if (!parsed.items || parsed.items.length === 0) {
        setError("Couldn't identify food. Try a clearer photo or manual entry.");
        setAnalyzing(false);
        return;
      }

      setPendingItems(
        parsed.items.map((item: any, i: number) => ({
          ...item,
          tempId: `pending-${Date.now()}-${i}`,
          meal: activeMeal,
        }))
      );
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmPending = async () => {
    if (!pendingItems) return;
    await storage.addFoodEntries(
      pendingItems.map((item: any) => ({
        log_date: dateKey(date),
        meal: item.meal,
        name: item.name,
        calories: Math.round(item.calories),
        protein: Math.round(item.protein),
        carbs: Math.round(item.carbs),
        fat: Math.round(item.fat),
      }))
    );
    setPendingItems(null);
    onReload();
  };

  const removeEntry = async (id: string) => {
    await storage.removeFoodEntry(id);
    onReload();
  };

  const addManualEntry = async (entry: any) => {
    await storage.addFoodEntry({
      log_date: dateKey(date),
      meal: activeMeal,
      ...entry,
    });
    setShowManual(false);
    onReload();
  };

  const handleSaveWeight = async (lbs: number) => {
    await storage.saveWeight(date, lbs);
    setShowWeight(false);
    onReload();
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d);
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <header className="mb-6">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="display-font text-3xl font-extrabold tracking-tight text-stone-900">intake.</h1>
          <span className="text-xs uppercase tracking-widest text-stone-500">set. track. achieve.</span>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-stone-900">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-stone-200 rounded-sm">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold">{formatDate(date)}</div>
            <div className="text-xs text-stone-500">{formatUSDate(date)}</div>
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday} className="p-2 hover:bg-stone-200 rounded-sm disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="bg-stone-900 text-stone-50 p-6 mb-4 rounded-sm">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-xs uppercase tracking-widest text-stone-400">{settings.goal.replace('_', ' ')} mode</span>
          <span className="text-xs text-stone-400">target {settings.calorie_target}</span>
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <div className="display-font text-6xl font-extrabold">{Math.round(totals.calories)}</div>
          <div className="text-stone-400 text-sm">/ {settings.calorie_target}</div>
        </div>
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-6">
          {remaining >= 0 ? `${Math.round(remaining)} remaining` : `${Math.round(Math.abs(remaining))} over`}
        </div>

        <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden mb-6">
          <div
            className={`h-full transition-all duration-500 ${remaining < 0 ? 'bg-amber-400' : 'bg-stone-50'}`}
            style={{ width: `${Math.min(100, (totals.calories / settings.calorie_target) * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-700">
          <MacroDisplay label="Protein" value={totals.protein} target={settings.protein_target} />
          <MacroDisplay label="Carbs" value={totals.carbs} target={settings.carb_target} />
          <MacroDisplay label="Fat" value={totals.fat} target={settings.fat_target} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => setShowWeight(true)} className="bg-white border border-stone-200 hover:border-stone-400 p-4 rounded-sm text-left transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={14} className="text-stone-500" />
            <span className="text-xs uppercase tracking-widest text-stone-500">Weight</span>
          </div>
          <div className="display-font text-2xl font-bold">
            {weight ? `${weight.weight}` : '—'}
            <span className="text-xs text-stone-400 ml-1">{weight ? 'lbs' : 'tap to log'}</span>
          </div>
        </button>
        <div className="bg-white border border-stone-200 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={14} className="text-stone-500" />
            <span className="text-xs uppercase tracking-widest text-stone-500">Workout</span>
          </div>
          <div className="display-font text-2xl font-bold">
            {workoutCals > 0 ? `${workoutCals}` : '—'}
            <span className="text-xs text-stone-400 ml-1">{workoutCals > 0 ? 'cal*' : 'none'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border-l-2 border-red-600 bg-red-50 text-sm text-red-900 rounded-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {pendingItems && (
        <PendingItemsCard
          items={pendingItems}
          setItems={setPendingItems}
          onConfirm={confirmPending}
          onCancel={() => setPendingItems(null)}
        />
      )}

      {showManual && <ManualEntryCard onAdd={addManualEntry} onCancel={() => setShowManual(false)} meal={activeMeal} />}

      {showWeight && (
        <WeightEntryCard
          currentWeight={weight?.weight || settings.weight}
          onSave={handleSaveWeight}
          onCancel={() => setShowWeight(false)}
        />
      )}

      {!pendingItems && !showManual && !showWeight && (
        <>
          <div className="mb-4">
            <div className="flex gap-1 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {MEAL_CATEGORIES.map((meal) => {
                const count = entries.filter((e) => e.meal === meal.id).length;
                return (
                  <button
                    key={meal.id}
                    onClick={() => setActiveMeal(meal.id)}
                    className={`shrink-0 px-3 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors ${activeMeal === meal.id ? 'bg-stone-900 text-stone-50' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
                  >
                    {meal.label}
                    {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="bg-stone-900 text-stone-50 py-4 text-xs uppercase tracking-widest font-semibold hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm">
              {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing</> : <><Camera size={16} /> Photo</>}
            </button>
            <button onClick={() => setShowManual(true)} className="border-2 border-stone-900 text-stone-900 py-4 text-xs uppercase tracking-widest font-semibold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2 rounded-sm">
              <Plus size={16} /> Manual
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </div>
        </>
      )}

      <div className="space-y-5">
        {MEAL_CATEGORIES.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal.id);
          if (mealEntries.length === 0) return null;
          const mealCals = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
          return (
            <div key={meal.id}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-stone-700">{meal.label}</h3>
                <span className="text-xs text-stone-500">{Math.round(mealCals)} cal</span>
              </div>
              <div className="space-y-2">
                {mealEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id!)} />
                ))}
              </div>
            </div>
          );
        })}

        {entries.length === 0 && !pendingItems && !showManual && (
          <div className="text-center py-12 text-stone-400 border border-dashed border-stone-300 rounded-sm">
            <p className="text-sm">Nothing logged for {formatDate(date).toLowerCase()}.</p>
            <p className="text-xs mt-1 text-stone-500">Snap a photo or add manually.</p>
          </div>
        )}
      </div>

      {workoutCals > 0 && (
        <div className="mt-6 p-3 bg-amber-50 border-l-2 border-amber-600 rounded-sm">
          <p className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">*Workout calories are estimates.</span> Apple Watch and similar devices typically overestimate by 15-40%. Don&apos;t subtract them from your intake — your TDEE already accounts for training.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
function MacroDisplay({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-stone-400 mb-1">{label}</div>
      <div className="text-xl font-semibold mb-1">
        {Math.round(value)}<span className="text-xs text-stone-400">/{target}g</span>
      </div>
      <div className="h-0.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full bg-stone-50 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EntryRow({ entry, onRemove }: { entry: FoodEntry; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-sm group">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-stone-900 truncate">{entry.name}</div>
        <div className="text-xs text-stone-500 mt-0.5">
          {Math.round(entry.calories || 0)} cal · {Math.round(entry.protein || 0)}p · {Math.round(entry.carbs || 0)}c · {Math.round(entry.fat || 0)}f
        </div>
      </div>
      <button onClick={onRemove} className="ml-3 text-stone-300 hover:text-red-600">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function PendingItemsCard({ items, setItems, onConfirm, onCancel }: any) {
  const update = (tempId: string, field: string, value: any) => {
    setItems(
      items.map((item: any) =>
        item.tempId === tempId
          ? { ...item, [field]: field === 'name' ? value : Number(value) || 0 }
          : item
      )
    );
  };
  const remove = (tempId: string) => setItems(items.filter((item: any) => item.tempId !== tempId));

  return (
    <div className="mb-6 border-2 border-stone-900 bg-amber-50 p-4 rounded-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest font-semibold">Confirm items</h2>
        <span className="text-xs text-stone-600">Adjust before logging</span>
      </div>
      <div className="space-y-3 mb-4">
        {items.map((item: any) => (
          <div key={item.tempId} className="bg-white p-3 border border-stone-300 rounded-sm">
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={item.name} onChange={(e) => update(item.tempId, 'name', e.target.value)} className="flex-1 text-sm font-medium bg-transparent border-b border-stone-300 focus:border-stone-900 outline-none px-1" />
              <button onClick={() => remove(item.tempId)} className="text-stone-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {['calories', 'protein', 'carbs', 'fat'].map((field) => (
                <div key={field}>
                  <label className="block text-stone-500 uppercase tracking-wide mb-1">{field === 'calories' ? 'Cal' : field[0].toUpperCase()}</label>
                  <input type="number" value={item[field]} onChange={(e) => update(item.tempId, field, e.target.value)} className="w-full px-2 py-1 border border-stone-300 rounded-sm focus:border-stone-900 outline-none" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={items.length === 0} className="flex-1 bg-stone-900 text-stone-50 py-3 text-xs uppercase tracking-widest font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
          <Check size={14} /> Log {items.length}
        </button>
        <button onClick={onCancel} className="px-4 py-3 border border-stone-900 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

function ManualEntryCard({ onAdd, onCancel, meal }: { onAdd: (e: any) => void; onCancel: () => void; meal: string }) {
  const [entry, setEntry] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const submit = () => {
    if (!entry.name.trim() || !entry.calories) return;
    onAdd({
      name: entry.name,
      calories: Number(entry.calories) || 0,
      protein: Number(entry.protein) || 0,
      carbs: Number(entry.carbs) || 0,
      fat: Number(entry.fat) || 0,
    });
  };
  return (
    <div className="mb-6 border-2 border-stone-900 p-4 rounded-sm">
      <h2 className="text-xs uppercase tracking-widest font-semibold mb-3">Manual entry → {meal.replace('_', ' ')}</h2>
      <div className="space-y-3">
        <input type="text" placeholder="What did you eat?" value={entry.name} onChange={(e) => setEntry({ ...entry, name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-sm focus:border-stone-900 outline-none text-sm" />
        <div className="grid grid-cols-4 gap-2">
          {[['calories', 'Cal'], ['protein', 'P'], ['carbs', 'C'], ['fat', 'F']].map(([key, label]) => (
            <input key={key} type="number" placeholder={label} value={(entry as any)[key]} onChange={(e) => setEntry({ ...entry, [key]: e.target.value })} className="px-2 py-2 border border-stone-300 rounded-sm focus:border-stone-900 outline-none text-sm" />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 bg-stone-900 text-stone-50 py-2 text-xs uppercase tracking-widest font-semibold">Add</button>
          <button onClick={onCancel} className="px-4 py-2 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function WeightEntryCard({ currentWeight, onSave, onCancel }: { currentWeight: number; onSave: (w: number) => void; onCancel: () => void }) {
  const [weight, setWeight] = useState<string | number>(currentWeight || '');
  return (
    <div className="mb-6 border-2 border-stone-900 p-4 rounded-sm">
      <h2 className="text-xs uppercase tracking-widest font-semibold mb-3">Log weight</h2>
      <p className="text-xs text-stone-600 mb-3">First thing in the morning, after bathroom, before food/water gives the most consistent data.</p>
      <div className="flex gap-2">
        <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="lbs" className="flex-1 px-3 py-2 border border-stone-300 rounded-sm focus:border-stone-900 outline-none text-sm" />
        <button onClick={() => onSave(Number(weight))} disabled={!weight} className="px-6 bg-stone-900 text-stone-50 text-xs uppercase tracking-widest font-semibold disabled:opacity-40">Save</button>
        <button onClick={onCancel} className="px-4 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY VIEW
// ============================================================================
function HistoryView({ settings }: { settings: Settings }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<any[] | null>(null);
  const [adjustedTDEE, setAdjustedTDEE] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, [period]);

  const loadHistory = async () => {
    const days = period === 'week' ? 7 : 30;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const [foodData, weightData] = await Promise.all([
      storage.getFoodEntriesInRange(startDate, today),
      storage.getWeightsInRange(startDate, today),
    ]);

    const result: any[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const dayFood = foodData.filter((e) => e.log_date === key);
      const dayWeight = weightData.find((w) => w.log_date === key);
      const totals = dayFood.reduce(
        (acc, e) => ({
          calories: acc.calories + (e.calories || 0),
          protein: acc.protein + (e.protein || 0),
          carbs: acc.carbs + (e.carbs || 0),
          fat: acc.fat + (e.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      result.push({
        date: key,
        displayDate: d,
        ...totals,
        weight: dayWeight?.weight || null,
        hasData: dayFood.length > 0,
      });
    }
    setData(result);

    // 30-day TDEE calculation
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [allFood, allWeights] = await Promise.all([
      storage.getFoodEntriesInRange(thirtyDaysAgo, today),
      storage.getWeightsInRange(thirtyDaysAgo, today),
    ]);

    const weightHistory = allWeights.map((w) => ({ date: w.log_date, weight: w.weight }));
    const intakeByDay = new Map<string, number>();
    allFood.forEach((e) => {
      intakeByDay.set(e.log_date, (intakeByDay.get(e.log_date) || 0) + (e.calories || 0));
    });
    const intakeHistory = Array.from(intakeByDay.entries()).map(([date, calories]) => ({ date, calories }));

    if (weightHistory.length >= 14 && intakeHistory.length >= 14) {
      setAdjustedTDEE(calculateAdjustedTDEE(weightHistory, intakeHistory));
    }
  };

  if (!data) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;

  const daysWithData = data.filter((d) => d.hasData);
  const avgCals = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length) : 0;
  const avgProtein = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0;
  const weights = data.filter((d) => d.weight).map((d) => d.weight);
  const avgWeight = weights.length > 0 ? (weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1) : null;
  const weightTrend = weights.length >= 2 ? (weights[0] - weights[weights.length - 1]).toFixed(1) : null;

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <header className="mb-6 border-b-2 border-stone-900 pb-4">
        <h1 className="display-font text-3xl font-extrabold tracking-tight">history.</h1>
        <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">trends & patterns</p>
      </header>

      <div className="flex gap-2 mb-6">
        {([['week', '7 days'], ['month', '30 days']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors ${period === id ? 'bg-stone-900 text-stone-50' : 'bg-white border border-stone-200 text-stone-600'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Avg Calories" value={avgCals} unit={`/ ${settings.calorie_target}`} />
        <StatCard label="Avg Protein" value={avgProtein} unit={`/ ${settings.protein_target}g`} />
        <StatCard label="Avg Weight" value={avgWeight || '—'} unit={avgWeight ? 'lbs' : ''} />
        <StatCard label="Days Logged" value={daysWithData.length} unit={`/ ${data.length}`} />
      </div>

      {adjustedTDEE && (
        <div className="mb-6 p-4 bg-stone-900 text-stone-50 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} />
            <span className="text-xs uppercase tracking-widest text-stone-400">Calculated TDEE</span>
          </div>
          <div className="display-font text-3xl font-extrabold mb-1">{adjustedTDEE} cal</div>
          <div className="text-xs text-stone-400">
            Based on your weight trend + intake over the last 14+ days. This is your actual maintenance, not the estimate.
            {settings.tdee && Math.abs(adjustedTDEE - settings.tdee) > 100 && (
              <div className="mt-2 pt-2 border-t border-stone-700">
                Estimate was {settings.tdee}. Difference of {Math.abs(adjustedTDEE - settings.tdee)} cal.
              </div>
            )}
          </div>
        </div>
      )}

      {weightTrend !== null && (
        <div className="mb-6 p-4 bg-white border border-stone-200 rounded-sm">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Weight trend</div>
          <div className="flex items-baseline gap-2">
            <div className="display-font text-2xl font-bold">
              {Number(weightTrend) > 0 ? '+' : ''}{weightTrend}
            </div>
            <div className="text-xs text-stone-500">lbs over {period === 'week' ? '7 days' : '30 days'}</div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs uppercase tracking-widest font-semibold mb-3 text-stone-700">Daily log</h2>
        <div className="space-y-1">
          {data.map((day) => (
            <div key={day.date} className={`flex items-center justify-between p-3 rounded-sm ${day.hasData ? 'bg-white border border-stone-200' : 'bg-stone-100'}`}>
              <div>
                <div className="text-sm font-medium">{formatDate(day.displayDate)}</div>
                <div className="text-xs text-stone-500">
                  {day.hasData ? `${Math.round(day.calories)} cal · ${Math.round(day.protein)}p` : 'No log'}
                </div>
              </div>
              {day.weight && <div className="text-xs text-stone-500 font-mono">{day.weight} lbs</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-white border border-stone-200 p-4 rounded-sm">
      <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <div className="display-font text-2xl font-bold">{value}</div>
        <div className="text-xs text-stone-500">{unit}</div>
      </div>
    </div>
  );
}

// ============================================================================
// WORKOUT VIEW
// ============================================================================
function WorkoutView({ date, workouts, onReload }: { date: Date; workouts: Workout[]; onReload: () => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, setPending] = useState<any | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError('');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type, type: 'workout' }),
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      const parsed = await response.json();
      setPending(parsed);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirm = async () => {
    if (!pending) return;
    await storage.addWorkout({
      log_date: dateKey(date),
      type: pending.type,
      duration_minutes: pending.duration_minutes,
      calories: pending.calories,
      avg_hr: pending.avg_hr,
      max_hr: pending.max_hr,
      notes: pending.notes,
    });
    setPending(null);
    onReload();
  };

  const remove = async (id: string) => {
    await storage.removeWorkout(id);
    onReload();
  };

  const addManual = async (w: any) => {
    await storage.addWorkout({
      log_date: dateKey(date),
      ...w,
    });
    setShowManual(false);
    onReload();
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <header className="mb-6 border-b-2 border-stone-900 pb-4">
        <h1 className="display-font text-3xl font-extrabold tracking-tight">training.</h1>
        <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">{formatDate(date)}</p>
      </header>

      <div className="mb-4 p-3 bg-amber-50 border-l-2 border-amber-600 rounded-sm">
        <p className="text-xs text-amber-900 leading-relaxed">
          <span className="font-semibold">Honest framing:</span> Wearable calorie estimates are typically off by 15-40%. Log them for compliance tracking and pattern recognition, not as numbers to subtract from intake. Your TDEE already accounts for training.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 border-l-2 border-red-600 bg-red-50 text-sm text-red-900 rounded-sm">{error}</div>
      )}

      {pending && (
        <div className="mb-6 border-2 border-stone-900 bg-amber-50 p-4 rounded-sm">
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-3">Confirm workout</h2>
          <div className="space-y-2 mb-4">
            <div className="bg-white p-3 border border-stone-300 rounded-sm space-y-2">
              <input type="text" value={pending.type} onChange={(e) => setPending({ ...pending, type: e.target.value })} className="w-full text-sm font-medium border-b border-stone-300 outline-none px-1 py-1" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-stone-500 uppercase tracking-wide mb-1">Duration (min)</label>
                  <input type="number" value={pending.duration_minutes} onChange={(e) => setPending({ ...pending, duration_minutes: Number(e.target.value) })} className="w-full px-2 py-1 border border-stone-300 rounded-sm outline-none" />
                </div>
                <div>
                  <label className="block text-stone-500 uppercase tracking-wide mb-1">Calories</label>
                  <input type="number" value={pending.calories} onChange={(e) => setPending({ ...pending, calories: Number(e.target.value) })} className="w-full px-2 py-1 border border-stone-300 rounded-sm outline-none" />
                </div>
                <div>
                  <label className="block text-stone-500 uppercase tracking-wide mb-1">Avg HR</label>
                  <input type="number" value={pending.avg_hr || ''} onChange={(e) => setPending({ ...pending, avg_hr: Number(e.target.value) || null })} className="w-full px-2 py-1 border border-stone-300 rounded-sm outline-none" />
                </div>
                <div>
                  <label className="block text-stone-500 uppercase tracking-wide mb-1">Max HR</label>
                  <input type="number" value={pending.max_hr || ''} onChange={(e) => setPending({ ...pending, max_hr: Number(e.target.value) || null })} className="w-full px-2 py-1 border border-stone-300 rounded-sm outline-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={confirm} className="flex-1 bg-stone-900 text-stone-50 py-3 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
              <Check size={14} /> Log workout
            </button>
            <button onClick={() => setPending(null)} className="px-4 py-3 border border-stone-900 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {showManual && <ManualWorkoutCard onAdd={addManual} onCancel={() => setShowManual(false)} />}

      {!pending && !showManual && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => fileRef.current?.click()} disabled={analyzing} className="bg-stone-900 text-stone-50 py-4 text-xs uppercase tracking-widest font-semibold disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm">
            {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing</> : <><Camera size={16} /> Screenshot</>}
          </button>
          <button onClick={() => setShowManual(true)} className="border-2 border-stone-900 py-4 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 rounded-sm">
            <Plus size={16} /> Manual
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="text-center py-12 text-stone-400 border border-dashed border-stone-300 rounded-sm">
          <p className="text-sm">No workouts logged for {formatDate(date).toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div key={w.id} className="p-4 bg-white border border-stone-200 rounded-sm group">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{w.type}</div>
                  <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{w.duration_minutes} min</span>
                    <span>{w.calories} cal*</span>
                    {w.avg_hr && <span>avg HR {w.avg_hr}</span>}
                    {w.max_hr && <span>max HR {w.max_hr}</span>}
                  </div>
                  {w.notes && <div className="text-xs text-stone-500 mt-2 italic">{w.notes}</div>}
                </div>
                <button onClick={() => remove(w.id!)} className="text-stone-300 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualWorkoutCard({ onAdd, onCancel }: { onAdd: (w: any) => void; onCancel: () => void }) {
  const [w, setW] = useState({ type: '', duration_minutes: '', calories: '', avg_hr: '', max_hr: '', notes: '' });
  const submit = () => {
    if (!w.type.trim()) return;
    onAdd({
      type: w.type,
      duration_minutes: Number(w.duration_minutes) || 0,
      calories: Number(w.calories) || 0,
      avg_hr: Number(w.avg_hr) || null,
      max_hr: Number(w.max_hr) || null,
      notes: w.notes,
    });
  };
  return (
    <div className="mb-6 border-2 border-stone-900 p-4 rounded-sm">
      <h2 className="text-xs uppercase tracking-widest font-semibold mb-3">Manual workout</h2>
      <div className="space-y-3">
        <input type="text" placeholder="Type (e.g. Lift, Rowing)" value={w.type} onChange={(e) => setW({ ...w, type: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="Min" value={w.duration_minutes} onChange={(e) => setW({ ...w, duration_minutes: e.target.value })} className="px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
          <input type="number" placeholder="Cal*" value={w.calories} onChange={(e) => setW({ ...w, calories: e.target.value })} className="px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
          <input type="number" placeholder="Avg HR" value={w.avg_hr} onChange={(e) => setW({ ...w, avg_hr: e.target.value })} className="px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
          <input type="number" placeholder="Max HR" value={w.max_hr} onChange={(e) => setW({ ...w, max_hr: e.target.value })} className="px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
        </div>
        <input type="text" placeholder="Notes (optional)" value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-sm outline-none text-sm" />
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 bg-stone-900 text-stone-50 py-2 text-xs uppercase tracking-widest font-semibold">Add</button>
          <button onClick={onCancel} className="px-4 py-2 border border-stone-900 text-xs uppercase tracking-widest font-semibold">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS
// ============================================================================
function SettingsView({
  settings, onSave, userEmail, onSignOut,
}: {
  settings: Settings;
  onSave: (s: Settings) => Promise<void>;
  userEmail: string;
  onSignOut: () => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);

  const recalculate = (updated: Settings): Settings => {
    const bmr = calculateBMR(updated.weight, updated.height_in, updated.age, updated.sex);
    const tdee = calculateTDEE(bmr, updated.activity);
    const goal = GOALS.find((g) => g.id === updated.goal)!;
    const calorieTarget = Math.round(tdee + goal.adjustment);
    const weightKg = updated.weight * 0.453592;
    const proteinTarget = Math.round(weightKg * updated.protein_per_kg);
    return {
      ...updated,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calorie_target: calorieTarget,
      protein_target: proteinTarget,
      carb_target: Math.round((calorieTarget * 0.4) / 4),
      fat_target: Math.round((calorieTarget * 0.3) / 9),
    };
  };

  const update = (field: string, value: any) => {
    setDraft(recalculate({ ...draft, [field]: value }));
  };

  const save = async () => {
    await onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <header className="mb-6 border-b-2 border-stone-900 pb-4">
        <h1 className="display-font text-3xl font-extrabold tracking-tight">settings.</h1>
        <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">stack & targets</p>
      </header>

      <section className="mb-6 p-4 bg-stone-900 text-stone-50 rounded-sm">
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-3">Calculated targets</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-stone-400">Calories</div>
            <div className="display-font text-3xl font-bold">{draft.calorie_target}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Protein</div>
            <div className="display-font text-3xl font-bold">{draft.protein_target}g</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-stone-400">
          BMR {draft.bmr} · TDEE {draft.tdee} · Goal {draft.goal.replace('_', ' ')}
        </div>
      </section>

      <section className="space-y-4 mb-6">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-stone-700">Stats</h2>
        <Field label="Age" type="number" value={draft.age} onChange={(v) => update('age', Number(v))} />
        <Field label="Weight (lbs)" type="number" value={draft.weight} onChange={(v) => update('weight', Number(v))} />
        <Field label="Height (inches)" type="number" value={draft.height_in} onChange={(v) => update('height_in', Number(v))} />
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-stone-700 mb-3">Goal</h2>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button key={g.id} onClick={() => update('goal', g.id)} className={`p-3 border-2 rounded-sm text-left transition-colors ${draft.goal === g.id ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300'}`}>
              <div className="text-sm font-semibold">{g.label}</div>
              <div className={`text-xs ${draft.goal === g.id ? 'text-stone-300' : 'text-stone-500'}`}>
                {g.adjustment > 0 ? '+' : ''}{g.adjustment} cal
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-stone-700 mb-3">Protein per kg</h2>
        <div className="flex gap-2">
          {[1.6, 1.8, 2.0, 2.2].map((v) => (
            <button key={v} onClick={() => update('protein_per_kg', v)} className={`flex-1 py-3 border-2 rounded-sm text-sm font-semibold transition-colors ${draft.protein_per_kg === v ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300'}`}>
              {v}
            </button>
          ))}
        </div>
      </section>

      <button onClick={save} className={`w-full py-4 text-xs uppercase tracking-widest font-semibold rounded-sm transition-colors mb-6 ${saved ? 'bg-green-600 text-white' : 'bg-stone-900 text-stone-50'}`}>
        {saved ? '✓ Saved' : 'Save changes'}
      </button>

      <section className="pt-6 border-t border-stone-200">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-stone-700 mb-3">Account</h2>
        <div className="p-3 bg-white border border-stone-200 rounded-sm mb-3">
          <div className="text-xs text-stone-500 mb-1">Signed in as</div>
          <div className="text-sm font-medium text-stone-900 break-all">{userEmail}</div>
        </div>
        <button onClick={onSignOut} className="w-full py-3 border border-stone-300 text-stone-700 text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-stone-100 flex items-center justify-center gap-2">
          <LogOut size={14} /> Sign out
        </button>
      </section>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-stone-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-sm focus:border-stone-900 outline-none text-sm" />
    </div>
  );
}

// ============================================================================
// BOTTOM NAV
// ============================================================================
function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: { id: View; label: string; icon: any }[] = [
    { id: 'today', label: 'Today', icon: Target },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'workout', label: 'Training', icon: Dumbbell },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-stone-900 px-2 py-2 z-50">
      <div className="max-w-2xl mx-auto flex justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)} className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${active ? 'text-stone-900' : 'text-stone-400'}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className={`text-[10px] uppercase tracking-wider ${active ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
