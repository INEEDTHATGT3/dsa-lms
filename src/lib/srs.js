/* SM-2-lite spaced repetition engine (pure functions + store glue).
   Cards live in progress store under srs{} keyed by card id:
     rev:<lessonId>        - whole revision card of a completed artifact
     prob:<lessonId>:<pid> - a solved problem
   Schema per card: { type, ref, ease, ivl, due:'YYYY-MM-DD', reps, lapses } */

export const DAY = 86400000;

/* LOCAL calendar day (en-CA formats as YYYY-MM-DD). UTC would roll the study
   day over at 05:30 IST and split one evening session across two days. */
export function dayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA');
}
export function todayStr() { return dayStr(0); }

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
    c.due = todayStr();                       // same-day reshow
  } else {
    const mult = rating === 1 ? 1.2 : c.ease * (rating === 3 ? 1.3 : 1);
    c.ease = clamp(c.ease + (rating === 1 ? -0.15 : rating === 3 ? 0.1 : 0), 1.3, 2.8);
    c.ivl = c.reps === 1 && rating === 2 ? 1
          : c.reps === 1 && rating === 3 ? 3
          : Math.max(1, Math.round((c.ivl || 1) * mult));
    c.due = dayStr(c.ivl);
  }
  return c;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function isDue(card, day = todayStr()) {
  return card && card.due <= day;
}
/* ---------- selectors ---------- */
export function dueCards(srs, day = todayStr()) {
  return Object.entries(srs || {})
    .filter(([, c]) => isDue(c, day))
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1));
}
export function dueCount(srs, day = todayStr()) {
  return dueCards(srs, day).length;
}
