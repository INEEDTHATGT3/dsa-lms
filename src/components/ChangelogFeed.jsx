import React, { useEffect, useState } from 'react';

/* Changelog feed - loaded lazily from content dir on mount (tiny file) */
export default function ChangelogFeed() {
  const [log, setLog] = useState([]);
  useEffect(() => {
    let live = true;
    import('../content/changelog.json')
      .then(m => { if (live) setLog(m.default.changelog || []); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!log.length) return null;
  const tones = { module: 'green', system: 'blue', fix: 'red', note: 'warn' };
  return (<>
    <h3 style={{ letterSpacing: 2, color: 'var(--lvl)', fontFamily: 'Space Mono', fontSize: 12, margin: '18px 0 10px' }}>
      UPDATES &amp; ADDITIONS
    </h3>
    {log.slice(0, 4).map((e, i) => (
      <div key={i} className={'callout ' + (tones[e.type] || '')}>
        <strong>{e.date}</strong> · {e.title}
        {e.detail && <><br /><span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.detail}</span></>}
      </div>
    ))}
  </>);
}
