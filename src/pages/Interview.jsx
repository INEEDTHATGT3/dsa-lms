import { useState, useEffect, useRef, useCallback } from 'react';
import { MODULES, loadLesson } from '../lib/content.js';
import { actionsExt, logMistake } from '../lib/progress.js';
import { CodeBlock } from '../components/blocks.jsx';
import { Link } from 'react-router-dom';

/* Mock interview room.

   Flow per problem:  statement (clock running, hints on request)
                   -> solution (reference answer + follow-up chain, one at a time)
                   -> self-rate -> next.

   The clock and the hint counter exist so the self-rating has something to
   anchor to: "solved clean" means no hints, which the UI can now check. */

const RATES = [
  ['Solved clean', 'clean', 'var(--green)'],
  ['Solved w/ hints', 'hinted', 'var(--warn)'],
  ['Failed', 'failed', 'var(--red)']
];

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a uniform shuffle and
   biases which problems appear -- in a drill tool that quietly skews practice. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Interview() {
  /* side effect belongs in an effect, and the level tint must be undone on exit */
  useEffect(() => {
    const prev = document.body.dataset.level;
    document.body.dataset.level = '3';
    return () => { document.body.dataset.level = prev || '1'; };
  }, []);

  const [modFilter, setMod] = useState('all');
  const [tier, setTier] = useState('any');
  const [count, setCount] = useState(3);
  const [pool, setPool] = useState(null);
  const [building, setBuilding] = useState(false);
  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('statement');   // statement | solution
  const [fuStep, setFu] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [results, setResults] = useState([]);
  const [report, setReport] = useState(null);        // set once, drives the report screen
  const [secs, setSecs] = useState(0);
  const startedAt = useRef(Date.now());

  const cur = queue?.[idx];
  const live = !!cur && !report;

  /* per-problem clock */
  useEffect(() => {
    if (!live) return;
    setSecs(0);
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [live, idx]);

  async function buildPool() {
    setBuilding(true);
    const targets = [];
    const modList = modFilter === 'all' ? MODULES : MODULES.filter(m => m.id === modFilter);
    for (const m of modList)
      for (let L = 1; L <= 4; L++) {
        if (tier !== 'any' && L !== +tier) continue;
        try {
          const les = await loadLesson(m.id, L);
          for (const s of les.sections || [])
            for (const b of s.blocks || []) {
              const items = b.type === 'problems' ? b.items : b.type === 'problem' ? [b] : [];
              for (const pr of items)
                targets.push({ ...pr, lessonRef: `${m.id}_L${L}`, moduleTitle: m.title, level: L });
            }
        } catch { /* a module with no lesson at this level is not an error */ }
      }
    setPool(targets);
    if (targets.length) {
      setQueue(shuffle(targets).slice(0, count));
      setIdx(0); setPhase('statement'); setFu(0); setHintsUsed(0);
      setResults([]); setReport(null); startedAt.current = Date.now();
    }
    setBuilding(false);
  }

  const rate = useCallback(rating => {
    if (!cur) return;
    if (rating === 'failed')
      logMistake(cur.lessonRef, `Interview: ${cur.title}`, cur.platform || 'review');

    const row = {
      title: cur.title, id: cur.id, tier: cur.tier ?? cur.level,
      outcome: rating, secs, hints: hintsUsed
    };
    const next = [...results, row];
    setResults(next);

    if (idx + 1 >= queue.length) {
      /* build the report from `next`, not from `results` -- the state update
         above has not been applied yet, so reading `results` here would always
         drop the final problem from the session summary. */
      const clean = next.filter(r => r.outcome === 'clean').length;
      const session = {
        type: 'interview', at: Date.now(),
        count: next.length, clean,
        minutes: Math.round((Date.now() - startedAt.current) / 60000),
        results: next.map(r => ({ title: r.title, outcome: r.outcome }))
      };
      actionsExt.addSession(session);
      setReport({ rows: next, clean, minutes: session.minutes });
    } else {
      setIdx(i => i + 1); setPhase('statement'); setFu(0); setHintsUsed(0);
    }
  }, [cur, idx, queue, results, secs, hintsUsed]);

  /* ---------- report ---------- */
  if (report) {
    const { rows, clean, minutes } = report;
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 620 }}>
        <div style={{ textAlign: 'center' }}>
          <span className="badge">DEBRIEF</span>
          <h1 style={{ color: clean === rows.length ? 'var(--green)' : 'var(--warn)', margin: '10px 0' }}>
            {clean}/{rows.length} solved clean
          </h1>
          <p style={{ color: 'var(--text-dim)', fontFamily: 'Space Mono', fontSize: 12 }}>
            {minutes} min · {rows.reduce((a, r) => a + r.hints, 0)} hints taken
          </p>
        </div>
        <div className="card" style={{ margin: '20px 0' }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ flex: 1 }}>{plain(r.title)}</span>
              <span className="prob-meta">{fmt(r.secs)}{r.hints ? ` · ${r.hints}h` : ''}</span>
              <span style={{ color: outcomeColor(r.outcome), fontFamily: 'Space Mono', fontSize: 12 }}>{r.outcome}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="reveal-btn" onClick={() => { setReport(null); setQueue(null); }}>New interview</button>
          <Link to="/" className="level-pill">&larr; Hub</Link>
        </div>
      </div>
    );
  }

  /* ---------- config ---------- */
  if (!queue) return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 720 }}>
      <span className="badge">MOCK INTERVIEW</span>
      <h1 style={{ fontSize: 34, color: 'var(--text-bright)', margin: '10px 0 6px' }}>Simulate the room</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
        Statement first, clock running. Hints cost you the &ldquo;clean&rdquo; rating.
        Then compare against the reference solution and walk the follow-up chain.
        Failed problems land in your mistake log.
      </p>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">MODULE</span>
          <select value={modFilter} onChange={e => setMod(e.target.value)} style={selStyle}>
            <option value="all">All modules</option>
            {MODULES.map(m => <option key={m.id} value={m.id}>{m.num} {m.title}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">DIFFICULTY TIER</span>
          <select value={tier} onChange={e => setTier(e.target.value)} style={selStyle}>
            <option value="any">Any</option>
            {[1, 2, 3, 4].map(t => <option key={t} value={t}>L{t} only</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">PROBLEMS: {count}</span>
          <input type="range" min="1" max="8" value={count}
            aria-label={`Number of problems: ${count}`}
            onChange={e => setCount(+e.target.value)} />
        </label>
        <button className="reveal-btn" disabled={building} onClick={buildPool}
          style={{ padding: '12px 0', fontSize: 12 }}>
          {building ? 'Loading pool…' : 'Start interview'}
        </button>
        <div aria-live="polite" style={{ fontSize: 12, color: 'var(--text-dim)', minHeight: 18 }}>
          {pool && !building && (pool.length
            ? `Pool: ${pool.length} problems match these filters.`
            : 'No problems match these filters — widen the module or tier.')}
        </div>
      </div>
    </div>
  );

  /* ---------- live ---------- */
  const followups = cur.followups || [];
  const hints = cur.hints || [];
  const hasSolution = !!cur.solutionCode;
  return (
    <div className="container" style={{ paddingTop: 30, maxWidth: 820 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, gap: 10, flexWrap: 'wrap'
      }}>
        <span className="badge">INTERVIEW · Q{idx + 1}/{queue.length}</span>
        <span style={{ fontFamily: 'Space Mono', fontSize: 20, color: secs > 1800 ? 'var(--red)' : 'var(--text-bright)' }}>
          <span className="sr-only">Elapsed </span>{fmt(secs)}
        </span>
        <span className="badge blue">{(cur.tier ?? cur.level) ? 'L' + (cur.tier ?? cur.level) : ''}</span>
      </div>

      <h2 style={{ color: 'var(--text-bright)', marginBottom: 8 }}>{cur.title}</h2>
      <div className="prob-meta" style={{ marginBottom: 14 }}>
        {cur.moduleTitle}{cur.platform ? ' · ' + cur.platform : ''}
        {cur.patterns?.length ? ' · ' + cur.patterns.join(', ') : ''}
      </div>
      {cur.statement && <p>{cur.statement}</p>}

      {phase === 'statement' && <>
        {/* hints are pulled one at a time, the way an interviewer doles them out,
            instead of the whole list appearing at once alongside the solution */}
        {hints.slice(0, hintsUsed).map((h, i) =>
          <div key={i} className="callout blue">Hint {i + 1}: {h}</div>)}
        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {hintsUsed < hints.length && (
            <button className="reveal-btn" onClick={() => setHintsUsed(n => n + 1)}>
              Request hint ({hintsUsed + 1}/{hints.length})
            </button>
          )}
          <button className="reveal-btn" onClick={() => setPhase('solution')}>
            Attempt done — show solution
          </button>
          <button className="reveal-btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            onClick={() => setPhase('solution')}>
            Give up
          </button>
        </div>
      </>}

      {phase === 'solution' && <>
        {hints.length > 0 && (
          <details style={{ margin: '14px 0' }}>
            <summary className="card-title" style={{ cursor: 'pointer' }}>ALL HINTS ({hints.length})</summary>
            {hints.map((h, i) => <div key={i} className="callout blue">Hint {i + 1}: {h}</div>)}
          </details>
        )}

        <p className="card-title" style={{ marginTop: 18 }}>REFERENCE SOLUTION</p>
        {hasSolution
          ? <CodeBlock b={cur.solutionCode} />
          : <div className="callout warn">
            No reference solution has been authored for this problem yet
            {cur.lc ? <> — work from the statement, then check <code>{cur.lc}</code>.</> : '.'}
          </div>}
        {cur.complexity && <p className="prob-meta" style={{ marginTop: 8 }}>{cur.complexity}</p>}

        {followups.length > 0 && <>
          <p className="card-title" style={{ marginTop: 22 }}>FOLLOW-UP CHAIN</p>
          {followups.slice(0, fuStep).map((f, i) => (
            <div key={i} className="followup-chain">
              <div className="followup-q">{f.q}</div>
              <div className="followup-a open">{f.a}</div>
            </div>
          ))}
          {fuStep < followups.length && (
            <button className="reveal-btn" style={{ marginTop: 12 }} onClick={() => setFu(s => s + 1)}>
              Next follow-up ({fuStep + 1}/{followups.length})
            </button>
          )}
        </>}

        {fuStep >= followups.length && (
          <div style={{ marginTop: 24 }}>
            <p className="card-title">SELF-RATE THIS PROBLEM</p>
            {hintsUsed > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                You took {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} — that is not a clean solve.
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {RATES.map(([label, val, color]) => (
                <button key={val} className="reveal-btn"
                  style={{ borderColor: color, color, opacity: val === 'clean' && hintsUsed > 0 ? .45 : 1 }}
                  onClick={() => rate(val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

function outcomeColor(o) {
  return o === 'clean' ? 'var(--green)' : o === 'hinted' ? 'var(--warn)' : 'var(--red)';
}
function plain(text) {
  return String(text || '').replace(/[*`<>&]/g, '').slice(0, 120);
}

const selStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text-bright)', padding: '9px 12px', fontSize: 14
};
