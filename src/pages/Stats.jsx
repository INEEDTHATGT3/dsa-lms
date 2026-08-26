import React, { useMemo } from 'react';
import { MODULES } from '../lib/content.js';
import { useProgress } from '../lib/progress.js';

/* Stats dashboard - derived during render from store snapshot
   (rerender-derived-state-no-effect). No effects, no extra state. */
export default function Stats({ onClose }) {
  const p = useProgress();

  const rows = useMemo(() => MODULES.map(mod => {
    const per = [1,2,3,4].map(L => !!p.lessons[`${mod.id}_L${L}`]?.complete);
    return { mod, per, done: per.filter(Boolean).length };
  }), [p]);

  const totalDone = rows.reduce((a,r) => a + r.done, 0);
  const solved = Object.values(p.lessons)
    .reduce((a,l) => a + Object.keys(l.solved||{}).length, 0);
  const mcqTotal = Object.values(p.lessons)
    .reduce((a,l) => a + Object.keys(l.mcq||{}).length, 0);
  const mcqRight = Object.entries(p.lessons).reduce((a,[id,l]) => {
    // correctness needs answer keys; count attempts here (accuracy shown in-lesson)
    return a + Object.keys(l.mcq||{}).length;
  }, 0) - mcqTotal + mcqTotal;

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
        <BigStat label="MCQs answered" value={String(mcqTotal)} />
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
    </div>
  );
}

function BigStat({ label, value, pct }) {
  return (
    <div className="mem-seg" style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--lvl)', fontFamily: 'DM Mono' }}>{value}</div>
      <div className="seg-desc">{label}</div>
      {pct !== undefined && (
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginTop: 8 }}>
          <div style={{ height: '100%', width: pct+'%', background: 'var(--lvl)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}
