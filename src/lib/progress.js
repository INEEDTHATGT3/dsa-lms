/* Versioned progress store - single source of truth for localStorage.
   Schema v2: v1 fields + srs{}, mistakes[], days[] (study-day streaks). */
import { useSyncExternalStore } from 'react';

const KEY = 'dsa_progress_v1';
const VERSION = 2;
const DAY = 86400000;

function fresh() {
  return { version: VERSION, lessons: {}, srs: {}, mistakes: [], days: [] };
}
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return fresh();
  const out = {
    version: VERSION,
    lessons: raw.lessons || {},
    srs: raw.srs || {},
    mistakes: raw.mistakes || [],
    days: raw.days || []
  };
  return out;
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && (raw.version === 1 || raw.version === VERSION)) return migrate(raw);
    return fresh();
  } catch { return fresh(); }
}

let state = load();
const listeners = new Set();

const todayStr = () => new Date().toISOString().slice(0, 10);

function commit(next) {
  // auto-stamp study day on ANY progress mutation
  const day = todayStr();
  const days = next.days.includes(day) ? next.days : [...next.days, day];
  state = { ...next, days };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach(fn => fn());
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getSnapshot() { return state; }
export function useProgress() { return useSyncExternalStore(subscribe, getSnapshot); }

/* --- base mutators --- */
function updateLesson(id, fn) {
  const cur = state.lessons[id] || {};
  commit({ ...state, lessons: { ...state.lessons, [id]: fn(cur) } });
}
export const actions = {
  markComplete(lessonId, done) {
    updateLesson(lessonId, s => ({ ...s, complete: done }));
    import('./srs.js').then(m => m.srsActions.onLessonComplete(lessonId, done));
  },
  recordMcq(lessonId, qKey, choice) {
    updateLesson(lessonId, s => ({ ...s, mcq: { ...s.mcq, [qKey]: choice } }));
  },
  toggleSolved(lessonId, pid) {
    let nowSolved = false;
    updateLesson(lessonId, s => {
      const solved = { ...(s.solved || {}) };
      if (solved[pid]) delete solved[pid];
      else { solved[pid] = true; nowSolved = true; }
      return { ...s, solved };
    });
    import('./srs.js').then(m => m.srsActions.onSolvedToggle(lessonId, pid, nowSolved));
  },
  resetAll() { commit(fresh()); }
};

/* --- srs/mistake mutators re-exported with store access --- */
import * as srsEngine from './srs.js';
export const srsActions = {
  enrollRev(lessonId) { srsActionsBridge.enroll('rev', { lessonId }, `rev:${lessonId}`); },
  rate(id, rating) { srsActionsBridge.rate(id, rating); },
  resolveMistake(id) { srsActionsBridge.resolveMistake(id); },
};
const srsActionsBridge = {
  enroll(type, ref, id) {
    const srs = { ...(state.srs || {}) };
    if (!srs[id]) {
      srs[id] = { type, ref, ease: 2.5, ivl: 0, due: todayStr(), reps: 0, lapses: 0 };
      commit({ ...state, srs });
    }
  },
  unenroll(id) {
    const srs = { ...(state.srs || {}) };
    if (srs[id]) { delete srs[id]; commit({ ...state, srs }); }
  },
  rate(id, rating) {
    const srs = { ...(state.srs || {}) };
    if (srs[id]) srs[id] = srsEngine.rate(srs[id], rating);
    commit({ ...state, srs });
  },
  resolveMistake(id) {
    commit({
      ...state,
      mistakes: (state.mistakes || []).map(m =>
        m.id === id ? { ...m, resolved: true } : m)
    });
  },
  onSolvedToggle(lessonId, pid, nowSolved) {
    const id = `prob:${lessonId}:${pid}`;
    nowSolved ? this.enroll('prob', { lessonId, pid }, id) : this.unenroll(id);
  },
  onLessonComplete(lessonId, done) {
    const id = `rev:${lessonId}`;
    done ? this.enroll('rev', { lessonId }, id) : this.unenroll(id);
  },
  logMistake(lessonId, q, correctAnswer) {
    commit({
      ...state,
      mistakes: [...(state.mistakes || []), {
        id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        lessonId, q: String(q).slice(0, 200), correctAnswer,
        ts: Date.now(), resolved: false
      }]
    });
  }
};

export const logMistake = (lessonId, q, a) => srsActionsBridge.logMistake(lessonId, q, a);
export const dueToday = srs =>
  Object.values(srs || {}).filter(c => c.due <= new Date().toISOString().slice(0, 10)).length;

/* --- selectors --- */
export function lessonState(p, id) { return p.lessons[id] || {}; }
export function isComplete(p, id) { return !!(p.lessons[id]?.complete); }

export function streak(p) {
  const days = new Set(p.days || []);
  let cur = 0;
  const d = new Date();
  // allow "today not yet studied" without breaking yesterday's streak
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { cur++; d.setDate(d.getDate() - 1); }
  return cur;
}
export function longestStreak(p) {
  const sorted = [...new Set(p.days || [])].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = prev && (new Date(d) - new Date(prev) === DAY) ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return Math.max(best, run);
}
