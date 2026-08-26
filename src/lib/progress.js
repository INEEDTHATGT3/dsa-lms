/* Versioned progress store - single source of truth for localStorage.
   Schema v1: { version, lessons: { [lessonId]: { complete, mcq{}, solved{} } } } */
import { useSyncExternalStore } from 'react';

const KEY = 'dsa_progress_v1';
const VERSION = 1;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === VERSION) return raw;
    if (raw && raw.lessons) return { ...raw, version: VERSION };  // forward-compatible
    return fresh();
  } catch {
    return fresh();
  }
}
function fresh() {
  return { version: VERSION, lessons: {} };
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach(fn => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getSnapshot() { return state; }
export function useProgress() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/* --- mutators (functional setstate pattern) --- */
function updateLesson(id, fn) {
  const cur = state.lessons[id] || {};
  commit({ ...state, lessons: { ...state.lessons, [id]: fn(cur) } });
}

export const actions = {
  markComplete(lessonId, done) {
    updateLesson(lessonId, s => ({ ...s, complete: done }));
  },
  recordMcq(lessonId, qKey, choice) {
    updateLesson(lessonId, s => ({
      ...s, mcq: { ...s.mcq, [qKey]: choice }
    }));
  },
  toggleSolved(lessonId, pid) {
    updateLesson(lessonId, s => {
      const solved = { ...(s.solved || {}) };
      if (solved[pid]) delete solved[pid]; else solved[pid] = true;
      return { ...s, solved };
    });
  },
  resetAll() {
    commit(fresh());
  }
};

/* --- selectors --- */
export function lessonState(p, id) { return p.lessons[id] || {}; }
export function isComplete(p, id) { return !!(p.lessons[id]?.complete); }
