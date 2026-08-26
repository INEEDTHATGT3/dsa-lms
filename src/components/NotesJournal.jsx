import React, { useEffect, useRef, useState } from 'react';
import { useProgress, actionsExt } from '../lib/progress.js';

/* Per-lesson notes journal - autosaved debounced to localStorage store.
   Preview renders with the same md-lite styling used across lessons. */
export default function NotesJournal({ lessonId }) {
  const p = useProgress();
  const saved = (p.notes || {})[lessonId] || '';
  const [text, setText] = useState(saved);
  const [status, setStatus] = useState('');   // '' | 'saving' | 'saved'
  const [preview, setPreview] = useState(false);
  const timer = useRef(null);
  const firstRun = useRef(true);

  // adopt saved value when switching lessons
  useEffect(() => {
    setText((p.notes || {})[lessonId] || '');
    firstRun.current = true;
  }, [lessonId]);

  function onChange(e) {
    const v = e.target.value;
    setText(v);
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      actionsExt.saveNote(lessonId, v);
      setStatus('saved');
    }, 600);
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>MY NOTES</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Space Mono' }}>
            {status === 'saving' ? 'saving…' : status === 'saved' ? 'saved ✓' : `${text.length} chars`}
          </span>
          <button className="reveal-btn"
            onClick={() => setPreview(pr => !pr)}>
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {preview
        ? <div style={{
            background: 'var(--code-bg)', borderRadius: 6, padding: 12,
            minHeight: 80, whiteSpace: 'pre-wrap', fontSize: 14,
            color: 'var(--text)'
          }}>{text || <span style={{ color: 'var(--text-dim)' }}>empty</span>}</div>
        : <textarea
            value={text}
            onChange={onChange}
            placeholder="Personal notes, gotchas, mental models — supports **bold** and `code`."
            rows={7}
            style={{
              width: '100%', background: 'var(--code-bg)',
              border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text)', padding: 12, fontSize: 14,
              fontFamily: 'DM Mono', resize: 'vertical'
            }} />}
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        Autosaves to this device. Supports **bold**, `inline code`.
      </p>
    </div>
  );
}
