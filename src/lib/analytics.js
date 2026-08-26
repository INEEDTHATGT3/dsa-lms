/* Weakness analytics - pure functions over (progress, answerKeys).
   Accuracy per module from persisted MCQ choices vs build-time keys. */
import MODULES_META from '../content/modules.json';
import ANSWER_KEYS from '../content/answer-keys.json';

const lessonIdToModule = {};
for (const m of MODULES_META.modules)
  for (let L = 1; L <= 4; L++)
    lessonIdToModule[`${m.id}_L${L}`] = { id: m.id, num: m.num, title: m.title };

export function moduleAccuracy(progress) {
  const agg = {};   // moduleId: {right, total}
  for (const [lessonId, st] of Object.entries(progress.lessons)) {
    const mod = lessonIdToModule[lessonId];
    if (!mod || !st.mcq) continue;
    const keys = ANSWER_KEYS[lessonId.replace('_L', '/L')] || {};
    const a = agg[mod.id] ||= { right: 0, total: 0, mod };
    for (const [qKey, choice] of Object.entries(st.mcq)) {
      if (keys[qKey] === undefined) continue;
      a.total++;
      if (choice === keys[qKey]) a.right++;
    }
  }
  return agg;
}

/* weakest modules with >= minAttempts, accuracy ascending */
export function weakestModules(progress, minAttempts = 4, topN = 3) {
  const agg = moduleAccuracy(progress);
  return Object.values(agg)
    .filter(a => a.total >= minAttempts)
    .map(a => ({ ...a, pct: Math.round(a.right / a.total * 100) }))
    .sort((x, y) => x.pct - y.pct)
    .slice(0, topN);
}

export function overallAccuracy(progress) {
  let right = 0, total = 0;
  for (const [lessonId, st] of Object.entries(progress.lessons)) {
    const keys = ANSWER_KEYS[lessonId.replace('_L', '/L')] || {};
    for (const [qKey, choice] of Object.entries(st.mcq || {})) {
      if (keys[qKey] === undefined) continue;
      total++; if (choice === keys[qKey]) right++;
    }
  }
  return total ? Math.round(right / total * 100) : null;
}

export function openMistakeCount(progress) {
  return (progress.mistakes || []).filter(m => !m.resolved).length;
}
