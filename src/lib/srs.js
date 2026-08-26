/* SM-2-lite spaced repetition engine (pure functions + store glue).
   Cards live in progress store under srs{} keyed by card id:
     rev:<lessonId>        - whole revision card of a completed artifact
     prob:<lessonId>:<pid> - a solved problem
   Schema per card: { type, ref, ease, ivl, due:'YYYY-MM-DD', reps, lapses } */

export const DAY = 86400000;

function today(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}
export function todayStr() { return today(); }

/* rating: 0=again, 1=hard, 2=good, 3=easy */
export function rate(card, rating) {
  const c = { ...card };
  if (!c.ease) c.ease = 2.5;
  if (!c.reps) c.reps = 0;
  c.reps++;
  if (rating === 0) {
    c.lapses = (c.lapses || 0) + 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.ivl = 0;
    c.due = today();                       // same-day reshow
  } else {
    const mult = rating === 1 ? 1.2 : c.ease * (rating === 3 ? 1.3 : 1);
    c.ease = clamp(c.ease + (rating === 1 ? -0.15 : rating === 3 ? 0.1 : 0), 1.3, 2.8);
    c.ivl = c.reps === 1 && rating === 2 ? 1
          : c.reps === 1 && rating === 3 ? 3
          : Math.max(1, Math.round((c.ivl || 1) * mult));
    c.due = today(c.ivl);
  }
  return c;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function isDue(card, day = todayStr()) {
  return card && card.due <= day;
}
export function isEnrolled(card) { return !!card && card.cnt !== 0; }

/* ---------- store glue ---------- */
export function makeSrsActions(commit, getSrs) {
  return {
    enroll(type, ref, id) {
      const srs = { ...getSrs() };
      if (!srs[id]) {
        srs[id] = { type, ref, ease: 2.5, ivl: 0, due: todayStr(), reps: 0, lapses: 0 };
        commit(s => ({ ...s, srs }));
      }
    },
    unenroll(id) {
      const srs = { ...getSrs() };
      if (srs[id]) { delete srs[id]; commit(s => ({ ...s, srs })); }
    },
    rate(id, rating) {
      const srs = { ...getSrs() };
      if (srs[id]) srs[id] = rate(srs[id], rating);
      commit(s => ({ ...s, srs }));
    },
    /* enroll/unenroll a solved problem tied to its lesson */
    onSolvedToggle(lessonId, pid, nowSolved) {
      const id = `prob:${lessonId}:${pid}`;
      nowSolved ? this.enroll('prob', { lessonId, pid }, id)
                : this.unenroll(id);
    },
    onLessonComplete(lessonId, done) {
      const id = `rev:${lessonId}`;
      done ? this.enroll('rev', { lessonId }, id) : this.unenroll(id);
    },
    logMistake(lessonId, q, correctAnswer) {
      commit(s => ({
        ...s,
        mistakes: [...(s.mistakes || []), {
          id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          lessonId, q, correctAnswer,
          ts: Date.now(), resolved: false
        }]
      }));
    },
    resolveMistake(id) {
      commit(s => ({
        ...s,
        mistakes: (s.mistakes || []).map(m =>
          m.id === id ? { ...m, resolved: true } : m)
      }));
    },
    touchDay() {
      const day = todayStr();
      if (!state_has_day(getDaysRaw(), day)) {
        // no-op here; days tracked via separate field updated in commit wrapper
      }
    }
  };
}
function state_has_day(days, day) { return days.includes(day); }
function getDaysRaw() { return []; }   // replaced by real accessor in progress.js

/* ---------- selectors ---------- */
export function dueCards(srs, day = todayStr()) {
  return Object.entries(srs || {})
    .filter(([, c]) => isDue(c, day))
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1));
}
export function dueCount(srs, day = todayStr()) {
  return dueCards(srs, day).length;
}
