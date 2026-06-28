// ============================================================
// LIFE TRACKER — ui.js
// All rendering logic: habits, goals, analytics, charts, toasts
// ============================================================
import {
  getActiveHabits, getHabits, logHabit, getLog, getTodayKey,
  logMood, logPivotReflection, getPlayer, awardXP, awardBadge,
  getAnalytics, getEarnedBadges, BADGE_DEFINITIONS, RANKS, STATS,
  CATEGORIES, HABIT_TYPES, getActiveGoals, getGoals,
  completeMilestone, completeGoal, shouldSuggestPivot,
} from './storage.js';

// ── TOAST ─────────────────────────────────────────────────
export function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', xp: '⚡', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── CONFETTI ──────────────────────────────────────────────
export function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 4 + 2,
    color: ['#7c3aed','#60a5fa','#34d399','#fbbf24','#f472b6'][Math.floor(Math.random() * 5)],
    size: Math.random() * 7 + 4,
    rotation: Math.random() * 360,
  }));
  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.rotation += 3;
    });
    if (pieces.some(p => p.y < canvas.height)) frame = requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); cancelAnimationFrame(frame); }
  }
  draw();
}

// ── PLAYER HEADER ─────────────────────────────────────────
export function renderPlayerHeader() {
  const player = getPlayer();
  const rankDef = RANKS.find(r => r.rank === player.rank);
  const rankEl = document.querySelector('.player-rank-badge');
  const nameEl = document.querySelector('.player-name-small');
  if (rankEl) { rankEl.textContent = player.rank; rankEl.style.color = rankDef.color; rankEl.style.borderColor = rankDef.color; }
  if (nameEl) { nameEl.textContent = getPlayer().name || 'Hunter'; }
}

