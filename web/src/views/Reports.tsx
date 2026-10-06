import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { openReports, reportsIsOpen, useReports, type ReportsResponse } from '../api';
import { PortraitGate } from '../components/PortraitGate';
import { Consulting, Notice } from '../components/Notice';
import {
  REPORT_CATEGORY_NAMES,
  REPORT_SEVERITIES,
  type ReportSeverity,
} from '../../../shared/reports';
import '../styles/reports.css';

function excerpt(body: string): string {
  const plain = body.replace(/\s+/g, ' ').trim();
  return plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}…` : plain;
}

interface LiquidNavProps {
  activeKey: string;
  ariaLabel: string;
  children: ReactNode;
  className: string;
  tone?: ReportSeverity;
}

function LiquidNav({ activeKey, ariaLabel, children, className, tone }: LiquidNavProps) {
  const nav = useRef<HTMLElement>(null);
  const previous = useRef(activeKey);

  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    let frame = 0;
    let settleTimer = 0;

    const placeMarker = (animate: boolean) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const active = element.querySelector<HTMLElement>('button[aria-pressed="true"]');
        if (!active) return;
        const navRect = element.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        element.style.setProperty('--liquid-x', `${activeRect.left - navRect.left + element.scrollLeft}px`);
        element.style.setProperty('--liquid-y', `${activeRect.top - navRect.top + element.scrollTop}px`);
        element.style.setProperty('--liquid-width', `${activeRect.width}px`);
        element.style.setProperty('--liquid-height', `${activeRect.height}px`);
        element.dataset.liquidReady = 'true';

        if (!animate) return;
        element.classList.remove('is-flowing');
        void element.offsetWidth;
        element.classList.add('is-flowing');
        settleTimer = window.setTimeout(() => element.classList.remove('is-flowing'), 560);
      });
    };

    const changed = previous.current !== activeKey;
    previous.current = activeKey;
    placeMarker(changed);

    const observer = new ResizeObserver(() => placeMarker(false));
    observer.observe(element);
    element.querySelectorAll('button').forEach((button) => observer.observe(button));

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      element.classList.remove('is-flowing');
    };
  }, [activeKey]);

  return (
    <nav
      ref={nav}
      className={`${className} reports-liquid-nav`}
      aria-label={ariaLabel}
      data-tone={tone}
    >
      {children}
    </nav>
  );
}

export function ReportsView() {
  const [open, setOpen] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<ReportSeverity | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const previousReports = useRef<ReportsResponse | null>(null);
  useEffect(() => {
    void reportsIsOpen().then((isOpen) => {
      setOpen(isOpen);
      setRevealed(isOpen);
    });
  }, []);
  const state = useReports(open === true, category, severity, cursor);
  const categories = useMemo(() => REPORT_CATEGORY_NAMES, []);
  if (state.state === 'ready') previousReports.current = state.value;
  const reports = state.state === 'ready' ? state.value : previousReports.current;
  useEffect(() => {
    if (open && revealed && reports) heading.current?.focus();
  }, [open, reports, revealed]);
  if (open === null) return <Consulting />;
  if (!open || !revealed) return (
    <PortraitGate
      collection="High Command Reports"
      eyebrow="Thalmor Central Archives"
      description="Reserved for the eyes of High Command. The register remains sealed until its own word is recognized."
      verify={(passphrase, signal) => openReports(passphrase, signal)}
      onAuthorized={() => setOpen(true)}
      onGranted={() => setRevealed(true)}
    />
  );
  if (state.state === 'error') {
    return <Notice kind="error" title="Reports unavailable" body={state.message} />;
  }
  if (!reports) return <Consulting />;

  return (
    <section className="reports-reader" aria-busy={state.state === 'loading'}>
      <header>
        <p className="reports-reader__class">Sealed — Reports Register</p>
        <h1 ref={heading} tabIndex={-1}>Reports</h1>
      </header>
      <details className="reports-reader__standard">
        <summary>Saelthar Classification Standard</summary>
        <p>Reports are classified according to the danger presented to Dominion personnel, assets, intelligence, supply, or continued operations. Classification denotes required attention, not the prestige of the reporting officer.</p>
        <p className="reports-reader__severity-note"><strong>Filing format:</strong> classification is assigned from a standalone <code>Severity: High</code> field (or another listed level) anywhere in the official Military or Informants template. The value may follow on the next line. Blank, missing, or invalid fields remain Unassessed; the archive never guesses from report prose.</p>
        <dl>
          <div><dt>Critical</dt><dd>Immediate threat to Dominion personnel or operations.</dd></div>
          <div><dt>High</dt><dd>Serious operational concern requiring urgent attention.</dd></div>
          <div><dt>Medium</dt><dd>Requires review or investigation.</dd></div>
          <div><dt>Low</dt><dd>Minor irregularity.</dd></div>
          <div><dt>Informational</dt><dd>Recorded without action required.</dd></div>
          <div><dt>Unassessed</dt><dd>No severity was assigned when filed.</dd></div>
        </dl>
      </details>
      <LiquidNav className="reports-reader__categories" ariaLabel="Report categories" activeKey={category ?? 'all'}>
        <button aria-pressed={category === null} className={category === null ? 'is-active' : ''} onClick={() => { setCategory(null); setCursor(null); }}>All</button>
        {categories.map((name) => (
          <button key={name} aria-pressed={category === name} className={category === name ? 'is-active' : ''} onClick={() => { setCategory(name); setCursor(null); }}>{name}</button>
        ))}
      </LiquidNav>
      <LiquidNav className="reports-reader__severities" ariaLabel="Report severity" activeKey={severity ?? 'all'} tone={severity ?? undefined}>
        <span>Severity:</span>
        <button aria-pressed={severity === null} className={severity === null ? 'is-active' : ''} onClick={() => { setSeverity(null); setCursor(null); }}>All</button>
        {REPORT_SEVERITIES.slice(0, -1).reverse().map((level) => (
          <button key={level} aria-pressed={severity === level} className={`severity severity--${level}${severity === level ? ' is-active' : ''}`} onClick={() => { setSeverity(level); setCursor(null); }}>{level}</button>
        ))}
        <button aria-pressed={severity === 'unassessed'} className={`severity severity--unassessed${severity === 'unassessed' ? ' is-active' : ''}`} onClick={() => { setSeverity('unassessed'); setCursor(null); }}>Unassessed</button>
      </LiquidNav>

      {reports.reports.length === 0 ? (
        <p className="reports-reader__empty">No reports have been filed in this register.</p>
      ) : reports.reports.map((report) => (
        <article className={`report report--${report.severity}`} key={report.id}>
          <details>
            <summary>
              <span className="report__meta">
                {report.category}{report.subcategory ? ` · ${report.subcategory}` : ''}
                <time dateTime={report.timestamp}>{report.timestamp.slice(0, 10)}</time>
              </span>
              <span className={`severity severity--${report.severity}`}>{report.severity}</span>
              <span className="report__title">{report.title}</span>
              <span className="report__excerpt">{excerpt(report.body)}</span>
              <span className="report__action">
                <span className="report__action-open">Open complete report</span>
                <span className="report__action-close">Close report</span>
                <span aria-hidden>⌄</span>
              </span>
            </summary>
            <div className="report__body">
              <p>{report.body}</p>
              {report.authorName && <p className="report__author">Filed by {report.authorName}</p>}
            </div>
          </details>
        </article>
      ))}
      {reports.nextCursor && <button className="reports-reader__more" onClick={() => setCursor(reports.nextCursor)}>Older reports</button>}
      {cursor && <button className="reports-reader__more" onClick={() => setCursor(null)}>Newest reports</button>}
    </section>
  );
}
