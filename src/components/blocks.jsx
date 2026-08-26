/* Block renderers - React port of renderer/render.js block types */
import React, { useState, useMemo } from 'react';
import { logMistake } from '../lib/progress.js';

/* ---------- tiny md-lite: **bold**, `code`, line breaks ---------- */
function MD({ text }) {
  const html = useMemo(() => {
    let s = String(text ?? '');
    // escape
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }, [text]);
  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Prose({ b }) { return <p><MD text={b.md} /></p>; }
export function Heading({ b }) { return <h3><MD text={b.text} /></h3>; }
export function Mantra({ b }) { return <div className="mantra"><MD text={b.md} /></div>; }
export function Callout({ b }) { return <div className={`callout ${b.tone || ''}`}><MD text={b.md} /></div>; }
export function ListB({ b }) { return <ul className="notes">{b.items.map((x, i) => <li key={i}><MD text={x} /></li>)}</ul>; }

/* ---------- syntax highlight (regex-lite, same as static renderer) ---------- */
const KW = {
  cpp: 'int float double char bool void long short unsigned signed const static inline virtual friend struct class public private protected new delete return if else while for do switch case break continue true false nullptr this namespace using template typename operator sizeof explicit extern enum union try catch throw'.split(' '),
  py: 'def return if elif else for while in not and or None True False import from as class lambda pass break continue with yield try except finally global nonlocal assert del raise is print len range enumerate zip'.split(' ')
};
function highlight(code, lang) {
  const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const kwAlt = KW[lang] || KW.cpp;
  const re = new RegExp(
    '(&quot;(?:[^&]|&(?!quot;))*&quot;|&#39;[^&]*?&#39;|"[^"]*"|\'[^\']*\')' +
    '|\\b(' + kwAlt.join('|') + ')\\b' +
    '|\\b(\\d+(?:\\.\\d+)?)\\b', 'g');
  return esc.split('\n').map(line => {
    let cm = '';
    const ci = lang === 'py' ? line.indexOf('#') : (() => {
      const a = line.indexOf('//'); const b = line.indexOf('/*');
      return a === -1 ? b : (b === -1 ? a : Math.min(a, b));
    })();
    if (ci !== -1 && !line.slice(0, ci).includes('"')) {
      cm = `<span class="cm">${line.slice(ci)}</span>`; line = line.slice(0, ci);
    }
    const out = line.replace(re, (m, str, kw, num) =>
      str ? `<span class="st">${str}</span>`
        : kw ? `<span class="kw">${kw}</span>`
        : `<span class="num">${num}</span>`);
    return out + cm;
  }).join('\n');
}

export function CodeBlock({ b }) {
  const [open, setOpen] = useState(!b.reveal);
  const showPy = typeof b.py === 'string';
  return (
    <div>
      <div className="code-label">
        <span>{b.label || ''}</span>
        <LangSwitch hasPy={showPy} />
      </div>
      {!open && (
        <button className="reveal-btn" onClick={() => setOpen(true)}>Reveal solution</button>
      )}
      {open && (
        <>
          <pre data-lang="cpp"><code dangerouslySetInnerHTML={{ __html: highlight(b.code, 'cpp') }} /></pre>
          {showPy
            ? <pre data-lang="py"><code dangerouslySetInnerHTML={{ __html: highlight(b.py, 'py') }} /></pre>
            : <pre data-lang="py"><code># Python version pending port.</code></pre>}
        </>
      )}
    </div>
  );
}

export function LangSwitch() {
  const cur = document.documentElement.dataset.lang || 'cpp';
  const set = l => {
    document.documentElement.dataset.lang = l;
    try { localStorage.setItem('dsa_lang', l); } catch {}
    // force rerender via event
    window.dispatchEvent(new Event('dsa-lang'));
  };
  const [, force] = useState(0);
  React.useEffect(() => {
    const h = () => force(x => x + 1);
    window.addEventListener('dsa-lang', h);
    return () => window.removeEventListener('dsa-lang', h);
  }, []);
  const active = document.documentElement.dataset.lang || 'cpp';
  return (
    <span className="lang-switch">
      <button className={active === 'cpp' ? 'on' : ''} onClick={() => set('cpp')}>C++</button>
      <button className={active === 'py' ? 'on' : ''} onClick={() => set('py')}>Python</button>
    </span>
  );
}

/* ---------- trace / visual / compare ---------- */
export function Trace({ b }) {
  return (<>
    <h3 style={{ margin: '16px 0 8px' }}><MD text={b.title} /></h3>
    <table className="trace">
      <thead><tr>{b.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>{b.steps.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => <td key={j}><MD text={String(cell)} /></td>)}</tr>
      ))}</tbody>
    </table>
  </>);
}
export function Visual({ b }) {
  const s = b.spec || {};
  if (b.kind === 'boxes-array')
    return <div className="arr-vis">{(s.values||[]).map((v,i)=>(
      <div key={i} className={'arr-cell'+((s.highlight||[]).includes(i)?' hi':'')}>
        <div className="arr-val">{String(v)}</div>
        <div style={{fontSize:10,color:'var(--text-dim)'}}>{s.labels?s.labels[i]:'['+i+']'}</div>
      </div>))}</div>;
  if (b.kind === 'mem-map')
    return <div className="mem-map">{s.segments.map((g,i)=>(
      <div key={i} className="mem-seg"><div className="seg-name">{g.name}</div><div className="seg-desc">{g.desc}</div></div>))}</div>;
  if (b.kind === 'flow')
    return <div className="flow-steps">{s.steps.map((st,i)=><div key={i} className="flow-step"><MD text={st}/></div>)}</div>;
  return null;
}
export function Compare({ b }) {
  return <table className="trace"><thead><tr><th></th><th>{b.leftTitle}</th><th>{b.rightTitle}</th></tr></thead>
  <tbody>{b.rows.map((r,i)=><tr key={i}><td style={{color:'var(--text-dim)',fontFamily:'Space Mono',fontSize:11}}>{r.label}</td><td><MD text={r.left}/></td><td><MD text={r.right}/></td></tr>)}</tbody></table>;
}

