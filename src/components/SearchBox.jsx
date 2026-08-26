import { useState, useMemo, useEffect } from 'react';
import { SEARCH_INDEX } from '../lib/content.js';

/* Search across prebuilt small index; input deferred via useDeferredValue
   (rerender-use-deferred-value) so typing stays snappy. */
export default function SearchBox() {
  const [qRaw, setQ] = useState('');
  const [deferredQ, setDeferred] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDeferred(qRaw), 150);  // cheap debounce
    return () => clearTimeout(id);
  }, [qRaw]);

  const results = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    if (needle.length < 2) return null;
    return SEARCH_INDEX.filter(e =>
      e.title.toLowerCase().includes(needle) ||
      (e.tagline || '').toLowerCase().includes(needle) ||
      e.module.toLowerCase().includes(needle) ||
      e.problems.some(p => p.t.toLowerCase().includes(needle))
    );
  }, [deferredQ]);

  return (<>
    <input value={qRaw} onChange={e => setQ(e.target.value)}
      placeholder="Search lessons, problems, patterns..."
      style={{ width: '100%', padding: '12px 16px', marginBottom: 20,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, color: 'var(--text-bright)', fontSize: 15 }} />

    {results && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">{results.length} RESULT{results.length === 1 ? '' : 'S'}</div>
        {results.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No hits. Try a pattern name or problem title.</p>}
        {results.slice(0, 12).map(r => (
          <a key={r.id}
            href={`#/lesson/${r.id.replace('/L', '/')}`}
            style={{ display: 'block', padding: '6px 2px', textDecoration: 'none', color: 'var(--text)' }}>
            <strong style={{ color: 'var(--lvl)' }}>L{r.level}</strong>{' '}
            <span style={{ color: 'var(--text-bright)' }}>{r.title}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}> · M{r.num} {r.module}</span>
          </a>
        ))}
        {results.length > 12 &&
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>…refine query to narrow</p>}
      </div>
    )}
  </>);
}
