import { useProgress, srsActions } from '../lib/progress.js';
import { Link } from 'react-router-dom';

/* Mistake log: auto-recorded wrong MCQs; resolve after re-attempt. */
export default function MistakeLog() {
  const p = useProgress();
  const open = (p.mistakes || []).filter(m => !m.resolved);
  const done = (p.mistakes || []).filter(m => m.resolved);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">MISTAKE LOG ({open.length} open)</div>
      {open.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No open mistakes. Wrong quiz answers land here automatically.</p>}
      {open.map(m => (
        <div key={m.id} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 14 }}><MDish text={m.q} /></span>
            <button className="reveal-btn" onClick={() => srsActions.resolveMistake(m.id)}>
              Resolved
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Space Mono' }}>
            correct: {m.correctAnswer} ·{' '}
            <Link to={`/lesson/${m.lessonId.replace('_L', '/')}`} style={{ color: 'var(--accent3)' }}>
              revisit lesson
            </Link>
          </div>
        </div>
      ))}
      {done.length > 0 &&
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--green)' }}>{done.length} resolved ✓</p>}
    </div>
  );
}
function MDish({ text }) {
  // minimal: strip tags for safety in this compact view
  return String(text || '').replace(/[*`<>&]/g, '').slice(0, 140);
}
