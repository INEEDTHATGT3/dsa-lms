import React from 'react';
import { Link } from 'react-router-dom';
import { MODULES } from '../lib/content.js';

export default function NotFound() {
  return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h1 style={{ fontSize: 60, color: 'var(--lvl)' }}>404</h1>
      <p style={{ color: 'var(--text-dim)' }}>That lesson doesn't exist.</p>
      <Link to="/" className="level-pill" style={{ display: 'inline-block', marginTop: 12 }}>
        ← Back to Hub
      </Link>
      <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
        <div className="card-title">ALL MODULES</div>
        <ul style={{ listStyle: 'none' }}>
          {MODULES.map(m => (
            <li key={m.id} style={{ padding: '3px 0' }}>
              <a href={`#/lesson/${m.id}/1`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                M{m.num} · {m.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
