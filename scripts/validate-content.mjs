#!/usr/bin/env node
/* CI content gate: every lesson parses + meets structural minimums.
   Mirrors renderer/lint.js quotas (kept dependency-free). */
import fs from 'fs';
import path from 'path';
import url from 'url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const CONTENT = path.join(HERE, '..', 'src', 'content');
const MIN_PROBLEMS = { 1: 8, 2: 10, 3: 6, 4: 5 };

let errs = 0, files = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/^L\d+\.json$/.test(e.name)) {
      files++;
      let L;
      try { L = JSON.parse(fs.readFileSync(p, 'utf8')); }
      catch (e) { console.error('✗', p, e.message); errs++; continue; }
      if ((L.placementQuiz || []).length < 5) { errs++; console.error('✗', e.name, 'placement<5'); }
      let traces = 0, mcq = 0, probs = 0;
      for (const s of L.sections || []) for (const b of s.blocks || []) {
        if (b.type === 'trace') traces++;
        if (b.type === 'quiz') mcq += b.items.length;
        if (b.type === 'problems') probs += b.items.length;
        if (b.type === 'problem') probs++;
      }
      const lvl = L.level;
      if (traces < 2) { errs++; console.error('✗', e.name, `traces ${traces}<2`); }
      if (mcq < 6) { errs++; console.error('✗', e.name, `mcqs ${mcq}<6`); }
      if (probs < MIN_PROBLEMS[lvl]) { errs++; console.error('✗', e.name, `probs ${probs}`); }
      if ((L.revisionCard||[]).length < 4 || (L.glossary||[]).length < 5) { errs++; console.error('✗', e.name, 'revcard/glossary'); }
    }
  }
}
walk(CONTENT);
if (errs) { console.error(`CONTENT GATE FAILED: ${errs} issue(s) in ${files} lessons`); process.exit(1); }
console.log(`CONTENT GATE OK: ${files} lessons`);
