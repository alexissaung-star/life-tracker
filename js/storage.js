// ============================================================
// LIFE TRACKER - Storage Module
// Handles all localStorage CRUD, schema, and data management
// ============================================================

const STORAGE_KEYS = {
  HABITS: 'lt_habits',
  GOALS: 'lt_goals',
  DAILY_LOGS: 'lt_daily_logs',
  PLAYER: 'lt_player',
  SETTINGS: 'lt_settings',
  BADGES: 'lt_badges',
};

// ── RANK SYSTEM ──────────────────────────────────────────────
export const RANKS = [
  { rank: 'E', label: 'E-Rank Hunter', levels: 10, xpPerLevel: 100, color: '#9ca3af', glow: '#9ca3af44' },
  { rank: 'D', label: 'D-Rank Hunter', levels: 20, xpPerLevel: 200, color: '#60a5fa', glow: '#60a5fa44' },
  { rank: 'C', label: 'C-Rank Hunter', levels: 30, xpPerLevel: 350, color: '#34d399', glow: '#34d39944' },
  { rank: 'B', label: 'B-Rank Hunter', levels: 40, xpPerLevel: 500, color: '#fbbf24', glow: '#fbbf2444' },
  { rank: 'A', label: 'A-Rank Hunter', levels: 50, xpPerLevel: 750, color: '#f97316', glow: '#f9731644' },
  { rank: 'S', label: 'S-Rank Hunter', levels: 60, xpPerLevel: 1000, color: '#c084fc', glow: '#c084fc44' },
  { rank: 'SS', label: 'SS-Rank Hunter', levels: 70, xpPerLevel: 1500, color: '#f472b6', glow: '#f472b644' },
  { rank: 'SSS', label: 'SSS-Rank Hunter', levels: 1, xpPerLevel: 999999, color: '#fff', glow: '#ffffff44' },
];

export const STATS = ['Strength', 'Intelligence', 'Agility', 'Endurance', 'Wealth'];

export const HABIT_TYPES = {
  BOOLEAN: 'boolean',
  COUNTER: 'counter',
  TIMER: 'timer',
  RATING: 'rating',
  COOK_LOG: 'cook_log',
  LEARN_LOG: 'learn_log',
  FINANCE: 'finance',
};

export const CATEGORIES = {
  HEALTH: { label: 'Health & Fitness', stat: 'Strength', icon: '💪', color: '#ef4444' },
  CAREER: { label: 'Career & Productivity', stat: 'Agility', icon: '⚡', color: '#f59e0b' },
  FINANCE: { label: 'Finances', stat: 'Wealth', icon: '💰', color: '#10b981' },
  LEARNING: { label: 'Personal Growth', stat: 'Intelligence', icon: '🧠', color: '#8b5cf6' },
};

// ── DEFAULT DATA ──────────────────────────────────────────────
const DEFAULT_PLAYER = {
  name: 'Hunter',
  rank: 'E',
  level: 1,
  xp: 0,
  totalXP: 0,
  stats: { Strength: 1, Intelligence: 1, Agility: 1, Endurance: 1, Wealth: 1 },
  rankLocked: false, // true when XP cap reached — must complete dungeon quest
  dungeonQuestActive: null,
  dungeonQuestCompleted: [],
  createdAt: new Date().toISOString(),
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  playerName: 'Hunter',
  pivotCheckMode: 'smart', // 'daily' | 'weekly' | 'smart' | 'manual'
};

// ── PLAYER ────────────────────────────────────────────────────
export function getPlayer() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYER) || JSON.stringify(DEFAULT_PLAYER));
}

export function savePlayer(player) {
  localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(player));
}

export function awardXP(amount, stat) {
  const player = getPlayer();
  player.xp += amount;
  player.totalXP += amount;
  if (stat && player.stats[stat] !== undefined) {
    player.stats[stat] = Math.min(100, (player.stats[stat] || 1) + Math.ceil(amount / 10));
  }
  // Endurance always ticks with any habit completion
  player.stats.Endurance = Math.min(100, (player.stats.Endurance || 1) + 1);

  // Check level-up within current rank
  const rankDef = RANKS.find(r => r.rank === player.rank);
  if (rankDef) {
    const xpForNextLevel = rankDef.xpPerLevel;
    while (player.xp >= xpForNextLevel && player.level < rankDef.levels) {
      player.xp -= xpForNextLevel;
      player.level += 1;
    }
    // Hit the level cap for this rank — lock until dungeon quest complete
    if (player.level >= rankDef.levels && player.xp >= xpForNextLevel) {
      player.xp = xpForNextLevel - 1; // Cap XP — can't advance without dungeon
      player.rankLocked = true;
    }
  }
  savePlayer(player);
  return player;
}

