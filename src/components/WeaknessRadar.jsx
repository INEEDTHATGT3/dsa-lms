import React from 'react';
import { weakestModules, overallAccuracy } from '../lib/analytics.js';
import { MODULES } from '../lib/content.js';
import { Link } from 'react-router-dom';

/* Weakness radar: quiz accuracy per module, weakest first (min 4 attempts).
   Derived during render - no effects. */
export default function WeaknessRadar({ progress }) {
  const weak = weakestModules(progress, 4, 3);
  const overall = overallAccuracy(progress);
  if (!weak.length)
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">WEAKNESS RADAR</div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Answer {4 - countAttempts(progress) >= 0 ? 4 - countAttempts(progress) : 0}+ more
          MCQs to activate the radar (needs ≥4 attempts per module).
        </p>
      </div>
    );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="card-title" style={{ marginBottom: 4 }}>WEAKNESS RADAR</div>
        {overall !== null &&
          <span style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--text-dim)' }}>
            overall accuracy {overall}%
          </span>}
      </div>
      {weak.map(w => {
        const mod = MODULES.find(m => m.id === w.mod?.id);
        return (
          <div key={w.mod?.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Link to={`/lesson/${w.mod?.id}/2`} style={{ color: 'var(--text-bright)', textDecoration: 'none' }}>
                {mod ? `M${mod.num} ${mod.title}` : w.mod?.id}
              </Link>
              <span style={{
                fontFamily: 'Space Mono',
                color: w.pct < 50 ? 'var(--red)' : w.pct < 75 ? 'var(--warn)' : 'var(--green)'
              }}>
                {w.pct}% ({w.right}/{w.total})
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3 }}>
              <div style={{
                height: '100%', width: w.pct + '%', borderRadius: 3,
                background: w.pct < 50 ? 'var(--red)' : w.pct < 75 ? 'var(--warn)' : 'var(--green)'
              }} />
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
        Drill weakest module's L2 problem ladder, then re-rate quizzes.
      </p>
    </div>
  );
}

function countAttempts(p) {
  let n = 0;
  for (const l of Object.values(p.lessons)) n += Object.keys(l.mcq || {}).length;
  return n;
}
