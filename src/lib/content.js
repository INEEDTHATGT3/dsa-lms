/* Content manifest - statically analyzable glob (per-lesson lazy chunks).
   modules.json is eager (tiny, needed by hub). Lessons load on demand. */
const lessonLoaders = import.meta.glob('../content/**/L*.json');

import modulesMeta from '../content/modules.json';
import searchIndexRaw from '../content/search-index.json';

export const MODULES = modulesMeta.modules;
export const LEVELS = modulesMeta.levels;
export const LEVEL_META = Object.fromEntries(LEVELS.map(l => [l.level, l]));
export const SEARCH_INDEX = searchIndexRaw;

export function lessonLoader(moduleId, level) {
  const key = Object.keys(lessonLoaders).find(k =>
    k.includes(`/${moduleId}/L${level}.json`)
  );
  return key ? lessonLoaders[key] : null;
}

export async function loadLesson(moduleId, level) {
  const loader = lessonLoader(moduleId, String(level));
  if (!loader) throw new Error(`lesson not found: ${moduleId} L${level}`);
  const mod = await loader();
  return mod.default;
}

export function moduleById(id) {
  return MODULES.find(m => m.id === id);
}

/* progress summary per module for hub matrix - reads store snapshot */
import { getSnapshot as readProgress } from '../lib/progress.js';
export function moduleProgress(modId) {
  const p = readProgress();
  let done = 0;
  const perLevel = {};
  for (let L = 1; L <= 4; L++) {
    const st = p.lessons[`${modId}_L${L}`];
    const complete = !!(st && st.complete);
    perLevel[L] = complete;
    if (complete) done++;
  }
  return { done, perLevel };
}