export function completeRankUp(player) {
  const currentRankIdx = RANKS.findIndex(r => r.rank === player.rank);
  if (currentRankIdx < RANKS.length - 1) {
    const nextRank = RANKS[currentRankIdx + 1];
    player.rank = nextRank.rank;
    player.level = 1;
    player.xp = 0;
    player.rankLocked = false;
    player.dungeonQuestCompleted.push(player.dungeonQuestActive);
    player.dungeonQuestActive = null;
    savePlayer(player);
  }
  return player;
}

// ── HABITS ───────────────────────────────────────────────────
export function getHabits() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS) || '[]');
}

export function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export function addHabit(habit) {
  const habits = getHabits();
  const newHabit = {
    id: crypto.randomUUID(),
    name: habit.name,
    category: habit.category || 'HEALTH',
    type: habit.type || HABIT_TYPES.BOOLEAN,
    targetValue: habit.targetValue || 1,
    unit: habit.unit || '',
    subItems: habit.subItems || [],
    xpReward: habit.xpReward || 20,
    frequency: habit.frequency || 'daily',
    streak: 0,
    longestStreak: 0,
    archived: false,
    pinned: habit.pinned || false,
    createdAt: new Date().toISOString(),
    whyPrompt: habit.whyPrompt || false, // If true, ask "why not?" on skip
    icon: habit.icon || null,
  };
  habits.push(newHabit);
  saveHabits(habits);
  return newHabit;
}

export function updateHabit(id, changes) {
  const habits = getHabits();
  const idx = habits.findIndex(h => h.id === id);
  if (idx > -1) {
    habits[idx] = { ...habits[idx], ...changes };
    saveHabits(habits);
    return habits[idx];
  }
  return null;
}

export function deleteHabit(id) {
  const habits = getHabits().filter(h => h.id !== id);
  saveHabits(habits);
}

export function archiveHabit(id) {
  return updateHabit(id, { archived: true });
}

export function getActiveHabits() {
  return getHabits().filter(h => !h.archived);
}

// ── GOALS ────────────────────────────────────────────────────
export function getGoals() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]');
}

export function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
}

export function addGoal(goal) {
  const goals = getGoals();
  const newGoal = {
    id: crypto.randomUUID(),
    name: goal.name,
    description: goal.description || '',
    category: goal.category || 'HEALTH',
    targetDate: goal.targetDate || null,
    milestones: (goal.milestones || []).map(m => ({
      id: crypto.randomUUID(),
      text: m,
      completed: false,
      completedAt: null,
    })),
    linkedHabitIds: goal.linkedHabitIds || [],
    completed: false,
    paused: false,
    pivotHistory: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    xpReward: goal.xpReward || 100,
  };
  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
}

export function updateGoal(id, changes) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx > -1) {
    goals[idx] = { ...goals[idx], ...changes };
    saveGoals(goals);
    return goals[idx];
  }
  return null;
}

export function pivotGoal(id, { reason, changes }) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx > -1) {
    const pivotEntry = {
      date: new Date().toISOString(),
      reason,
      before: {
        name: goals[idx].name,
        targetDate: goals[idx].targetDate,
        description: goals[idx].description,
        milestones: JSON.parse(JSON.stringify(goals[idx].milestones)),
      },
      after: changes,
    };
    goals[idx] = { ...goals[idx], ...changes };
    goals[idx].pivotHistory = [...(goals[idx].pivotHistory || []), pivotEntry];
    saveGoals(goals);
    return goals[idx];
  }
  return null;
}

export function completeMilestone(goalId, milestoneId) {
  const goals = getGoals();
  const gIdx = goals.findIndex(g => g.id === goalId);
  if (gIdx > -1) {
    const mIdx = goals[gIdx].milestones.findIndex(m => m.id === milestoneId);
    if (mIdx > -1) {
      goals[gIdx].milestones[mIdx].completed = !goals[gIdx].milestones[mIdx].completed;
      goals[gIdx].milestones[mIdx].completedAt = goals[gIdx].milestones[mIdx].completed
        ? new Date().toISOString() : null;
      saveGoals(goals);
      return goals[gIdx];
    }
  }
  return null;
}

