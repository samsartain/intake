import { createClient } from './supabase-browser';

// Storage layer that maps the artifact's key-value API to Supabase tables
// Same shape as the original storage object so components don't need to change much

export type Settings = {
  user_id?: string;
  name?: string;
  age: number;
  sex: string;
  height_in: number;
  weight: number;
  activity: string;
  goal: string;
  protein_per_kg: number;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
};

export type FoodEntry = {
  id?: string;
  user_id?: string;
  log_date: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightLog = {
  user_id?: string;
  log_date: string;
  weight: number;
};

export type Workout = {
  id?: string;
  user_id?: string;
  log_date: string;
  type: string;
  duration_minutes: number;
  calories: number;
  avg_hr: number | null;
  max_hr: number | null;
  notes: string;
};

export const dateKey = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// ============================================================================
// SETTINGS
// ============================================================================
export async function getSettings(): Promise<Settings | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Settings;
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('settings')
    .upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' });

  return !error;
}

// ============================================================================
// FOOD ENTRIES
// ============================================================================
export async function getFoodEntries(date: Date): Promise<FoodEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', dateKey(date))
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as FoodEntry[];
}

export async function addFoodEntry(entry: Omit<FoodEntry, 'id' | 'user_id'>): Promise<FoodEntry | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('food_entries')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single();

  if (error || !data) return null;
  return data as FoodEntry;
}

export async function addFoodEntries(entries: Omit<FoodEntry, 'id' | 'user_id'>[]): Promise<FoodEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('food_entries')
    .insert(entries.map(e => ({ ...e, user_id: user.id })))
    .select();

  if (error || !data) return [];
  return data as FoodEntry[];
}

export async function removeFoodEntry(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  return !error;
}

// Range query for history view
export async function getFoodEntriesInRange(startDate: Date, endDate: Date): Promise<FoodEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', dateKey(startDate))
    .lte('log_date', dateKey(endDate));

  if (error || !data) return [];
  return data as FoodEntry[];
}

// ============================================================================
// WEIGHT
// ============================================================================
export async function getWeight(date: Date): Promise<WeightLog | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', dateKey(date))
    .maybeSingle();

  if (error || !data) return null;
  return data as WeightLog;
}

export async function saveWeight(date: Date, weight: number): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('weight_logs')
    .upsert(
      { user_id: user.id, log_date: dateKey(date), weight },
      { onConflict: 'user_id,log_date' }
    );

  return !error;
}

export async function getWeightsInRange(startDate: Date, endDate: Date): Promise<WeightLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', dateKey(startDate))
    .lte('log_date', dateKey(endDate))
    .order('log_date', { ascending: true });

  if (error || !data) return [];
  return data as WeightLog[];
}

// ============================================================================
// WORKOUTS
// ============================================================================
export async function getWorkouts(date: Date): Promise<Workout[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', dateKey(date))
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as Workout[];
}

export async function addWorkout(workout: Omit<Workout, 'id' | 'user_id'>): Promise<Workout | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('workouts')
    .insert({ ...workout, user_id: user.id })
    .select()
    .single();

  if (error || !data) return null;
  return data as Workout;
}

export async function removeWorkout(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  return !error;
}
