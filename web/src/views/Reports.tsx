import { useEffect, useMemo, useState } from 'react';

import { openReports, reportsIsOpen, useReports } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { REPORT_CATEGORY_NAMES } from '../../../shared/reports';
import sealUrl from '../assets/gate-seal.webp';

function Seal({ onOpen }: { onOpen: () => void }) {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return <section className="reports-stage">
    <form className="reports-lock" onSubmit={(event) => {
    event.preventDefault();
    if (!word || pending) return;
    setPending(true); setError(null);
    openReports(word).then((refusal) => {
      if (refusal) { setError(refusal); setWord(''); } else onOpen();
    }).catch(() => setError('Reports cannot be reached.')).finally(() => setPending(false));
  }}>
    <p className="reports-lock__class">Sealed — Embassy Register</p>
    <h1>Reports</h1>
    <p>Reserved for the Eyes of the High Command</p>
    <label htmlFor="reports-word">The word</label>
    <input id="reports-word" type="password" value={word} autoComplete="off" spellCheck={false} onChange={(event) => setWord(event.target.value)} disabled={pending} />
    <p className="reports-lock__error" role="alert">{error ?? ' '}</p>
      <button className="reports-lock__seal" type="submit" disabled={!word || pending}>
        <img src={sealUrl} alt="" width={192} height={192} />
        <span>{pending ? 'Testing the seal' : 'Break the seal'}</span>
      </button>
    </form>
  </section>;
}

export function ReportsView() {
  const [open, setOpen] = useState<boolean | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  useEffect(() => { void reportsIsOpen().then(setOpen); }, []);
  const state = useReports(open === true, category, cursor);
  const categories = useMemo(() => REPORT_CATEGORY_NAMES, []);
  if (open === null) return <Consulting />;
  if (!open) return <Seal onOpen={() => setOpen(true)} />;
  if (state.state === 'loading') return <Consulting />;
  if (state.state === 'error') return <Notice kind="error" title="Reports unavailable" body={state.message} />;
  return <section className="reports-reader">
    <header><p className="reports-reader__class">Sealed — Reports Register</p><h1>Reports</h1></header>
    <nav className="reports-reader__categories" aria-label="Report categories">
      <button className={category === null ? 'is-active' : ''} onClick={() => { setCategory(null); setCursor(null); }}>All</button>
      {categories.map((name) => <button key={name} className={category === name ? 'is-active' : ''} onClick={() => { setCategory(name); setCursor(null); }}>{name}</button>)}
    </nav>
    {state.value.reports.length === 0 ? <p className="reports-reader__empty">No reports have been filed in this register.</p> : state.value.reports.map((report) => <article className="report" key={report.id}>
      <p className="report__meta">{report.category}{report.subcategory ? ` · ${report.subcategory}` : ''}<time dateTime={report.timestamp}>{report.timestamp.slice(0, 10)}</time></p>
      <h2>{report.title}</h2><p>{report.body}</p>
      {report.authorName && <p className="report__author">Filed by {report.authorName}</p>}
    </article>)}
    {state.value.nextCursor && <button className="reports-reader__more" onClick={() => setCursor(state.value.nextCursor)}>Older reports</button>}
    {cursor && <button className="reports-reader__more" onClick={() => setCursor(null)}>Newest reports</button>}
  </section>;
}