export function completeGoal(id) {
  return updateGoal(id, { completed: true, completedAt: new Date().toISOString() });
}

export function deleteGoal(id) {
  const goals = getGoals().filter(g => g.id !== id);
  saveGoals(goals);
}

export function getActiveGoals() {
  return getGoals().filter(g => !g.completed && !g.paused);
}

// ── DAILY LOGS ───────────────────────────────────────────────
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyLogs() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_LOGS) || '{}');
}

export function getLog(dateKey) {
  const logs = getDailyLogs();
  return logs[dateKey] || {
    date: dateKey,
    completedHabits: {},
    mood: null,
    reflectionNote: '',
    pivotReflection: { answered: false, note: '' },
    skippedReasons: {},
  };
}

export function saveDailyLog(dateKey, log) {
  const logs = getDailyLogs();
  logs[dateKey] = log;
  localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
}

export function logHabit(habitId, value, skipReason) {
  const key = getTodayKey();
  const log = getLog(key);

  if (skipReason) {
    log.skippedReasons[habitId] = skipReason;
    delete log.completedHabits[habitId];
  } else {
    log.completedHabits[habitId] = value;
    delete log.skippedReasons[habitId];
  }
  saveDailyLog(key, log);

  // Update streak
  const habits = getHabits();
  const hIdx = habits.findIndex(h => h.id === habitId);
  if (hIdx > -1 && !skipReason) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().split('T')[0];
    const yLog = getLog(yKey);
    const hadYesterday = yLog.completedHabits[habitId] !== undefined;
    if (hadYesterday) {
      habits[hIdx].streak += 1;
    } else {
      habits[hIdx].streak = 1;
    }
    habits[hIdx].longestStreak = Math.max(habits[hIdx].streak, habits[hIdx].longestStreak || 0);
    saveHabits(habits);
  }
  return log;
}

export function logMood(mood, note) {
  const key = getTodayKey();
  const log = getLog(key);
  log.mood = mood;
  if (note !== undefined) log.reflectionNote = note;
  saveDailyLog(key, log);
}

export function logPivotReflection(note) {
  const key = getTodayKey();
  const log = getLog(key);
  log.pivotReflection = { answered: true, note };
  saveDailyLog(key, log);
}

// ── ANALYTICS ────────────────────────────────────────────────
export function getAnalytics(days = 30) {
  const logs = getDailyLogs();
  const habits = getHabits();
  const result = { daily: [], completionRates: {}, streaks: {}, moodHistory: [] };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const log = logs[key] || { completedHabits: {}, mood: null };
    const activeHabits = habits.filter(h => !h.archived);
    const completed = Object.keys(log.completedHabits).length;
    const total = activeHabits.length;
    result.daily.push({ date: key, completed, total, rate: total > 0 ? completed / total : 0 });
    if (log.mood) result.moodHistory.push({ date: key, mood: log.mood });
  }

  habits.filter(h => !h.archived).forEach(h => {
    result.streaks[h.id] = h.streak || 0;
    let completedCount = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const log = logs[key] || { completedHabits: {} };
      if (log.completedHabits[h.id] !== undefined) completedCount++;
    }
    result.completionRates[h.id] = completedCount / days;
  });

  return result;
}

// ── SMART PIVOT CHECK ────────────────────────────────────────
export function shouldSuggestPivot() {
  const goals = getActiveGoals();
  const logs = getDailyLogs();
  const suggestions = [];

  goals.forEach(goal => {
    if (!goal.linkedHabitIds || goal.linkedHabitIds.length === 0) return;
    goal.linkedHabitIds.forEach(habitId => {
      let missedDays = 0;
      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const log = logs[key] || { completedHabits: {} };
        if (log.completedHabits[habitId] === undefined) missedDays++;
      }
      if (missedDays >= 4) {
        const habit = getHabits().find(h => h.id === habitId);
        suggestions.push({ goal, habit, missedDays });
      }
    });
  });

  return suggestions;
}