// ── PLAYER CARD ───────────────────────────────────────────
export function renderPlayerCard() {
  const player = getPlayer();
  const rankDef = RANKS.find(r => r.rank === player.rank);
  const totalLevelsInRank = rankDef.levels;
  const xpPct = Math.min(100, (player.xp / rankDef.xpPerLevel) * 100);
  const card = document.getElementById('player-card');
  if (!card) return;
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="player-rank-big" style="color:${rankDef.color};text-shadow:0 0 30px ${rankDef.color}88;">
          ${player.rank}
        </div>
        <div class="player-level-label">${rankDef.label} · Lv. ${player.level}</div>
        <div class="player-xp-text">${player.xp} / ${rankDef.xpPerLevel} XP${player.rankLocked ? ' · <span style="color:#fbbf24">⚔️ RANK LOCKED</span>' : ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">TOTAL XP</div>
        <div style="font-size:1.3rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent-light);">${player.totalXP.toLocaleString()}</div>
      </div>
    </div>
    <div class="xp-bar-wrap" style="margin-top:0.8rem;">
      <div class="xp-bar-fill" style="width:${xpPct}%"></div>
    </div>
    <div class="stat-row">
      ${STATS.map(s => `
        <div class="stat-chip" style="border-color:rgba(255,255,255,0.1);">
          <span style="font-size:0.9rem">${statIcon(s)}</span>
          <span style="color:${statColor(s)}">${s.slice(0,3).toUpperCase()}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;">${player.stats[s]||1}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function statIcon(s) {
  return { Strength:'💪', Intelligence:'🧠', Agility:'⚡', Endurance:'🛡️', Wealth:'💰' }[s] || '⭐';
}
function statColor(s) {
  return { Strength:'var(--stat-strength)', Intelligence:'var(--stat-intelligence)', Agility:'var(--stat-agility)', Endurance:'var(--stat-endurance)', Wealth:'var(--stat-wealth)' }[s] || '#fff';
}

// ── DUNGEON BANNER ────────────────────────────────────────
export function renderDungeonBanner() {
  const player = getPlayer();
  const container = document.getElementById('dungeon-banner-wrap');
  if (!container) return;
  if (player.rankLocked) {
    const nextRank = RANKS[RANKS.findIndex(r => r.rank === player.rank) + 1];
    container.innerHTML = `
      <div class="dungeon-banner" id="dungeon-banner-btn" style="cursor:pointer;">
        <div class="dungeon-icon">⚔️</div>
        <div class="dungeon-text">
          <h4>RANK-UP DUNGEON AVAILABLE</h4>
          <p>Complete a 30-day Boss Quest to break through to ${nextRank?.rank || 'SSS'}-Rank</p>
        </div>
        <span style="margin-left:auto;color:#c084fc;font-size:1.2rem;">›</span>
      </div>`;
    container.querySelector('#dungeon-banner-btn').addEventListener('click', () => openDungeonModal());
  } else {
    container.innerHTML = '';
  }
}

function openDungeonModal() {
  const player = getPlayer();
  const rankDef = RANKS.find(r => r.rank === player.rank);
  showModal('dungeon-modal');
}

// ── PIVOT PROMPT ──────────────────────────────────────────
export function renderPivotPrompt() {
  const container = document.getElementById('pivot-prompt-wrap');
  if (!container) return;
  const suggestions = shouldSuggestPivot();
  const todayLog = getLog(getTodayKey());
  if (suggestions.length === 0 || todayLog.pivotReflection?.answered) {
    container.innerHTML = ''; return;
  }
  const s = suggestions[0];
  container.innerHTML = `
    <div class="pivot-prompt">
      <h4>🔄 Goal Pivot Check</h4>
      <p>You've missed <strong>${s.habit?.name || 'a linked habit'}</strong> for <strong>${s.missedDays} of the last 7 days</strong>.
         Has your goal <em>"${s.goal.name}"</em> shifted?</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="pivot-yes-btn">🔄 Pivot this goal</button>
        <button class="btn btn-ghost btn-sm" id="pivot-no-btn">✅ Still on track</button>
        <button class="btn btn-ghost btn-sm" id="pivot-snooze-btn">⏸ Snooze</button>
      </div>
    </div>`;
  container.querySelector('#pivot-yes-btn').addEventListener('click', () => {
    openPivotModal(s.goal.id);
    container.innerHTML = '';
  });
  container.querySelector('#pivot-no-btn').addEventListener('click', () => {
    logPivotReflection('Still on track - intentional.');
    container.innerHTML = '';
    showToast('Noted! Keep pushing. 💪', 'success');
  });
  container.querySelector('#pivot-snooze-btn').addEventListener('click', () => {
    logPivotReflection('Snoozed.');
    container.innerHTML = '';
  });
}

// ── MOOD PICKER ───────────────────────────────────────────
export function renderMoodPicker() {
  const el = document.getElementById('mood-picker');
  if (!el) return;
  const todayLog = getLog(getTodayKey());
  const moods = [
    { val: 1, emoji: '😴', label: 'Dead' },
    { val: 2, emoji: '😞', label: 'Low' },
    { val: 3, emoji: '😐', label: 'Okay' },
    { val: 4, emoji: '😊', label: 'Good' },
    { val: 5, emoji: '🔥', label: 'Lit' },
  ];
  el.innerHTML = `
    <div class="mood-row">
      ${moods.map(m => `
        <button class="mood-btn ${todayLog.mood === m.val ? 'selected' : ''}" data-mood="${m.val}">
          ${m.emoji}<small>${m.label}</small>
        </button>`).join('')}
    </div>`;
  el.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      logMood(parseInt(btn.dataset.mood));
      el.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      showToast('Mood logged!', 'success');
    });
  });
}

// ── RINGS (progress rings) ────────────────────────────────
export function renderRings() {
  const el = document.getElementById('rings-grid');
  if (!el) return;
  const habits = getActiveHabits();
  const todayLog = getLog(getTodayKey());
  const completed = Object.keys(todayLog.completedHabits).length;
  const total = habits.length;
  const daily = total > 0 ? completed / total : 0;

  const analytics = getAnalytics(7);
  const weekAvg = analytics.daily.reduce((a, b) => a + b.rate, 0) / (analytics.daily.length || 1);

  const player = getPlayer();
  const rankDef = RANKS.find(r => r.rank === player.rank);
  const xpPct = Math.min(1, player.xp / rankDef.xpPerLevel);

  const rings = [
    { label: 'Today', val: daily, color: '#7c3aed', text: `${completed}/${total}` },
    { label: '7-Day Avg', val: weekAvg, color: '#60a5fa', text: `${Math.round(weekAvg * 100)}%` },
    { label: 'XP to Lvl', val: xpPct, color: '#fbbf24', text: `Lv.${player.level}` },
  ];

  el.innerHTML = rings.map((r, i) => {
    const R = 28, circ = 2 * Math.PI * R;
    const offset = circ - r.val * circ;
    return `<div class="ring-card">
      <svg class="ring-svg" width="70" height="70" viewBox="0 0 70 70">
        <circle class="ring-bg" cx="35" cy="35" r="${R}"/>
        <circle class="ring-fill"
          cx="35" cy="35" r="${R}"
          stroke="${r.color}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${offset}"
          style="filter:drop-shadow(0 0 4px ${r.color}88)"/>
        <text x="35" y="35" text-anchor="middle" dominant-baseline="central"
          fill="${r.color}" font-size="11" font-weight="800" font-family="JetBrains Mono,monospace">
          ${r.text}
        </text>
      </svg>
      <div class="ring-label">${r.label}</div>
    </div>`;
  }).join('');
}

// ── HABITS VIEW ───────────────────────────────────────────
export function renderHabits(manageMode = false) {
  const container = document.getElementById('habits-list');
  if (!container) return;
  const habits = manageMode ? getHabits() : getActiveHabits();
  const todayLog = getLog(getTodayKey());

  if (habits.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚔️</div><p>No habits yet. Add your first quest!</p></div>`;
    return;
  }

  container.innerHTML = habits.map(h => buildHabitCard(h, todayLog, manageMode)).join('');
  attachHabitListeners(container, todayLog, manageMode);
}

function buildHabitCard(h, todayLog, manageMode) {
  const isDone = todayLog.completedHabits[h.id] !== undefined;
  const isSkipped = todayLog.skippedReasons[h.id] !== undefined;
  const cat = CATEGORIES[h.category] || CATEGORIES.HEALTH;
  const archived = h.archived ? 'style="opacity:0.4"' : '';

  return `
    <div class="habit-card ${isDone ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}" data-id="${h.id}" ${archived}>
      <div class="habit-top">
        <div class="habit-icon-wrap" style="background:${cat.color}22;border-color:${cat.color}33">
          ${h.icon || cat.icon}
        </div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">
            <span class="chip chip-${h.category.toLowerCase()}">${cat.label}</span>
            ${h.streak > 0 ? `<span class="streak-chip">🔥 ${h.streak}d</span>` : ''}
            <span style="margin-left:auto;font-size:0.65rem;color:var(--accent-light);">+${h.xpReward}XP</span>
          </div>
        </div>
        ${!manageMode ? `
          <div class="habit-actions">
            <button class="habit-done-btn ${isDone ? 'done' : ''} ${isSkipped ? 'skipped' : ''}"
              data-action="toggle" data-id="${h.id}" title="${isDone ? 'Undo' : 'Complete'}">
              ${isDone ? '✓' : isSkipped ? '✗' : ''}
            </button>
          </div>` : `
          <div class="habit-actions">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${h.id}" title="Edit">✏️</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-action="${h.archived ? 'unarchive' : 'archive'}" data-id="${h.id}" title="${h.archived ? 'Unarchive' : 'Archive'}">
              ${h.archived ? '↩️' : '📦'}
            </button>
            <button class="btn btn-danger btn-icon btn-sm" data-action="delete" data-id="${h.id}" title="Delete">🗑️</button>
          </div>`}
      </div>
      ${!manageMode && !isDone && !isSkipped ? `<div class="habit-input-row">${buildInputWidget(h)}</div>` : ''}
      ${!manageMode && isSkipped ? `<div class="habit-input-row" style="padding-top:0.5rem;">
        <div class="text-xs text-muted">Skipped: ${todayLog.skippedReasons[h.id] || '—'}</div>
        <button class="btn btn-ghost btn-sm mt-1" data-action="unskip" data-id="${h.id}">↩️ Undo skip</button>
      </div>` : ''}
    </div>`;
}

function buildInputWidget(h) {
  switch (h.type) {
    case HABIT_TYPES.COUNTER:
      return `<div class="counter-wrap">
        <button class="counter-btn" data-counter="dec" data-id="${h.id}">−</button>
        <div style="flex:1;text-align:center;">
          <div class="counter-value-display" id="cval-${h.id}">0</div>
          <div class="counter-target">of ${h.targetValue} ${h.unit}</div>
          <div class="counter-progress"><div class="counter-progress-fill" id="cprog-${h.id}" style="width:0%"></div></div>
        </div>
        <button class="counter-btn" data-counter="inc" data-id="${h.id}">+</button>
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
        <button class="btn btn-primary btn-sm" data-action="log-counter" data-id="${h.id}">Log ✓</button>
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;

    case HABIT_TYPES.TIMER:
      return `<div class="timer-wrap">
        <div class="timer-display" id="timer-disp-${h.id}">00:00</div>
        <div class="timer-controls">
          <button class="btn btn-primary btn-sm" data-timer="start" data-id="${h.id}">▶ Start</button>
          <button class="btn btn-ghost btn-sm" data-timer="stop" data-id="${h.id}">⏹ Stop</button>
        </div>
        <div class="timer-manual">
          <input type="number" id="timer-manual-${h.id}" placeholder="Manual mins" min="1" max="480" style="text-align:center;width:110px;"/>
          <button class="btn btn-ghost btn-sm" data-action="log-timer" data-id="${h.id}">Log</button>
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;

    case HABIT_TYPES.COOK_LOG:
      return `<div class="cook-options">
        <div class="cook-opt" data-cook="home" data-id="${h.id}">🏠 Cooked Home</div>
        <div class="cook-opt" data-cook="meal-prep" data-id="${h.id}">🥡 Meal Prepped</div>
        <div class="cook-opt" data-cook="ate-out" data-id="${h.id}">🍔 Ate Out</div>
        <div class="cook-opt" data-cook="skipped-meal" data-id="${h.id}">⏭ Skipped Meal</div>
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
        <button class="btn btn-primary btn-sm" data-action="log-cook" data-id="${h.id}">Log ✓</button>
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;

    case HABIT_TYPES.LEARN_LOG:
      return `<div class="learn-wrap">
        <input type="text" id="learn-skill-${h.id}" placeholder="What did you learn today?" />
        <input type="url" id="learn-url-${h.id}" placeholder="Link (URL, file path, notes...)" />
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
        <button class="btn btn-primary btn-sm" data-action="log-learn" data-id="${h.id}">Log ✓</button>
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;

    case HABIT_TYPES.FINANCE:
      return `<div class="finance-checks">
        <label class="finance-check-item"><input type="checkbox" id="fin-budget-${h.id}"/> 💰 Checked my budget today</label>
        <label class="finance-check-item"><input type="checkbox" id="fin-noimpulse-${h.id}"/> 🚫 No impulse purchases</label>
        <label class="finance-check-item"><input type="checkbox" id="fin-save-${h.id}"/> 🏦 Saved / invested as planned</label>
        <input type="number" id="fin-spend-${h.id}" placeholder="Today's spending ($)" style="margin-top:0.3rem;"/>
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
        <button class="btn btn-primary btn-sm" data-action="log-finance" data-id="${h.id}">Log ✓</button>
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;

    case HABIT_TYPES.BOOLEAN:
    default:
      return `<div style="display:flex;gap:0.5rem;">
        <button class="btn btn-primary btn-sm w-full" data-action="done" data-id="${h.id}">✓ Done!</button>
        <button class="btn btn-ghost btn-sm" data-action="skip" data-id="${h.id}">Skip</button>
      </div>`;
  }
}

function attachHabitListeners(container, todayLog, manageMode) {
  const counterVals = {};

  // Counter increment/decrement
  container.querySelectorAll('[data-counter]').forEach(btn => {
    const id = btn.dataset.id;
    if (!counterVals[id]) counterVals[id] = 0;
    btn.addEventListener('click', () => {
      const h = getActiveHabits().find(h => h.id === id);
      if (!h) return;
      if (btn.dataset.counter === 'inc') counterVals[id] = Math.min(h.targetValue * 2, (counterVals[id] || 0) + 1);
      else counterVals[id] = Math.max(0, (counterVals[id] || 0) - 1);
      const valEl = document.getElementById(`cval-${id}`);
      const progEl = document.getElementById(`cprog-${id}`);
      if (valEl) valEl.textContent = counterVals[id];
      if (progEl) progEl.style.width = `${Math.min(100, (counterVals[id] / h.targetValue) * 100)}%`;
    });
  });

  // Timer
  const timers = {};
  container.querySelectorAll('[data-timer]').forEach(btn => {
    const id = btn.dataset.id;
    btn.addEventListener('click', () => {
      const disp = document.getElementById(`timer-disp-${id}`);
      if (btn.dataset.timer === 'start') {
        if (timers[id]) return;
        timers[id] = { elapsed: 0, interval: setInterval(() => {
          timers[id].elapsed++;
          const m = String(Math.floor(timers[id].elapsed / 60)).padStart(2, '0');
          const s = String(timers[id].elapsed % 60).padStart(2, '0');
          if (disp) disp.textContent = `${m}:${s}`;
        }, 1000)};
        btn.textContent = '⏸ Pause';
        btn.dataset.timer = 'pause';
      } else if (btn.dataset.timer === 'pause') {
        clearInterval(timers[id].interval);
        delete timers[id].interval;
        btn.textContent = '▶ Resume';
        btn.dataset.timer = 'start';
      } else if (btn.dataset.timer === 'stop') {
        if (timers[id]) { clearInterval(timers[id].interval); }
        const mins = timers[id] ? Math.ceil(timers[id].elapsed / 60) : 0;
        delete timers[id];
        if (mins > 0) handleHabitLog(id, mins, 'timer');
        const startBtn = container.querySelector(`[data-timer="start"][data-id="${id}"], [data-timer="pause"][data-id="${id}"]`);
        if (startBtn) { startBtn.textContent = '▶ Start'; startBtn.dataset.timer = 'start'; }
        if (disp) disp.textContent = '00:00';
      }
    });
  });

  // Cook options
  const cookSelections = {};
  container.querySelectorAll('[data-cook]').forEach(opt => {
    const id = opt.dataset.id;
    opt.addEventListener('click', () => {
      container.querySelectorAll(`[data-cook][data-id="${id}"]`).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      cookSelections[id] = opt.dataset.cook;
    });
  });

  // Toggle (done button in compact view)
  container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const h = getActiveHabits().find(h => h.id === id);
      const isDone = todayLog.completedHabits[id] !== undefined;
      if (isDone) {
        delete todayLog.completedHabits[id];
        import('./storage.js').then(m => m.saveDailyLog(getTodayKey(), todayLog));
        renderHabits(manageMode);
        renderRings();
        renderPlayerCard();
      } else {
        handleHabitLog(id, true, 'boolean');
      }
    });
  });

  // Done / Log actions
  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'done') {
      btn.addEventListener('click', () => handleHabitLog(id, true, 'boolean'));
    } else if (action === 'log-counter') {
      btn.addEventListener('click', () => {
        const val = counterVals[id] || 0;
        const h = getActiveHabits().find(h => h.id === id);
        if (val < 1) { showToast('Add at least 1!', 'warning'); return; }
        handleHabitLog(id, val, 'counter');
      });
    } else if (action === 'log-timer') {
      btn.addEventListener('click', () => {
        const mins = parseInt(document.getElementById(`timer-manual-${id}`)?.value);
        if (!mins || mins < 1) { showToast('Enter minutes!', 'warning'); return; }
        handleHabitLog(id, mins, 'timer');
      });
    } else if (action === 'log-cook') {
      btn.addEventListener('click', () => {
        const cook = cookSelections[id];
        if (!cook) { showToast('Select an option!', 'warning'); return; }
        handleHabitLog(id, cook, 'cook_log');
      });
    } else if (action === 'log-learn') {
      btn.addEventListener('click', () => {
        const skill = document.getElementById(`learn-skill-${id}`)?.value?.trim();
        const url = document.getElementById(`learn-url-${id}`)?.value?.trim();
        if (!skill) { showToast('What did you learn?', 'warning'); return; }
        handleHabitLog(id, { skill, url }, 'learn_log');
      });
    } else if (action === 'log-finance') {
      btn.addEventListener('click', () => {
        const budget = document.getElementById(`fin-budget-${id}`)?.checked;
        const noImpulse = document.getElementById(`fin-noimpulse-${id}`)?.checked;
        const save = document.getElementById(`fin-save-${id}`)?.checked;
        const spend = parseFloat(document.getElementById(`fin-spend-${id}`)?.value) || 0;
        handleHabitLog(id, { budget, noImpulse, save, spend }, 'finance');
      });
    } else if (action === 'skip') {
      btn.addEventListener('click', () => {
        const h = getActiveHabits().find(h => h.id === id);
        if (h?.whyPrompt) {
          openSkipModal(id, h.name);
        } else {
          import('./storage.js').then(m => { m.logHabit(id, null, 'Skipped'); renderHabits(manageMode); renderRings(); });
        }
      });
    } else if (action === 'unskip') {
      btn.addEventListener('click', () => {
        import('./storage.js').then(m => {
          const log = m.getLog(m.getTodayKey());
          delete log.skippedReasons[id];
          m.saveDailyLog(m.getTodayKey(), log);
          renderHabits(manageMode);
        });
      });
    } else if (action === 'archive') {
      btn.addEventListener('click', () => {
        if (confirm('Archive this habit? Your history will be kept.')) {
          import('./storage.js').then(m => { m.archiveHabit(id); renderHabits(manageMode); });
        }
      });
    } else if (action === 'unarchive') {
      btn.addEventListener('click', () => {
        import('./storage.js').then(m => { m.updateHabit(id, { archived: false }); renderHabits(manageMode); });
      });
    } else if (action === 'delete') {
      btn.addEventListener('click', () => {
        if (confirm('Permanently delete this habit and all its data?')) {
          import('./storage.js').then(m => { m.deleteHabit(id); renderHabits(manageMode); });
        }
      });
    } else if (action === 'edit') {
      btn.addEventListener('click', () => openEditHabitModal(id));
    }
  });
}

function handleHabitLog(id, value, type) {
  import('./storage.js').then(m => {
    const log = m.logHabit(id, value);
    const h = m.getHabits().find(h => h.id === id);
    if (!h) return;
    const updatedPlayer = m.awardXP(h.xpReward, m.CATEGORIES[h.category]?.stat);
    showToast(`+${h.xpReward} XP — ${h.name} logged! 💥`, 'xp');
    // Streak badges
    if (h.streak === 7) { const b = m.awardBadge('streak_7'); if (b) { showToast(`🏆 Badge: ${b.name}!`, 'success', 5000); fireConfetti(); } }
    if (h.streak === 30) { const b = m.awardBadge('streak_30'); if (b) { showToast(`🏆 Badge: ${b.name}!`, 'success', 5000); fireConfetti(); } }
    if (h.streak === 100) { const b = m.awardBadge('streak_100'); if (b) { showToast(`🏆 LEGENDARY Badge: ${b.name}!`, 'success', 8000); fireConfetti(); } }
    renderHabits(false);
    renderRings();
    renderPlayerCard();
    renderPlayerHeader();
    renderDungeonBanner();
  });
}

// ── HEATMAP ───────────────────────────────────────────────
export function renderHeatmap(habitId) {
  const el = document.getElementById('heatmap-grid');
  if (!el) return;
  const analytics = getAnalytics(70);
  el.innerHTML = analytics.daily.map(day => {
    const level = Math.ceil(day.rate * 4);
    return `<div class="heat-cell" data-level="${level}" title="${day.date}: ${Math.round(day.rate*100)}%"></div>`;
  }).join('');
}

// ── GOALS VIEW ────────────────────────────────────────────
export function renderGoals(showCompleted = false) {
  const container = document.getElementById('goals-list');
  if (!container) return;
  const goals = getGoals().filter(g => showCompleted ? g.completed : !g.completed);

  if (goals.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>${showCompleted ? 'No completed goals yet.' : 'Add your first goal!'}</p></div>`;
    return;
  }

  container.innerHTML = goals.map(g => buildGoalCard(g)).join('');
  attachGoalListeners(container);
}

function buildGoalCard(g) {
  const total = g.milestones.length;
  const done = g.milestones.filter(m => m.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const cat = CATEGORIES[g.category] || CATEGORIES.HEALTH;

  let countdown = '';
  if (g.targetDate) {
    const days = Math.ceil((new Date(g.targetDate) - new Date()) / 86400000);
    countdown = days > 0 ? `⏳ ${days}d left` : days === 0 ? '📅 Due Today!' : `🔴 ${Math.abs(days)}d overdue`;
  }

  return `
    <div class="goal-card" data-goal-id="${g.id}">
      <div class="goal-header">
        <div>
          <div class="goal-title">${cat.icon} ${g.name}
            ${g.pivotHistory?.length > 0 ? `<span class="pivot-badge">🔄 ${g.pivotHistory.length} pivot${g.pivotHistory.length>1?'s':''}</span>` : ''}
          </div>
          ${g.description ? `<div class="goal-desc">${g.description}</div>` : ''}
        </div>
        <div class="goal-countdown">${countdown}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
        <span class="text-xs text-muted">Progress</span>
        <span class="text-xs font-mono" style="color:var(--accent-light)">${pct}%</span>
      </div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
      ${total > 0 ? `
        <div class="collapsible-header" data-collapse="milestones-${g.id}">
          <span class="text-sm" style="font-weight:600;">Milestones (${done}/${total})</span>
          <span class="chevron">▾</span>
        </div>
        <div class="collapsible-body" id="milestones-${g.id}">
          <div class="milestone-list">
            ${g.milestones.map(m => `
              <div class="milestone-item ${m.completed ? 'done' : ''}" data-action="milestone" data-goal="${g.id}" data-milestone="${m.id}">
                <div class="milestone-check">${m.completed ? '✓' : ''}</div>
                <span>${m.text}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      <div class="goal-actions">
        <button class="btn btn-ghost btn-sm" data-action="pivot" data-id="${g.id}">🔄 Pivot</button>
        ${!g.completed ? `<button class="btn btn-primary btn-sm" data-action="complete-goal" data-id="${g.id}">✅ Complete</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="pause-goal" data-id="${g.id}">⏸ ${g.paused ? 'Resume' : 'Pause'}</button>
        <button class="btn btn-danger btn-sm" data-action="delete-goal" data-id="${g.id}">🗑️</button>
      </div>
      ${g.pivotHistory?.length > 0 ? `
        <div class="collapsible-header mt-1" data-collapse="pivot-hist-${g.id}">
          <span class="text-xs text-muted">Pivot History</span>
          <span class="chevron">▾</span>
        </div>
        <div class="collapsible-body" id="pivot-hist-${g.id}">
          ${g.pivotHistory.map(p => `<div class="text-xs text-muted" style="padding:0.3rem 0;border-bottom:1px solid var(--border);">
            <span class="font-mono">${p.date.split('T')[0]}</span> — ${p.reason}
          </div>`).join('')}
        </div>` : ''}
    </div>`;
}

function attachGoalListeners(container) {
  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (action === 'pivot') openPivotModal(id);
      else if (action === 'complete-goal') {
        import('./storage.js').then(m => {
          const g = m.completeGoal(id);
          const b = m.awardBadge('first_goal_complete');
          m.awardXP(g?.xpReward || 100, m.CATEGORIES[g?.category]?.stat);
          showToast(`🏆 Goal Complete! +${g?.xpReward||100} XP`, 'success', 5000);
          if (b) showToast(`🏅 Badge: ${b.name}!`, 'xp', 5000);
          fireConfetti();
          renderGoals(); renderRings(); renderPlayerCard();
        });
      } else if (action === 'pause-goal') {
        import('./storage.js').then(m => { m.updateGoal(id, { paused: !m.getGoals().find(g=>g.id===id)?.paused }); renderGoals(); });
      } else if (action === 'delete-goal') {
        if (confirm('Delete this goal permanently?')) {
          import('./storage.js').then(m => { m.deleteGoal(id); renderGoals(); });
        }
      } else if (action === 'milestone') {
        const goalId = btn.dataset.goal;
        const milestoneId = btn.dataset.milestone;
        import('./storage.js').then(m => {
          m.completeMilestone(goalId, milestoneId);
          m.awardXP(15, null);
          showToast('Milestone checked! +15 XP ⚡', 'xp');
          renderGoals(); renderRings(); renderPlayerCard();
        });
      }
    });
  });

  // Collapsibles
  container.querySelectorAll('[data-collapse]').forEach(header => {
    header.addEventListener('click', () => {
      const body = document.getElementById(header.dataset.collapse);
      header.classList.toggle('open');
      body?.classList.toggle('open');
    });
  });
}

// ── ANALYTICS VIEW ────────────────────────────────────────
export function renderAnalytics() {
  renderBarChart();
  renderRadar();
  renderBadges();
}

function renderBarChart() {
  const el = document.getElementById('bar-chart');
  if (!el) return;
  const data = getAnalytics(14).daily;
  const maxRate = 1;
  const W = 340, H = 120, barW = 16, gap = 6;
  const total = data.length;
  const startX = 10;

  const bars = data.map((d, i) => {
    const x = startX + i * (barW + gap);
    const barH = Math.max(2, d.rate * H);
    const y = H - barH;
    const alpha = 0.3 + d.rate * 0.7;
    const label = d.date.slice(5);
    return `
      <rect class="bar" x="${x}" y="${y}" width="${barW}" height="${barH}"
        rx="4" fill="url(#barGrad)" opacity="${alpha}"/>
      ${i % 3 === 0 ? `<text x="${x + barW/2}" y="${H + 14}" text-anchor="middle" class="chart-label">${label}</text>` : ''}`;
  }).join('');

  el.innerHTML = `<svg class="bar-chart" viewBox="0 0 ${startX*2 + total*(barW+gap)} ${H+20}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#9f67ff"/>
        <stop offset="100%" stop-color="#60a5fa"/>
      </linearGradient>
    </defs>
    ${bars}
  </svg>`;
}

function renderRadar() {
  const el = document.getElementById('radar-chart');
  if (!el) return;
  const player = getPlayer();
  const stats = STATS.map(s => ({ label: s, val: (player.stats[s] || 1) / 100 }));
  const N = stats.length;
  const cx = 110, cy = 110, R = 80;
  const angleStep = (2 * Math.PI) / N;

  function point(i, r) {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const grid = [0.25, 0.5, 0.75, 1].map(frac => {
    const pts = stats.map((_, i) => point(i, R * frac));
    return `<polygon points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }).join('');

  const axes = stats.map((_, i) => {
    const p = point(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join('');

  const dataPts = stats.map((s, i) => point(i, R * s.val));
  const polygon = `<polygon points="${dataPts.map(p=>`${p.x},${p.y}`).join(' ')}"
    fill="rgba(124,58,237,0.25)" stroke="rgba(159,103,255,0.8)" stroke-width="1.5"/>`;

  const labels = stats.map((s, i) => {
    const p = point(i, R + 18);
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central"
      class="radar-stat-label">${s.label.slice(0,3).toUpperCase()} ${Math.round(s.val*100)}</text>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 220 220" width="220" height="220" xmlns="http://www.w3.org/2000/svg">
    ${grid}${axes}${polygon}${labels}
  </svg>`;
}

function renderBadges() {
  const el = document.getElementById('badges-grid');
  if (!el) return;
  const earned = getEarnedBadges();
  const earnedIds = earned.map(b => b.id);
  el.innerHTML = BADGE_DEFINITIONS.map(b => `
    <div class="badge-card ${earnedIds.includes(b.id) ? 'earned' : 'locked'}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
    </div>`).join('');
}

// ── MODALS ────────────────────────────────────────────────
export function showModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.add('open'); }
}
export function hideModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.remove('open'); }
}

export function openSkipModal(habitId, habitName) {
  const modal = document.getElementById('skip-modal');
  if (!modal) return;
  modal.querySelector('#skip-habit-name').textContent = habitName;
  modal.querySelector('#skip-reason-input').value = '';
  showModal('skip-modal');

  const submitBtn = modal.querySelector('#skip-submit-btn');
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newBtn, submitBtn);
  newBtn.addEventListener('click', () => {
    const reason = modal.querySelector('#skip-reason-input').value.trim() || 'No reason given';
    import('./storage.js').then(m => {
      m.logHabit(habitId, null, reason);
      hideModal('skip-modal');
      renderHabits(false);
      renderRings();
    });
  });
}

export function openPivotModal(goalId) {
  const goal = getGoals().find(g => g.id === goalId);
  if (!goal) return;
  const modal = document.getElementById('pivot-modal');
  if (!modal) return;
  modal.querySelector('#pivot-goal-name').textContent = goal.name;
  modal.querySelector('#pivot-new-name').value = goal.name;
  modal.querySelector('#pivot-new-date').value = goal.targetDate || '';
  modal.querySelector('#pivot-new-desc').value = goal.description || '';
  modal.querySelector('#pivot-reason').value = '';
  showModal('pivot-modal');

  const submitBtn = modal.querySelector('#pivot-submit-btn');
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newBtn, submitBtn);
  newBtn.addEventListener('click', () => {
    const reason = modal.querySelector('#pivot-reason').value.trim();
    if (!reason) { showToast('Please explain why you\'re pivoting!', 'warning'); return; }
    const changes = {
      name: modal.querySelector('#pivot-new-name').value.trim() || goal.name,
      targetDate: modal.querySelector('#pivot-new-date').value || goal.targetDate,
      description: modal.querySelector('#pivot-new-desc').value.trim() || goal.description,
    };
    import('./storage.js').then(m => {
      m.pivotGoal(goalId, { reason, changes });
      const b = m.awardBadge('first_pivot');
      m.awardXP(30, null);
      if (b) showToast(`🏅 Badge: ${b.name}! +30 XP`, 'xp', 5000);
      showToast('Goal pivoted! Strategy updated. +30 XP 🔄', 'success');
      hideModal('pivot-modal');
      renderGoals();
    });
  });
}

export function openEditHabitModal(habitId) {
  const h = getHabits().find(h => h.id === habitId);
  if (!h) return;
  const modal = document.getElementById('habit-modal');
  if (!modal) return;
  modal.querySelector('#habit-modal-title').textContent = '✏️ Edit Habit';
  modal.querySelector('#habit-name-input').value = h.name;
  modal.querySelector('#habit-target-input').value = h.targetValue;
  modal.querySelector('#habit-unit-input').value = h.unit;
  modal.querySelector('#habit-xp-input').value = h.xpReward;
  modal.querySelectorAll('.type-opt').forEach(o => {
    o.classList.toggle('selected', o.dataset.type === h.type);
  });
  modal.querySelectorAll('.cat-opt').forEach(o => {
    o.classList.toggle('selected', o.dataset.cat === h.category);
  });
  const submitBtn = modal.querySelector('#habit-submit-btn');
  submitBtn.textContent = 'Save Changes';
  submitBtn.dataset.editId = habitId;
  showModal('habit-modal');
}
