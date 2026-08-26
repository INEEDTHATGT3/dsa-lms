import React, { useMemo, useState, useEffect } from 'react';
import { MODULES } from '../lib/content.js';
import { loadLesson } from '../lib/content.js';
import { useProgress, actionsExt, logMistake } from '../lib/progress.js';
import { Link } from 'react-router-dom';

/* Mock interview: problem -> attempt window -> solution reveal ->
   follow-up chain one-by-one -> self-rate -> next. Failures auto-log. */

const RATES = [
  ['Solved clean', 'clean', 'var(--green)'],
  ['Solved w/ hints', 'hinted', 'var(--warn)'],
  ['Failed', 'failed', 'var(--red)']
];

export default function Interview() {
  document.body.dataset.level = '3';
  const p = useProgress();
  const [modFilter, setMod] = useState('all');
  const [tier, setTier] = useState('any');
  const [count, setCount] = useState(3);
  const [pool, setPool] = useState(null);       // built candidate list
  const [building, setBuilding] = useState(false);
  const [queue, setQueue] = useState(null);     // chosen session problems
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('statement'); // statement|solution|done
  const [fuStep, setFu] = useState(0);
  const [results, setResults] = useState([]);
  const [startedAt, setStartedAt] = useState(0);

  /* pool builder - lazy-loads lessons for chosen filters */
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
            for (const b of s.blocks || [])
              if (b.type === 'problems')
                for (const pr of b.items) {
                  if (pr.tier === L || tier === 'any')
                    targets.push({ ...pr, lessonRef: `${m.id}/${L}`, moduleTitle: m.title });
                }
        } catch {}
      }
    // shuffle, take count
    const shuffled = targets.sort(() => Math.random() - 0.5).slice(0, count);
    setPool(targets); setQueue(shuffled); setIdx(0); setPhase('statement');
    setResults([]); setStartedAt(Date.now()); setBuilding(false);
  }

  const cur = queue?.[idx];

  function rate(rating) {
    if (!cur) return;
    const outcome = rating;
    if (rating === 'failed') {
      logMistake(cur.lessonRef.replace('/', '_L') && cur.lessonRef.includes('/')
        ? cur.lessonRef.replace('/', '_L')
        : cur.lessonRef,
        `Interview fail: ${cur.title}`, cur.platform || 'review');
    }
    setResults(rs => [...rs, { ...cur, outcome }]);
    advance();
  }
  function advance() {
    if (idx + 1 >= queue.length) finish(); else { setIdx(i => i + 1); setPhase('statement'); setFu(0); }
  }
  function finish() {
    actionsExt.addSession({
      type: 'interview', at: Date.now(),
      count: queue.length,
      clean: results.filter(r => r.outcome === 'clean').length +
             (results.length ? 0 : 0),
      results: results.map(r => ({ title: r.title, outcome: r.outcome }))
    });
    setQueue(null);
  }

  /* ---------- config screen ---------- */
  if (!queue) return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 720 }}>
      <span className="badge">MOCK INTERVIEW</span>
      <h1 style={{ fontSize: 34, color: 'var(--text-bright)', margin: '10px 0 6px' }}>Simulate the room</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
        Statement first. Attempt honestly (paper/IDE). Then reveal solution + follow-up chain.
        Failed problems land in your mistake log.
      </p>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">MODULE</span>
          <select value={modFilter} onChange={e => setMod(e.target.value)}
            style={selStyle}>
            <option value="all">All modules</option>
            {MODULES.map(m => <option key={m.id} value={m.id}>{m.num} {m.title}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">DIFFICULTY TIER</span>
          <select value={tier} onChange={e => setTier(e.target.value)} style={selStyle}>
            <option value="any">Any</option>
            {[1,2,3,4].map(t => <option key={t} value={t}>L{t} only</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">PROBLEMS</span>
          <input type="range" min="1" max="5" value={count}
            onChange={e => setCount(+e.target.value)} />
          <span>{count}</span>
        </label>
        <button className="reveal-btn" disabled={building}
          onClick={buildPool}
          style={{ padding: '12px 0', fontSize: 12 }}>
          {building ? 'Loading pool…' : 'Start interview'}
        </button>
        {pool && !building &&
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Pool size: {pool.length}</p>}
      </div>
    </div>
  );

  /* ---------- report screen ---------- */
  if (!cur) {
    const clean = results.filter(r => r.outcome === 'clean').length;
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: 'center' }}>
        <h1 style={{ color: clean === results.length ? 'var(--green)' : 'var(--warn)' }}>
          {clean}/{results.length} solved clean
        </h1>
        <div className="card" style={{ textAlign: 'left', margin: '20px auto', maxWidth: 520 }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span><MDish text={r.title} /></span>
              <span style={{ color: outcomeColor(r.outcome), fontFamily: 'Space Mono', fontSize: 12 }}>{r.outcome}</span>
            </div>
          ))}
        </div>
        <Link to="/" className="level-pill" style={{ display: 'inline-block' }}>← Hub</Link>
      </div>
    );
  }

  /* ---------- live interview ---------- */
  const followups = cur.followups || [];
  return (
    <div className="container" style={{ paddingTop: 30, maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="badge">INTERVIEW · Q{idx+1}/{queue.length}</span>
        <span className="badge blue">{cur.tier ? 'L'+cur.tier : ''}</span>
      </div>

      <h2 style={{ color: 'var(--text-bright)', marginBottom: 8 }}>{cur.title}</h2>
      <div className="prob-meta" style={{ marginBottom: 14 }}>{cur.platform}{cur.patterns?.length? ' · '+cur.patterns.join(', '):''}</div>
      {cur.statement && <p>{cur.statement}</p>}

      {phase === 'statement' && (
        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="reveal-btn" onClick={() => setPhase('solution')}>
            Attempt done — show solution
          </button>
          <button className="reveal-btn" onClick={() => { setPhase('solution'); rate('failed'); }}>
            Give up
          </button>
        </div>
      )}

      {(phase === 'solution' || phase === 'followup') && <>
        {cur.hints?.map((h,i)=><div key={i} className="callout blue">Hint {i+1}: {h}</div>)}
        {cur.solutionCode
          ? <pre data-lang="cpp" className="always"><code>{cur.solutionCode.code || cur.solutionCode}</code></pre>
          : null}
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 10 }}>
          Compare with your attempt, then walk the follow-ups:
        </p>
        {followups.slice(0, fuStep).map((f,i)=>(
          <div key={i} className="followup-chain">
            <div className="followup-q">{f.q}</div>
            <div className="followup-a open">{f.a}</div>
          </div>
        ))}
        {fuStep < followups.length && (
          <button className="reveal-btn" style={{ marginTop: 12 }}
            onClick={() => setFu(s => s + 1)}>
            Next follow-up ({fuStep+1}/{followups.length})
          </button>
        )}
        {fuStep >= followups.length && (
          <div style={{ marginTop: 20 }}>
            <p className="card-title">SELF-RATE THIS PROBLEM</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {RATES.map(([label,val,color])=>(
                <button key={val} className="reveal-btn"
                  style={{ borderColor:color,color }}
                  onClick={()=>rate(val)}>
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
function MDish({ text }) {
  return String(text||'').replace(/[*`<>&]/g,'').slice(0,120);
}

/* shared select styling */
const selStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text-bright)', padding: '9px 12px', fontSize: 14
};
