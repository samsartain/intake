export const dateKey = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatDate = (date: Date): string => {
  const today = new Date();
  const d = new Date(date);
  if (dateKey(d) === dateKey(today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(d) === dateKey(yesterday)) return 'Yesterday';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${mm}-${dd}-${yyyy}`;
};

export const formatUSDate = (date: Date): string => {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

export const calculateBMR = (
  weightLbs: number,
  heightIn: number,
  age: number,
  sex: string = 'male'
): number => {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn * 2.54;
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
};

export const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return bmr * (multipliers[activityLevel] || 1.55);
};

export const calculateAdjustedTDEE = (
  weightHistory: { date: string; weight: number }[],
  intakeHistory: { date: string; calories: number }[]
): number | null => {
  if (weightHistory.length < 14) return null;

  const sortedWeights = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const sortedIntake = [...intakeHistory].sort((a, b) => a.date.localeCompare(b.date));

  const firstWeek = sortedWeights.slice(0, 7);
  const lastWeek = sortedWeights.slice(-7);
  const firstAvg = firstWeek.reduce((s, w) => s + w.weight, 0) / firstWeek.length;
  const lastAvg = lastWeek.reduce((s, w) => s + w.weight, 0) / lastWeek.length;

  const weightChangeLbs = lastAvg - firstAvg;
  const days = Math.max(1, sortedWeights.length - 1);

  const calorieAdjustment = (weightChangeLbs * 3500) / days;
  const avgIntake = sortedIntake.reduce((s, d) => s + d.calories, 0) / sortedIntake.length;

  return Math.round(avgIntake - calorieAdjustment);
};

export const MEAL_CATEGORIES = [
  { id: 'breakfast', label: 'Breakfast', order: 1 },
  { id: 'lunch', label: 'Lunch', order: 2 },
  { id: 'dinner', label: 'Dinner', order: 3 },
  { id: 'snack', label: 'Snack', order: 4 },
  { id: 'pre_workout', label: 'Pre-Workout', order: 5 },
  { id: 'post_workout', label: 'Post-Workout', order: 6 },
];

export const GOALS = [
  { id: 'cut', label: 'Cut', adjustment: -400, desc: 'Lose fat, preserve muscle' },
  { id: 'recomp', label: 'Recomp', adjustment: 0, desc: 'Slow body composition change' },
  { id: 'lean_bulk', label: 'Lean Bulk', adjustment: 250, desc: 'Slow muscle gain' },
  { id: 'bulk', label: 'Bulk', adjustment: 500, desc: 'Aggressive muscle gain' },
  { id: 'maintain', label: 'Maintain', adjustment: 0, desc: 'Hold weight steady' },
];
