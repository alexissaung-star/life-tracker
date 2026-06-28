// ============================================================
// LIFE TRACKER — app.js
// Main controller: navigation, modals, form handling, boot
// ============================================================
import {
  seedDefaultData, getSettings, saveSettings, getPlayer, savePlayer,
  addHabit, addGoal, updateHabit, exportData, importData,
  HABIT_TYPES, CATEGORIES, getHabits,
} from './storage.js';
import {
  renderPlayerCard, renderPlayerHeader, renderDungeonBanner,
  renderPivotPrompt, renderMoodPicker, renderRings,
  renderHabits, renderHeatmap, renderGoals, renderAnalytics,
  showModal, hideModal, showToast, fireConfetti,
} from './ui.js';

// ── BOOT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  seedDefaultData();
  initNav();
  initModals();
  initHabitForm();
  initGoalForm();
  initSettings();
  navigateTo('dashboard');
});

// ── NAVIGATION ────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
}

export function navigateTo(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(`view-${viewId}`);
  const btn  = document.querySelector(`[data-view="${viewId}"]`);
  if (view) view.classList.add('active');
  if (btn)  btn.classList.add('active');
  renderView(viewId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderView(id) {
  renderPlayerHeader();
  switch (id) {
    case 'dashboard':
      renderPlayerCard();
      renderDungeonBanner();
      renderPivotPrompt();
      renderMoodPicker();
      renderRings();
      renderHabits(false);
      break;
    case 'habits':
      renderHabits(false);
      renderHeatmap();
      break;
    case 'goals':
      renderGoals(false);
      break;
    case 'analytics':
      renderAnalytics();
      break;
    case 'settings':
      renderSettingsView();
      break;
  }
}

// ── MODALS ────────────────────────────────────────────────
function initModals() {
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        // Reset habit form edit state
        const submitBtn = overlay.querySelector('#habit-submit-btn');
        if (submitBtn) { submitBtn.textContent = 'Add Habit'; delete submitBtn.dataset.editId; }
      }
    });
  });

  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.modal-overlay')?.id;
      if (id) hideModal(id);
    });
  });

  // Add Habit button
  document.getElementById('add-habit-btn')?.addEventListener('click', () => {
    resetHabitForm();
    showModal('habit-modal');
  });
  document.getElementById('add-habit-btn-dash')?.addEventListener('click', () => {
    resetHabitForm();
    showModal('habit-modal');
  });

  // Add Goal button
  document.getElementById('add-goal-btn')?.addEventListener('click', () => {
    resetGoalForm();
    showModal('goal-modal');
  });

  // Habit manage toggle
  document.getElementById('manage-habits-toggle')?.addEventListener('click', () => {
    const isManage = document.getElementById('manage-habits-toggle').classList.toggle('active');
    document.getElementById('manage-habits-toggle').querySelector('.manage-badge').textContent = isManage ? 'ON' : 'Manage';
    renderHabits(isManage);
  });

  // Goal tabs (active / completed)
  document.getElementById('goals-tab-active')?.addEventListener('click', () => {
    setGoalTab(false);
  });
  document.getElementById('goals-tab-done')?.addEventListener('click', () => {
    setGoalTab(true);
  });

  // Dungeon modal
  document.getElementById('dungeon-start-btn')?.addEventListener('click', () => {
    import('./storage.js').then(m => {
      const player = m.getPlayer();
      if (!player.dungeonQuestActive) {
        player.dungeonQuestActive = {
          startDate: new Date().toISOString(),
          targetDays: 30,
          description: `Complete ALL habits for 30 consecutive days to advance to the next rank.`,
        };
        m.savePlayer(player);
        showToast('⚔️ Dungeon Quest started! 30 days of glory await.', 'xp', 6000);
        hideModal('dungeon-modal');
        renderDungeonBanner();
      }
    });
  });
}

function setGoalTab(showCompleted) {
  document.getElementById('goals-tab-active')?.classList.toggle('active', !showCompleted);
  document.getElementById('goals-tab-done')?.classList.toggle('active', showCompleted);
  renderGoals(showCompleted);
}

// ── HABIT FORM ────────────────────────────────────────────
let selectedType = HABIT_TYPES.BOOLEAN;
let selectedCategory = 'HEALTH';

function initHabitForm() {
  // Type selector
  document.querySelectorAll('.type-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.type-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedType = opt.dataset.type;
      updateTypeHint();
    });
  });

  // Category selector
  document.querySelectorAll('.cat-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.cat-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedCategory = opt.dataset.cat;
    });
  });

  // Submit
  document.getElementById('habit-submit-btn')?.addEventListener('click', () => {
    const name = document.getElementById('habit-name-input')?.value.trim();
    const target = parseFloat(document.getElementById('habit-target-input')?.value) || 1;
    const unit = document.getElementById('habit-unit-input')?.value.trim() || '';
    const xp = parseInt(document.getElementById('habit-xp-input')?.value) || 20;
    const whyPrompt = document.getElementById('habit-why-prompt')?.checked || false;
    const icon = document.getElementById('habit-icon-input')?.value.trim() || null;

    if (!name) { showToast('Habit name required!', 'warning'); return; }

    const submitBtn = document.getElementById('habit-submit-btn');
    const editId = submitBtn.dataset.editId;

    if (editId) {
      updateHabit(editId, { name, type: selectedType, category: selectedCategory, targetValue: target, unit, xpReward: xp, whyPrompt, icon });
      showToast('Habit updated! ✏️', 'success');
    } else {
      addHabit({ name, type: selectedType, category: selectedCategory, targetValue: target, unit, xpReward: xp, whyPrompt, icon });
      import('./storage.js').then(m => m.awardBadge('first_habit'));
      showToast(`Habit "${name}" added! ⚡`, 'xp');
    }
    hideModal('habit-modal');
    renderHabits(false);
    renderHeatmap();
  });
}