/* ---------- quiz (scored, persisted) ---------- */
export function QuizBlock({ lessonId, sectionKey, b, store }) {
  return (b.items||[]).map((it, qi) => (
    <Mcq key={qi} lessonId={lessonId} qKey={`${sectionKey}-q${qi}`} item={it} store={store} />
  ));
}
function Mcq({ lessonId, qKey, item, store }) {
  const saved = store.mcq?.[qKey];
  const chosen = saved !== undefined ? saved : null;
  const pick = i => {
    if (chosen === null && i !== undefined) {
      store.actions.recordMcq(lessonId, qKey, i);
      if (i !== item.answer) logMistake(lessonId, item.q, 'ABCD'[item.answer]);
    }
  };
  return (
    <div className="quiz-card">
      <div className="quiz-q"><MD text={item.q} /></div>
      <div>
        {item.options.map((o, oi) => {
          const cls = chosen === null ? '' :
            oi === item.answer ? 'correct' : (oi === chosen ? 'wrong' : '');
          return (
            <div key={oi}
              className={'quiz-opt ' + cls + (chosen !== null ? ' locked' : '')}
              onClick={() => pick(oi)}>
              <span className="k">{'ABCD'[oi]}</span><span><MD text={o} /></span>
            </div>);
        })}
      </div>
      {chosen !== null && <>
        <div className={'quiz-explain'} style={{ display: 'block' }}><MD text={item.explain} /></div>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono', marginTop: 6, color: chosen === item.answer ? 'var(--green)' : 'var(--red)' }}>
          {chosen === item.answer ? 'CORRECT' : `INCORRECT - answer: ${'ABCD'[item.answer]}`}
        </div>
      </>}
    </div>
  );
}

/* ---------- problems ---------- */
export function Problems({ items, lessonId, store }) {
  return <ul className="prob-list">{items.map(p => <Problem key={p.id} p={p} lessonId={lessonId} store={store} />)}</ul>;
}
function Problem({ p, lessonId, store }) {
  const solved = !!store.solved?.[p.id];
  const [hintIdx, setHintIdx] = useState(-1);
  const [solOpen, setSolOpen] = useState(false);
  return (
    <li className="problem-item">
      <div className="prob-head">
        <span className={'diff t' + p.tier}>L{p.tier}</span>
        <div>
          <div className="prob-name"><MD text={p.title} /></div>
          <div className="prob-meta">
            {p.platform}{p.lc ? ' · LC ' + p.lc : ''}
            {p.patterns ? ' · ' + p.patterns.join(', ') : ''}
            {p.srcFile ? ` · CODES/${p.srcFile}` : ''}
          </div>
        </div>
        <label className="solved-check" style={{ marginLeft: 'auto' }}>
          <input type="checkbox" checked={solved}
            onChange={() => store.actions.toggleSolved(lessonId, p.id)} />
          <span>SOLVED</span>
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        {p.statement && <p style={{ fontSize: 14 }}><MD text={p.statement} /></p>}
        {(p.hints || []).map((h, i) => i <= hintIdx && (
          <div key={i} className="callout blue" style={{ fontSize: 13 }}>Hint {i+1}: <MD text={h} /></div>
        ))}
        {hintIdx < (p.hints?.length || 0) - 1 && (
          <button className="reveal-btn" onClick={() => setHintIdx(i => i + 1)}>
            Hint {hintIdx + 2}
          </button>
        )}
        {p.solutionCode && !solOpen && (
          <div style={{ marginTop: 8 }}>
            <button className="reveal-btn" onClick={() => setSolOpen(true)}>Reveal solution</button>
          </div>
        )}
        {p.solutionCode && solOpen && <CodeBlock b={p.solutionCode} />}
        {p.followups?.length > 0 && <Followup chain={p.followups} />}
      </div>
    </li>
  );
}
export function Followup({ chain }) {
  const [openIdx, setOpenIdx] = useState(new Set());
  const toggle = i => setOpenIdx(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  return (
    <div className="followup-chain">
      <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent2)', marginBottom: 4 }}>INTERVIEWER FOLLOW-UPS</div>
      {chain.map((f, i) => (
        <div key={i} style={{ margin: '8px 0' }}>
          <span className="followup-q" onClick={() => toggle(i)}>↳ {f.q}</span>
          {openIdx.has(i) && <div className="followup-a open"><MD text={f.a} /></div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- dispatcher ---------- */
export function Block({ b, ctx }) {
  switch (b.type) {
    case 'prose': return <Prose b={b} />;
    case 'heading': return <Heading b={b} />;
    case 'list': return <ListB b={b} />;
    case 'mantra': return <Mantra b={b} />;
    case 'callout': return <Callout b={b} />;
    case 'code': return <CodeBlock b={b} />;
    case 'trace': return <Trace b={b} />;
    case 'visual': return <Visual b={b} />;
    case 'compare': return <Compare b={b} />;
    case 'quiz': return <QuizBlock lessonId={ctx.lessonId} sectionKey={ctx.key} b={b} store={ctx.store} />;
    case 'problems': return <Problems items={b.items} lessonId={ctx.lessonId} store={ctx.store} />;
    case 'problem': return <Problems items={[b]} lessonId={ctx.lessonId} store={ctx.store} />;
    case 'followup': return <Followup chain={b.chain} />;
    default: return null;
  }
}
