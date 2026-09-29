/* Shuffles. Never `sort(() => Math.random() - 0.5)`: it is not uniform and
   biases toward input order -- in a drill tool that quietly skews practice. */

/* Fisher-Yates, random each call (sprint / interview problem pools). */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Seeded Fisher-Yates over MCQ option indices (same as sql-lms grade.js).
   Seed = question key, so the order is stable across visits (a stored choice
   never jumps) but authored answer position no longer leaks: options are
   stored/graded by ORIGINAL index. */
export function shuffledOrder(n, seedKey) {
  let seed = parseInt(String(seedKey).replace(/^q/, ''), 16) || 1;
  const rand = () => {                       // mulberry32
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