// ── BADGES ───────────────────────────────────────────────────
export const BADGE_DEFINITIONS = [
  { id: 'first_login', name: 'Awakened', desc: 'You began your journey', icon: '⚡', xp: 0 },
  { id: 'streak_7', name: '7-Day Flame', desc: '7-day streak on any habit', icon: '🔥', xp: 50 },
  { id: 'streak_30', name: 'Month of Power', desc: '30-day streak', icon: '💎', xp: 200 },
  { id: 'streak_100', name: 'Legendary', desc: '100-day streak', icon: '👑', xp: 1000 },
  { id: 'first_goal', name: 'Visionary', desc: 'Created your first goal', icon: '🎯', xp: 10 },
  { id: 'first_goal_complete', name: 'Goal Slayer', desc: 'Completed your first goal', icon: '🏆', xp: 100 },
  { id: 'first_pivot', name: 'Strategist', desc: 'Pivoted a goal', icon: '🔄', xp: 30 },
  { id: 'rank_d', name: 'Rising Hunter', desc: 'Reached D-Rank', icon: '🔵', xp: 0 },
  { id: 'rank_c', name: 'Elite Hunter', desc: 'Reached C-Rank', icon: '🟢', xp: 0 },
  { id: 'rank_b', name: 'Shadow Hunter', desc: 'Reached B-Rank', icon: '🟡', xp: 0 },
  { id: 'rank_a', name: 'Monarch', desc: 'Reached A-Rank', icon: '🟠', xp: 0 },
  { id: 'rank_s', name: 'National-Level Hunter', desc: 'Reached S-Rank', icon: '🟣', xp: 0 },
];

export function getEarnedBadges() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
}

export function awardBadge(badgeId) {
  const earned = getEarnedBadges();
  if (earned.find(b => b.id === badgeId)) return null;
  const def = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (!def) return null;
  earned.push({ ...def, earnedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(earned));
  return def;
}

// ── SETTINGS ─────────────────────────────────────────────────
export function getSettings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS));
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...getSettings(), ...settings }));
}

// ── IMPORT / EXPORT ──────────────────────────────────────────
export function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    player: getPlayer(),
    habits: getHabits(),
    goals: getGoals(),
    dailyLogs: getDailyLogs(),
    badges: getEarnedBadges(),
    settings: getSettings(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `life-tracker-backup-${getTodayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.player) savePlayer(data.player);
    if (data.habits) saveHabits(data.habits);
    if (data.goals) saveGoals(data.goals);
    if (data.dailyLogs) localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(data.dailyLogs));
    if (data.badges) localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(data.badges));
    if (data.settings) saveSettings(data.settings);
    return true;
  } catch (e) {
    return false;
  }
}

// ── SEED DATA (first run) ────────────────────────────────────
export function seedDefaultData() {
  if (getHabits().length > 0) return;

  addHabit({ name: 'Workout', category: 'HEALTH', type: HABIT_TYPES.TIMER, targetValue: 30, unit: 'mins', xpReward: 30, whyPrompt: true, icon: '💪' });
  addHabit({ name: 'Water Intake', category: 'HEALTH', type: HABIT_TYPES.COUNTER, targetValue: 8, unit: 'glasses', xpReward: 15, icon: '💧' });
  addHabit({ name: 'Meal Prep / Home Cooking', category: 'HEALTH', type: HABIT_TYPES.COOK_LOG, targetValue: 1, unit: 'meals', xpReward: 20, icon: '🍳' });
  addHabit({ name: 'Learning (AI / Skills)', category: 'LEARNING', type: HABIT_TYPES.LEARN_LOG, targetValue: 1, unit: 'session', xpReward: 35, icon: '🧠' });
  addHabit({ name: 'Daily Planning', category: 'CAREER', type: HABIT_TYPES.BOOLEAN, targetValue: 1, unit: '', xpReward: 10, icon: '📋' });
  addHabit({ name: 'Budget Check', category: 'FINANCE', type: HABIT_TYPES.FINANCE, targetValue: 1, unit: '', xpReward: 15, icon: '💰' });

  addGoal({
    name: 'Build My AI Skills',
    description: 'Learn AI fundamentals and apply them to real projects',
    category: 'LEARNING',
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    milestones: ['Complete an intro AI/ML course', 'Build a small AI project', 'Apply AI skills at work or side project'],
    linkedHabitIds: [getHabits().find(h => h.name === 'Learning (AI / Skills)')?.id].filter(Boolean),
    xpReward: 200,
  });

  awardBadge('first_login');
}
