/* Versioned progress store - single source of truth for localStorage.
   Schema v2: v1 fields + srs{}, mistakes[], days[] (study-day streaks). */
import { useSyncExternalStore } from 'react';

const KEY = 'dsa_progress_v1';
/* Corrupt or future-version state is copied here instead of being thrown away,
   so a bad read is recoverable rather than a silent wipe of months of work. */
const BACKUP_KEY = 'dsa_progress_quarantine';
const VERSION = 4;   // v4: quiz answers keyed by qkey(question) instead of position
const DAY = 86400000;

function fresh() {
  return { version: VERSION, lessons: {}, srs: {}, mistakes: [], days: [], notes: {}, sessions: [] };
}
/* set when loaded state still uses the pre-v4 positional quiz keys */
let pendingQkeyMigration = false;

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return fresh();
  const from = typeof raw.version === 'number' ? raw.version : 1;
  const needsQkey = from < 4;
  if (needsQkey) pendingQkeyMigration = true;
  return {
    /* stay on the old version until the async key migration actually lands --
       otherwise a tab closed mid-migration would look migrated and orphan
       every stored answer permanently */
    version: needsQkey ? Math.min(from, 3) : VERSION,
    lessons: raw.lessons || {},
    srs: raw.srs || {},
    mistakes: raw.mistakes || [],
    days: raw.days || [],
    notes: raw.notes || {},
    sessions: raw.sessions || []
  };
}

function quarantine(text, why) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ why, at: new Date().toISOString(), raw: text }));
    console.warn(`[progress] ${why}; previous state preserved under "${BACKUP_KEY}"`);
  } catch { /* storage full or blocked - nothing further we can do */ }
}

function load() {
  let text = null;
  try { text = localStorage.getItem(KEY); } catch { return fresh(); }
  if (text === null) return fresh();
  let raw;
  try { raw = JSON.parse(text); }
  catch { quarantine(text, 'stored progress was not valid JSON'); return fresh(); }
  if (!raw || typeof raw !== 'object') {
    quarantine(text, 'stored progress had an unexpected shape'); return fresh();
  }
  if (typeof raw.version !== 'number' || raw.version < 1) {
    quarantine(text, 'stored progress had no usable version'); return fresh();
  }
  if (raw.version > VERSION) {
    quarantine(text, `stored progress came from a newer build (v${raw.version} > v${VERSION})`);
    return fresh();
  }
  return migrate(raw);
}

let state = load();
const listeners = new Set();

const todayStr = () => new Date().toISOString().slice(0, 10);

/* write + notify, without touching the study-day log */
function persist(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach(fn => fn());
}
function commit(next) {
  // auto-stamp study day on ANY user-driven progress mutation
  const day = todayStr();
  persist({ ...next, days: next.days.includes(day) ? next.days : [...next.days, day] });
}

/* v3 -> v4: remap positional quiz keys (s<sec>-<blk>-q<i>, place-q<i>) onto
   content-hashed keys. The map is a build artifact, dynamic-imported so it
   never enters the main chunk for the overwhelming majority of loads that
   don't need it. Uses persist() rather than commit() so migrating does not
   register a fake study day. */
async function runQkeyMigration() {
  try {
    const hasAnswers = Object.values(state.lessons || {})
      .some(l => l && l.mcq && Object.keys(l.mcq).length);
    if (!hasAnswers) { persist({ ...state, version: VERSION }); return; }
    const map = (await import('../content/qkey-map.json')).default;
    const isNewKey = k => /^q[0-9a-f]{8}$/.test(k);
    let moved = 0, kept = 0, orphaned = 0;
    const lessons = { ...state.lessons };
    for (const [lessonId, st] of Object.entries(lessons)) {
      if (!st || !st.mcq) continue;
      const m = map[lessonId.replace('_L', '/L')] || {};
      const next = {};
      for (const [k, v] of Object.entries(st.mcq)) {
        if (isNewKey(k)) { next[k] = v; kept++; }
        else if (m[k]) { next[m[k]] = v; moved++; }
        else orphaned++;   // question was edited or removed since it was answered
      }
      lessons[lessonId] = { ...st, mcq: next };
    }
    persist({ ...state, version: VERSION, lessons });
    console.info(`[progress] quiz keys migrated to v${VERSION}: ${moved} remapped` +
      `${kept ? ', ' + kept + ' already current' : ''}` +
      `${orphaned ? ', ' + orphaned + ' orphaned' : ''}`);
  } catch (e) {
    // leave version at 3 so the migration is retried on the next load
    console.warn('[progress] quiz-key migration deferred:', e);
  } finally {
    pendingQkeyMigration = false;
  }
}
if (pendingQkeyMigration) runQkeyMigration();

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

/* --- notes & sessions --- */
export const actionsExt = {
  saveNote(lessonId, text) {
    commit({ ...state, notes: { ...state.notes, [lessonId]: text } });
  },
  addSession(session) {
    commit({ ...state, sessions: [session, ...(state.sessions || [])].slice(0, 20) });
  }
};
export function getNote(p, id) { return (p.notes || {})[id] || ''; }
export function getSessions(p) { return p.sessions || []; }

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
export function importAll(raw) {
  commit(migrate(raw));
  if (pendingQkeyMigration) runQkeyMigration();   // imported file may predate v4
}
export function exportAll() { return JSON.stringify(state, null, 2); }

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
