import React, { useMemo } from 'react';
import { MODULES } from '../lib/content.js';
import { useProgress } from '../lib/progress.js';
import { exportAll, importAll } from '../lib/progress.js';
import { overallAccuracy } from '../lib/analytics.js';
import { getSessions } from '../lib/progress.js';

/* Stats dashboard - derived during render from store snapshot
   (rerender-derived-state-no-effect). No effects, no extra state. */
export default function Stats({ onClose }) {
  const p = useProgress();
  const overall = overallAccuracy(p);

  const rows = useMemo(() => MODULES.map(mod => {
    const per = [1,2,3,4].map(L => !!p.lessons[`${mod.id}_L${L}`]?.complete);
    return { mod, per, done: per.filter(Boolean).length };
  }), [p]);

  const totalDone = rows.reduce((a,r) => a + r.done, 0);
  const solved = Object.values(p.lessons)
    .reduce((a,l) => a + Object.keys(l.solved||{}).length, 0);
  const mcqTotal = Object.values(p.lessons)
    .reduce((a,l) => a + Object.keys(l.mcq||{}).length, 0);
  const pct = Math.round(totalDone / 76 * 100);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title">STATS DASHBOARD</div>
        <button className="reveal-btn" onClick={onClose}>Close</button>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <BigStat label="Artifacts complete" value={`${totalDone} / 76`} pct={pct} />
        <BigStat label="Problems solved" value={String(solved)} />
        <BigStat label="MCQs answered" value={String(mcqTotal)}
          sub={overall !== null ? `accuracy ${overall}%` : undefined} />
        <BigStat label="Modules touched" value={String(rows.filter(r=>r.done>0).length) + ' / 19'} />
      </div>

      <table className="trace" style={{ marginTop: 16 }}>
        <thead><tr><th>Module</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th></tr></thead>
        <tbody>{rows.map(({mod,per}) => (
          <tr key={mod.id}>
            <td style={{ color:'var(--text-bright)' }}>{mod.num} {mod.title}</td>
            {per.map((ok,i)=><td key={i} style={{textAlign:'center'}}>{ok?'✓':'·'}</td>)}
          </tr>
        ))}</tbody>
      </table>

      {/* recent sessions */}
      {getSessions(p).length > 0 && <>
        <h3>Recent sessions</h3>
        {getSessions(p).slice(0, 6).map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-dim)' }}>
              {new Date(s.at).toLocaleString()}
            </span>
            <span>
              {s.type === 'sprint'
                ? `${s.solved}/${s.attempted} solved · ${s.minutes}m`
                : s.type === 'interview'
                  ? `interview ${s.count}q`
                  : s.type}
            </span>
          </div>
        ))}
      </>}

      {/* export / import */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="reveal-btn"
          onClick={() => {
            const blob = new Blob([exportAll()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'dsa-progress-export.json';
            a.click();
            URL.revokeObjectURL(a.href);
          }}>
          Export progress
        </button>
        <label className="reveal-btn" style={{ cursor: 'pointer' }}>
          Import progress
          <input type="file" accept=".json" style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  importAll(JSON.parse(String(reader.result)));
                  alert('Progress imported.');
                } catch { alert('Invalid export file.'); }
              };
              reader.readAsText(file);
            }} />
        </label>
      </div>
    </div>
  );
}

function BigStat({ label, value, pct, sub }) {
  return (
    <div className="mem-seg" style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--lvl)', fontFamily: 'DM Mono' }}>{value}</div>
      <div className="seg-desc">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--accent3)', fontFamily: 'Space Mono', marginTop: 2 }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginTop: 8 }}>
          <div style={{ height: '100%', width: pct+'%', background: 'var(--lvl)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}
