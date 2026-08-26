import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MODULES } from '../lib/content.js';
import { loadLesson } from '../lib/content.js';
import { useProgress, actionsExt, getSessions } from '../lib/progress.js';

/* Timed sprint: pick pool -> countdown -> solve via linked platforms or
   local statement view -> mark outcome live -> score report. */

const DURATIONS = [15, 30, 45];

export default function Sprint() {
  document.body.dataset.level = '3';
  const p = useProgress();
  const [modFilter, setMod] = useState('all');
  const [tierF, setTierF] = useState('any');
  const [minutes, setMinutes] = useState(30);
  const [pool, setPool] = useState(null);
  const [queue, setQueue] = useState(null);
  const [building, setBuilding] = useState(false);

  const [startedAt, setStartedAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  const [outcomes, setOutcomes] = useState({});   // pid -> solved|failed
  const outcomesRefLive = useRef(outcomes);
  useEffect(() => { outcomesRefLive.current = outcomes; }, [outcomes]);
  const [activeIdx, setActiveIdx] = useState(0);  // current problem view
  const [finished, setFinished] = useState(false);

  /* timer */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { finishRun(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  async function build() {
    setBuilding(true);
    const targets = [];
    const modList = modFilter === 'all' ? MODULES : MODULES.filter(m => m.id === modFilter);
    for (const m of modList)
      for (let L = 1; L <= 4; L++) {
        if (tierF !== 'any' && L !== +tierF) continue;
        try {
          const les = await loadLesson(m.id, L);
          for (const s of les.sections || [])
            for (const b of s.blocks || [])
              if (b.type === 'problems')
                for (const pr of b.items)
                  targets.push({ ...pr, lessonRef: `${m.id}/${L}`, moduleTitle: m.title });
        } catch {}
      }
    const shuffled = targets.sort(() => Math.random() - 0.5)
      .slice(0, Math.max(4, Math.floor(minutes / 6)));
    setPool(targets);
    setQueue(shuffled);
    setOutcomes({});
    setActiveIdx(0);
    setStartedAt(Date.now());
    setRemaining(minutes * 60);
    setRunning(true);
    setFinished(false);
    setBuilding(false);
  }

  function mark(pid, outcome) {
    setOutcomes(o => ({ ...o, [pid]: outcome }));
    // auto-advance to next unsolved
    setActiveIdx(i => {
      for (let step = 1; step <= queue.length; step++) {
        const j = (i + step) % queue.length;
        if (!outcomesRef(queue)[j] && j !== i) return j;
      }
      return i;
    });
  }
  function outcomesRef(q) { return outcomes; }

  function finishRun() {
    setRunning(false); setFinished(true);
    const live = outcomesRefLive.current;
    const solved = Object.values(live).filter(o => o === 'solved').length;
    actionsExt.addSession({
      type: 'sprint', at: Date.now(), minutes,
      attempted: Object.keys(live).length, solved
    });
  }

  /* ---------- config ---------- */
  if (!queue) return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 720 }}>
      <span className="badge">TIMED SPRINT</span>
      <h1 style={{ fontSize: 34, color: 'var(--text-bright)', margin: '10px 0 6px' }}>Pressure training</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
        Countdown runs. Solve on LeetCode/GFG via links below each problem, then mark the outcome.
        Report at the end.
      </p>

      {getSessions(p).length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">RECENT SPRINTS</div>
          {getSessions(p).filter(s => s.type === 'sprint').slice(0, 5).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span>{new Date(s.at).toLocaleDateString()}</span>
              <span style={{ fontFamily: 'Space Mono', color: 'var(--lvl)' }}>
                {s.solved}/{s.attempted} in {s.minutes}m
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">MODULE</span>
          <select value={modFilter} onChange={e => setMod(e.target.value)} style={selStyle}>
            <option value="all">All modules</option>
            {MODULES.map(m => <option key={m.id} value={m.id}>{m.num} {m.title}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">TIER</span>
          <select value={tierF} onChange={e => setTierF(e.target.value)} style={selStyle}>
            <option value="any">Any</option>
            {[1,2,3,4].map(t => <option key={t} value={t}>L{t} only</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="card-title">DURATION</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {DURATIONS.map(d => (
              <button key={d} className={'reveal-btn' + (minutes === d ? '' : '')}
                style={minutes === d ? { background: 'var(--lvl)', color: 'var(--bg)' } : {}}
                onClick={() => setMinutes(d)}>{d} min</button>
            ))}
          </div>
        </label>
        <button className="reveal-btn" disabled={building} onClick={build}
          style={{ padding: '12px 0', fontSize: 12 }}>
          {building ? 'Building pool…' : 'Start sprint'}
        </button>
      </div>
    </div>
  );

  /* ---------- report ---------- */
  if (finished || remaining === 0) {
    const solved = Object.values(outcomes).filter(o => o === 'solved').length;
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: 'center' }}>
        <h1 style={{ color: solved >= 3 ? 'var(--green)' : 'var(--warn)' }}>
          {solved} solved / {queue.length}
        </h1>
        <p style={{ color: 'var(--text-dim)' }}>{minutes} minute sprint</p>
        <div className="card" style={{ textAlign: 'left', maxWidth: 560, margin: '20px auto' }}>
          {queue.map(pr => (
            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{pr.title}</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 12, color: outcomes[pr.id]==='solved'?'var(--green)':outcomes[pr.id]==='failed'?'var(--red)':'var(--text-dim)' }}>
                {outcomes[pr.id] || 'unattempted'}
              </span>
            </div>
          ))}
        </div>
        <button className="reveal-btn" onClick={() => setQueue(null)}>New sprint</button>
        {' '}
        <a href="#/" className="level-pill" style={{ display: 'inline-block', textDecoration: 'none' }}>← Hub</a>
      </div>
    );
  }

  /* ---------- live sprint ---------- */
  const cur = queue[activeIdx];
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const lowTime = remaining < 120;

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="badge">SPRINT · {activeIdx+1}/{queue.length}</span>
        <span className={'badge' + (lowTime ? ' green' : '')}
          style={{
            fontFamily: 'DM Mono', fontSize: 20,
            ...(lowTime ? { background: 'rgba(255,77,109,.1)', borderColor: 'var(--red)', color: 'var(--red)' } : {})
          }}>
          {mm}:{ss}
        </span>
      </div>

      {/* problem strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {queue.map((pr, i) => (
          <button key={pr.id}
            onClick={() => setActiveIdx(i)}
            className={'level-pill'}
            style={{
              ...(i === activeIdx ? { background: 'var(--lvl)', color: 'var(--bg)', border: 'none' } : {}),
              ...(outcomes[pr.id] ? { opacity: .55 } : {})
            }}>
            {i+1}{outcomes[pr.id] === 'solved' ? ' ✓' : outcomes[pr.id] === 'failed' ? ' ✗' : ''}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="prob-name" style={{ fontSize: 17 }}>{cur.title}</div>
        <div className="prob-meta" style={{ margin: '4px 0 10px' }}>
          {cur.platform}{cur.lc ? ` · LC ${cur.lc}` : ''}{cur.patterns?.length? ' · '+cur.patterns.join(', '):''}
        </div>
        {cur.statement && <p>{cur.statement}</p>}
        {(cur.hints||[]).slice(0,1).map((h,i)=><div key={i} className="callout blue">Hint: {h}</div>)}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="reveal-btn"
            style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
            onClick={() => mark(cur.id, 'solved')}>✓ Solved</button>
          <button className="reveal-btn"
            style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            onClick={() => mark(cur.id, 'failed')}>✗ Failed</button>
          {cur.lc && (
            <a className="level-pill" target="_blank" rel="noreferrer"
              href={`https://leetcode.com/problems/`}>
              Open platform ↗
            </a>
          )}
          {activeIdx < queue.length - 1 &&
            <button className="reveal-btn" onClick={() => setActiveIdx(i => i+1)}>Skip →</button>}
        </div>
      </div>

      <button className="reveal-btn" style={{ marginTop: 18 }}
        onClick={() => { setRunning(false); finishRun(); }}>
        End sprint &amp; see report
      </button>
    </div>
  );
}

const selStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text-bright)', padding: '9px 12px', fontSize: 14
};
