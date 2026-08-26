import React, { useMemo, useState } from 'react';
import { MODULES, LEVEL_META, moduleProgress } from '../lib/content.js';
import { useProgress, dueToday, streak, longestStreak } from '../lib/progress.js';
import SearchBox from '../components/SearchBox.jsx';
import ChangelogFeed from '../components/ChangelogFeed.jsx';
import StreakStrip from '../components/StreakStrip.jsx';
import MistakeLog from '../components/MistakeLog.jsx';
import WeaknessRadar from '../components/WeaknessRadar.jsx';
import { weakestModules, overallAccuracy } from '../lib/analytics.js';
import Stats from './Stats.jsx';
import { Link } from 'react-router-dom';

function countDone(p) {
  return Object.values(p.lessons).filter(l => l.complete).length;
}
function nextUp(p) {
  for (const mod of MODULES) {
    for (let L = 1; L <= 4; L++) {
      if (!p.lessons[`${mod.id}_L${L}`]?.complete) return { mod, L };
    }
  }
  return null;
}

export default function Hub() {
  document.body.dataset.level = '1';
  const progress = useProgress();
  const [showStats, setShowStats] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  const totalDone = countDone(progress);
  const dueN = dueToday(progress.srs);
  const streakN = streak(progress);
  const bestStreak = longestStreak(progress);
  const openMistakes = (progress.mistakes || []).filter(m => !m.resolved).length;
  const next = nextUp(progress);

  return (<>
    <div className="hero">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="badge">LAYERED STUDY SYSTEM</span>
        <span className="badge green">{totalDone} / 76 complete</span>
        <span className="badge blue">🔥 {streakN}-day streak</span>
        {dueN > 0 && (
          <Link to="/review" className="badge" style={{ textDecoration: 'none' }}>
            ⏰ {dueN} due for review
          </Link>
        )}
        {openMistakes > 0 && (
          <button className="badge" style={{ cursor: 'pointer', background: 'rgba(255,77,109,.08)', borderColor: 'var(--red)', color: 'var(--red)' }}
            onClick={() => setShowMistakes(s => !s)}>
            ✗ {openMistakes} mistakes
          </button>
        )}
      </div>
      <h1>DSA <span>Hub</span></h1>
      <div className="promise">Every module × four layers. Your mentor schedules the reviews — show up daily.</div>
    </div>

    <div className="container">
      <StreakStrip />

      {/* Daily plan */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">TODAY'S PLAN</div>
        <ul className="notes" style={{ fontSize: 14 }}>
          <li>
            {dueN > 0
              ? <><Link to="/review" style={{ color: 'var(--lvl)' }}>Review {dueN} due card{dueN > 1 ? 's' : ''}</Link> — spaced repetition first</>
              : 'Reviews: queue clear ✓'}
          </li>
          {next && (
            <li>Next new material:{' '}
              <Link to={`/lesson/${next.mod.id}/${next.L}`} style={{ color: 'var(--lvl)' }}>
                M{next.mod.num} {next.mod.title} — L{next.L}
              </Link>
            </li>
          )}
          {(() => {
            const weak = weakestModules(progress, 4, 1)[0];
            if (!weak) return null;
            return (
              <li style={{ color: 'var(--warn)' }}>
                Weakness drill:{' '}
                <Link to={`/lesson/${weak.mod?.id}/2`} style={{ color: 'var(--warn)' }}>
                  {weak.mod?.title}
                </Link>{' '}
                — accuracy {weak.pct}% ({weak.right}/{weak.total})
              </li>
            );
          })()}
          {openMistakes > 0 && (
            <li style={{ color: 'var(--warn)' }}>
              Clear {openMistakes} mistake{openMistakes > 1 ? 's' : ''} below ↓
            </li>
          )}
        </ul>
      </div>

      <WeaknessRadar progress={progress} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to="/review" className="level-pill">Review queue</Link>
        <button className="reveal-btn" onClick={() => setShowStats(s => !s)}>
          {showStats ? 'Hide stats' : 'Stats dashboard'}
        </button>
        <button className="reveal-btn" onClick={() => setShowMistakes(s => !s)}>
          {showMistakes ? 'Hide mistake log' : `Mistake log${openMistakes ? ` (${openMistakes})` : ''}`}
        </button>
      </div>

      {showStats && <Stats onClose={() => setShowStats(false)} />}
      {showMistakes && <MistakeLog />}

      <SearchBox />
      <ChangelogFeed />

      {MODULES.map(mod => {
        const prog = moduleProgress(mod.id);
        return (
          <div key={mod.id} className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">
              MODULE {mod.num} · {prog.done === 4 ? 'COMPLETE' : prog.done > 0 ? 'IN PROGRESS' : 'READY'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>{mod.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>{mod.subtitle}</div>
            <div className="level-strip" style={{ marginTop: 0 }}>
              {[1, 2, 3, 4].map(L => (
                <a key={L}
                  className={'level-pill' + (prog.perLevel[L] ? ' done' : '')}
                  href={`#/lesson/${mod.id}/${L}`}>
                  L{L} {LEVEL_META[L].name.split(' ')[0]}
                </a>
              ))}
            </div>
          </div>
        );
      })}

      <p style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'Space Mono', marginTop: 26 }}>
        PROGRESS STORED LOCALLY · BUILT WITH REACT + VITE
      </p>
    </div>
  </>);
}
