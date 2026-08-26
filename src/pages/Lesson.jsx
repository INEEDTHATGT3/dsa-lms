import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadLesson, moduleById, LEVEL_META } from '../lib/content.js';
import { useProgress, actions } from '../lib/progress.js';
import { Block } from '../components/blocks.jsx';
import NotesJournal from '../components/NotesJournal.jsx';

function PlacementQuiz({ items, lessonId }) {
  const [answers, setAnswers] = useState({});
  const p = useProgress();
  const saved = p.lessons[lessonId]?.mcq || {};
  const merged = { ...saved, ...answers };
  const answered = Object.keys(merged).length;
  const total = items.length;
  const right = items.reduce((a, it, i) =>
    a + (merged[`place-q${i}`] === it.answer ? 1 : 0), 0);

  return (
    <section className="section" id="placement">
      <div className="section-header"><span className="section-num">00 //</span><h2>Which layer am I?</h2></div>
      <p>Honest answers decide whether this file is your entry point.</p>
      {items.map((it, i) => (
        <div key={i} className="quiz-card">
          <div className="quiz-q">{i + 1}. {it.q}</div>
          {it.options.map((o, oi) => {
            const chosen = merged[`place-q${i}`];
            const cls = chosen === undefined ? '' :
              oi === it.answer ? 'correct' : (oi === chosen ? 'wrong' : '');
            return (
              <div key={oi}
                className={'quiz-opt ' + cls + (chosen !== undefined ? ' locked' : '')}
                onClick={() => {
                  setAnswers(a => ({ ...a, [`place-q${i}`]: oi }));
                  actions.recordMcq(lessonId, `place-q${i}`, oi);
                }}>
                <span className="k">{'ABCD'[oi]}</span><span>{o}</span>
              </div>);
          })}
        </div>
      ))}
      {answered === total && (
        <div id="placement-result" style={{ padding: 14, border: '1px solid var(--lvl-border)', borderRadius: 6, color: 'var(--lvl)', fontFamily: 'Space Mono', fontSize: 13 }}>
          Score {right}/{total} —{' '}
          {right <= Math.floor(total / 3) ? 'START HERE - work this file top to bottom.'
            : right < total ? 'Skim early sections; focus patterns + problem set.'
            : 'Consider the NEXT level file for a challenge.'}
        </div>
      )}
    </section>
  );
}

export default function Lesson() {
  const { moduleId, level } = useParams();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const mod = moduleById(moduleId);
  const meta = LEVEL_META[+level];
  const progress = useProgress();
  const lessonId = `${moduleId}_L${level}`;
  const st = progress.lessons[lessonId] || {};

  useEffect(() => {
    let live = true;
    setLesson(null); setError(null);
    loadLesson(moduleId, level)
      .then(l => { if (live) setLesson(l); })
      .catch(e => { if (live) setError(e.message); });
    document.body.dataset.level = String(level);
    window.scrollTo(0, 0);
    return () => { live = false; };
  }, [moduleId, level]);

  if (error) return <div className="container"><p style={{ color: 'var(--red)' }}>{error}</p></div>;
  if (!lesson) return <div className="container"><p>Loading…</p></div>;

  const solvedCount = Object.keys(st.solved || {}).length;
  const store = {
    mcq: st.mcq || {},
    solved: st.solved || {},
    actions
  };

  return (<>
    <div className="hero" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', right: 10, top: -10, fontSize: 150, fontWeight: 800, color: 'var(--lvl-rgba)', fontFamily: 'Space Mono' }}>L{level}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="badge">MODULE {mod.num}</span>
        <span className="badge blue">L{level} · {meta.name}</span>
        <span className="badge green">{lesson.tagline}</span>
      </div>
      <h1>{lesson.title}</h1>
      <div className="promise">{meta.promise}</div>
      <LevelStrip moduleId={moduleId} level={+level} />
    </div>

    <nav className="toc">
      {lesson.sections.map((s, i) =>
        <a key={i} href={`#sec-${i}`}>{String(i + 1).padStart(2, '0')} · {s.title.split('—')[0].trim()}</a>)}
      <a href="#revision">REV CARD</a>
    </nav>
    <div className="progress-wrap"><div className="progress-bar" id="pbar" /></div>

    <ScrollProgress />

    <div className="container">
      {lesson.placementQuiz?.length >= 5 &&
        <PlacementQuiz items={lesson.placementQuiz} lessonId={lessonId} />}

      {lesson.sections.map((s, i) => (
        <section key={i} className="section" id={`sec-${i}`}>
          <div className="section-header">
            {/* eslint-disable-next-line react/jsx-no-comment-textnodes -- literal "//" is a design label */}
            <span className="section-num">{String(i + 1).padStart(2, '0')} //</span>
            <h2>{s.title}</h2>
          </div>
          {s.blocks.map((b, bi) => (
            <Block key={bi} b={b} ctx={{
              lessonId,
              key: `s${i}-${bi}`,
              store
            }} />
          ))}
        </section>
      ))}

      <section className="section" id="revision">
        <div className="section-header">
          {/* eslint-disable-next-line react/jsx-no-comment-textnodes -- literal "//" is a design label */}
          <span className="section-num">{String(lesson.sections.length + 1).padStart(2, '0')} //</span>
          <h2>60-second revision card</h2>
        </div>
        <div className="rev-card">
          <h4 style={{ letterSpacing: 3, color: 'var(--lvl)', marginBottom: 12 }}>RE-READ BEFORE INTERVIEW / CONTEST</h4>
          <ul>{lesson.revisionCard.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
        <h3>Glossary</h3>
        <table className="trace"><tbody>
          {lesson.glossary.map(g => (
            <tr key={g.term}><td style={{ width: 210 }}><code>{g.term}</code></td><td>{g.def}</td></tr>
          ))}
        </tbody></table>
        <p style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: 13 }}>
          Solved problems: <strong style={{ color: 'var(--green)' }}>{solvedCount}</strong>
        </p>
      </section>

      <NotesJournal lessonId={lessonId} />

      <div className="complete-box">
        <button
          className={st.complete ? 'done' : ''}
          onClick={() => actions.markComplete(lessonId, !st.complete)}>
          {st.complete ? '✓ COMPLETED' : 'MARK ARTIFACT COMPLETE'}
        </button>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
          Progress saved locally on this device.
        </p>
      </div>
    </div>
    <div className="footer">DSA LAYERED SYSTEM · MODULE {mod.num} · L{level} {meta.name}</div>
  </>);
}

function LevelStrip({ moduleId, level }) {
  const p = useProgress();
  return (
    <div className="level-strip">
      {[1, 2, 3, 4].map(L => (
        <a key={L}
          className={'level-pill' + (L === level ? ' current' : '') +
            ((p.lessons[`${moduleId}_L${L}`]?.complete) ? ' done' : '')}
          href={`#/lesson/${moduleId}/${L}`}>
          {LEVEL_META[L].name}
        </a>
      ))}
    </div>
  );
}

/* passive scroll listener writing to ref -> direct DOM width (no re-render) */
function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById('pbar');
    if (!bar) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        bar.style.width =
          Math.min(100, h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
