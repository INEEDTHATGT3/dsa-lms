import React, { useMemo, useState } from 'react';
import { MODULES, LEVEL_META, moduleProgress } from '../lib/content.js';
import { useProgress } from '../lib/progress.js';
import SearchBox from '../components/SearchBox.jsx';
import ChangelogFeed from '../components/ChangelogFeed.jsx';
import Stats from './Stats.jsx';

function countDone(p) {
  return Object.values(p.lessons).filter(l => l.complete).length;
}

export default function Hub() {
  document.body.dataset.level = '1';
  document.body.dataset.lang = document.documentElement.dataset.lang || 'cpp';
  const progress = useProgress();
  const [q, setQ] = useState('');
  const [showStats, setShowStats] = useState(false);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return null;
    // lazy import of index only when searching
    return null; // replaced by SearchBox internal handling
  }, [q]);

  const totalDone = countDone(progress);

  return (<>
    <div className="hero">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="badge">LAYERED STUDY SYSTEM</span>
        <span className="badge green">{totalDone} / 76 artifacts complete</span>
        <span style={{ marginLeft: 'auto' }}>
          <button className="reveal-btn" onClick={() => setShowStats(s => !s)}>
            {showStats ? 'Hide stats' : 'Show stats'}
          </button>
        </span>
      </div>
      <h1>DSA <span>Hub</span></h1>
      <div className="promise">Every module × four layers. Progress saved locally on this device.</div>
    </div>

    <div className="container">
      {showStats && <Stats onClose={() => setShowStats(false)} />}

      <SearchBox />

      <ChangelogFeed />

      {MODULES.map(mod => {
        const prog = moduleProgress(mod.id);
        if (!prog) return null;
        return (
          <div key={mod.id} className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">
              MODULE {mod.num} · {prog.done === 4 ? 'COMPLETE' : prog.done > 0 ? 'IN PROGRESS' : 'READY'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
              {mod.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>{mod.subtitle}</div>
            <div className="level-strip" style={{ marginTop: 0 }}>
              {[1, 2, 3, 4].map(L => (
                <a key={L} className={'level-pill' + (prog.perLevel[L] ? ' done' : '')}
                  href={`#/lesson/${mod.id}/${L}`}>
                  L{L} {LEVEL_META[L].name.split(' ')[0]}
                </a>
              ))}
            </div>
          </div>
        );
      })}

      <p style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'Space Mono', marginTop: 28 }}>
        CONTENT © YOUR AUTHORING WORKSPACE · BUILT WITH REACT + VITE
      </p>
    </div>
  </>);
}
