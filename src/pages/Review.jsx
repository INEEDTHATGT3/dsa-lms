import React, { useMemo, useState, useEffect } from 'react';
import { useProgress, srsActions } from '../lib/progress.js';
import { dueCards } from '../lib/srs.js';
import { loadLesson, LEVEL_META } from '../lib/content.js';
import { Link } from 'react-router-dom';

/* Review queue: due SRS cards one at a time with SM-2 rating buttons.
   rev cards -> show lesson revision bullets; prob cards -> statement+hints. */

const RATING = [
  ['Again', 0, 'var(--red)'],
  ['Hard', 1, 'var(--warn)'],
  ['Good', 2, 'var(--green)'],
  ['Easy', 3, 'var(--accent3)']
];

export default function Review() {
  document.body.dataset.level = '1';
  const p = useProgress();
  const due = useMemo(() => dueCards(p.srs), [p.srs]);
  const [idx, setIdx] = useState(0);
  const [cardData, setCardData] = useState(null);   // lesson/problem payload
  const [revealed, setRevealed] = useState(false);

  const card = due[idx];

  useEffect(() => {
    setRevealed(false); setCardData(null);
    if (!card) return;
    const [, c] = card;
    if (c.type === 'rev') {
      loadLesson(...splitLessonId(c.ref.lessonId)).then(setCardData).catch(() => {});
    } else if (c.ref.pid) {
      const lessonRef = c.ref.lessonId;
      loadLesson(...splitLessonId(lessonRef))
        .then(L => {
          let found = null;
          for (const s of L.sections || [])
            for (const b of s.blocks || [])
              if (b.type === 'problems')
                found = b.items.find(x => x.id === c.ref.pid) || found;
          setCardData({ lesson: L, problem: found });
        }).catch(() => {});
    }
  }, [idx, due.length]);

  if (!due.length) return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h1 style={{ fontSize: 50, color: 'var(--green)' }}>✓ Queue clear</h1>
      <p style={{ color: 'var(--text-dim)' }}>Nothing due today. Come back tomorrow or complete more artifacts.</p>
      <Link to="/" className="level-pill" style={{ display: 'inline-block', marginTop: 14 }}>← Hub</Link>
    </div>
  );

  const [, c] = card;
  const isRev = c.type === 'rev';

  function rate(rating) {
    srsActions.rate(card[0], rating);
    // stay on same index - rated card leaves the due list, next slides in
  }

  return (
    <div className="container" style={{ paddingTop: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span className="badge">REVIEW QUEUE</span>
        <span className="badge blue">{due.length} due</span>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="card-title">
          {isRev ? 'REVISION CARD' : 'PROBLEM'} ·{' '}
          <Link to={`/lesson/${c.ref.lessonId.replace('_L', '/')}`}
            style={{ color: 'var(--lvl)', textDecoration: 'none' }}>
            {c.ref.lessonId}
          </Link>
          {c.lapses > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>laps:{c.lapses}</span>}
        </div>

        {!revealed && (
          <button className="reveal-btn" onClick={() => setRevealed(true)}
            style={{ fontSize: 13, padding: '10px 24px' }}>
            Show prompt
          </button>
        )}

        {revealed && <CardContent isRev={isRev} data={cardData} c={c} />}

        {revealed && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            {RATING.map(([label, val, color]) => (
              <button key={val} className="reveal-btn"
                style={{ borderColor: color, color }}
                onClick={() => rate(val)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
          Rate honestly — Again shows it again today; intervals stretch on Good/Easy.
        </p>
      </div>

      <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Space Mono' }}>
        card {idx + 1} of {due.length} · next due {c.due}
      </p>
    </div>
  );
}

function CardContent({ isRev, data, c }) {
  if (isRev) {
    const rev = data?.revisionCard || [];
    if (!data) return <p>Loading…</p>;
    return (
      <div className="rev-card">
        <ul>{rev.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          Recall these from memory before rating. Full lesson:
        </p>
      </div>
    );
  }
  const pr = data?.problem;
  if (!pr) return <p>Loading…</p>;
  return (<>
    <div className="prob-name" style={{ fontSize: 16 }}>{pr.title}</div>
    <div className="prob-meta">{pr.platform}{pr.patterns?.length ? ' · ' + pr.patterns.join(', ') : ''}</div>
    {pr.statement && <p style={{ marginTop: 8 }}>{pr.statement}</p>}
    {(pr.hints || []).slice(0, 1).map((h, i) =>
      <div key={i} className="callout blue" style={{ fontSize: 13 }}>Hint: {h}</div>)}
    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
      Attempt recall (code it mentally / on paper) before rating.
    </p>
  </>);
}

function splitLessonId(id) {
  // "foundations_L3" -> ["foundations", "3"] ; module ids may contain underscores
  const m = id.match(/^(.+)_L(\d+)$/);
  return m ? [m[1], m[2]] : [id, '1'];
}