function resetHabitForm() {
  selectedType = HABIT_TYPES.BOOLEAN;
  selectedCategory = 'HEALTH';
  document.getElementById('habit-name-input').value = '';
  document.getElementById('habit-target-input').value = 1;
  document.getElementById('habit-unit-input').value = '';
  document.getElementById('habit-xp-input').value = 20;
  document.getElementById('habit-icon-input').value = '';
  if (document.getElementById('habit-why-prompt')) document.getElementById('habit-why-prompt').checked = false;
  document.querySelectorAll('.type-opt').forEach((o, i) => o.classList.toggle('selected', i === 0));
  document.querySelectorAll('.cat-opt').forEach((o, i) => o.classList.toggle('selected', i === 0));
  document.querySelector('#habit-modal .modal-title').textContent = '⚔️ New Habit';
  const submitBtn = document.getElementById('habit-submit-btn');
  submitBtn.textContent = 'Add Habit';
  delete submitBtn.dataset.editId;
  updateTypeHint();
}

function updateTypeHint() {
  const hint = document.getElementById('type-hint');
  if (!hint) return;
  const hints = {
    [HABIT_TYPES.BOOLEAN]: 'Simple Yes/No completion — with optional "Why not?" prompt if skipped.',
    [HABIT_TYPES.COUNTER]: 'Tap +/− to count units (glasses, reps, pages, etc.)',
    [HABIT_TYPES.TIMER]: 'Live stopwatch + manual minute entry.',
    [HABIT_TYPES.COOK_LOG]: 'Log whether you cooked at home, meal prepped, or ate out.',
    [HABIT_TYPES.LEARN_LOG]: 'Log what you learned + paste a URL, file path, or project link.',
    [HABIT_TYPES.FINANCE]: 'Daily budget check, spending log, and savings confirmation.',
    [HABIT_TYPES.RATING]: 'Rate the quality 1–5 with emoji scale.',
  };
  hint.textContent = hints[selectedType] || '';
}

// ── GOAL FORM ─────────────────────────────────────────────
function initGoalForm() {
  document.getElementById('goal-submit-btn')?.addEventListener('click', () => {
    const name = document.getElementById('goal-name-input')?.value.trim();
    const desc = document.getElementById('goal-desc-input')?.value.trim();
    const date = document.getElementById('goal-date-input')?.value;
    const cat  = document.querySelector('.cat-opt-goal.selected')?.dataset.cat || 'HEALTH';
    const xp   = parseInt(document.getElementById('goal-xp-input')?.value) || 100;
    const milestonesRaw = document.getElementById('goal-milestones-input')?.value.trim();
    const milestones = milestonesRaw ? milestonesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

    const linkedHabitIds = [];
    document.querySelectorAll('.link-habit-check:checked').forEach(cb => linkedHabitIds.push(cb.value));

    if (!name) { showToast('Goal name required!', 'warning'); return; }
    addGoal({ name, description: desc, targetDate: date, category: cat, milestones, linkedHabitIds, xpReward: xp });
    import('./storage.js').then(m => { const b = m.awardBadge('first_goal'); if (b) showToast(`🏅 Badge: ${b.name}!`, 'xp', 4000); });
    showToast(`Goal "${name}" created! 🎯`, 'success');
    hideModal('goal-modal');
    renderGoals(false);
  });

  // Category options in goal modal
  document.querySelectorAll('.cat-opt-goal').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.cat-opt-goal').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function resetGoalForm() {
  document.getElementById('goal-name-input').value = '';
  document.getElementById('goal-desc-input').value = '';
  document.getElementById('goal-date-input').value = '';
  document.getElementById('goal-milestones-input').value = '';
  document.getElementById('goal-xp-input').value = 100;
  document.querySelectorAll('.cat-opt-goal').forEach((o, i) => o.classList.toggle('selected', i === 0));
  // Populate linked habits checkboxes
  const linkEl = document.getElementById('goal-link-habits');
  if (linkEl) {
    const habits = getHabits().filter(h => !h.archived);
    linkEl.innerHTML = habits.length === 0 ? '<p class="text-xs text-muted">Add habits first to link them.</p>' :
      habits.map(h => `<label class="finance-check-item">
        <input type="checkbox" class="link-habit-check" value="${h.id}" style="width:auto;">
        ${h.icon || ''} ${h.name}
      </label>`).join('');
  }
}

// ── SETTINGS ──────────────────────────────────────────────
function initSettings() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportData();
    showToast('Data exported! 📦', 'success');
  });

  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });

  document.getElementById('import-file-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const ok = importData(ev.target.result);
      if (ok) {
        showToast('Data imported! ✅ Refreshing…', 'success', 3000);
        setTimeout(() => location.reload(), 2500);
      } else {
        showToast('Import failed — invalid file.', 'warning');
      }
    };
    reader.readAsText(file);
  });
}

function renderSettingsView() {
  const player = getPlayer();
  const nameInput = document.getElementById('settings-player-name');
  if (nameInput) nameInput.value = player.name || 'Hunter';
  nameInput?.addEventListener('input', () => {
    const p = getPlayer();
    p.name = nameInput.value.trim() || 'Hunter';
    savePlayer(p);
    renderPlayerHeader();
  });
}
