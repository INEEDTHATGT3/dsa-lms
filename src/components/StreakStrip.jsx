import { useProgress, streak, longestStreak } from '../lib/progress.js';

/* GitHub-style heatmap of study days (last ~17 weeks) + streak counters.
   Derived entirely during render - no effects. */
export default function StreakStrip() {
  const p = useProgress();
  const cur = streak(p);
  const best = longestStreak(p);
  const daySet = new Set(p.days || []);

  // last 119 days grid
  const cells = [];
  const d = new Date();
  d.setDate(d.getDate() - 118);
  for (let i = 0; i < 119; i++) {
    cells.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--lvl)', fontFamily: 'DM Mono' }}>
            {cur}<span style={{ fontSize: 13, color: 'var(--text-dim)' }}> day streak</span>
          </div>
          <div className="seg-desc">best {best}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(17, 12px)', gap: 3 }}>
          {cells.map(day => {
            const on = daySet.has(day);
            return <div key={day} title={day}
              style={{
                width: 11, height: 11, borderRadius: 2,
                background: on ? 'var(--lvl)' : 'var(--surface2)',
                border: '1px solid var(--border)'
              }} />;
          })}
        </div>
      </div>
    </div>
  );
}
