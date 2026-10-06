import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useGSAP } from '@gsap/react';

import { openReports, reportsIsOpen, useReports, type Report, type ReportsResponse } from '../api';
import { PortraitGate } from '../components/PortraitGate';
import { Consulting, Notice } from '../components/Notice';
import {
  REPORT_CATEGORY_NAMES,
  REPORT_SEVERITIES,
  parseReportRecord,
  type ReportSeverity,
} from '../../../shared/reports';
import { gsap, staged } from '../motion';
import '../styles/reports.css';

// From the filing's prose where it has any: an excerpt that opens on
// "Location: … Subject: …" repeats the record instead of saying what happened.
function excerpt(body: string): string {
  const prose = parseReportRecord(body).filter((block) => block.kind === 'prose');
  const source = prose.length ? prose.map((block) => block.text).join(' ') : body;
  const plain = source.replace(/\s+/g, ' ').trim();
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


const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  informational: 'Informational',
  unassessed: 'Awaiting assessment',
};

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthOf = (key: string) => MONTH.format(new Date(`${key}-01T00:00:00Z`));

/** The classification, struck as a seal: shape and colour per level, and always the word. */
function ReportStamp({ severity }: { severity: ReportSeverity }) {
  return (
    <span className={`severity severity--${severity} report-stamp`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/**
 * Filings under the month they were filed, newest first. The API already sorts
 * them; this only draws the dividers. A month that runs over a page boundary
 * repeats its heading on the next page, which is how a ledger continues.
 */
function byMonth(reports: readonly Report[]): [string, Report[]][] {
  const months = new Map<string, Report[]>();
  for (const report of reports) {
    const key = report.timestamp.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), report]);
  }
  return [...months];
}

function ReportPage({ report, onClose }: { report: Report; onClose: () => void }) {
  const page = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => { back.current?.focus(); }, [report.id]);

  // The leaf swings in on its hinge, as a page of the Chronicles does. A
  // reader who asked for less motion gets the page, not the swing.
  useGSAP(() => staged(({ moving }) => {
    const leaf = page.current;
    if (!moving || !leaf) return;
    const swing = gsap.effects.hinge(leaf, { from: -9, to: 0 });
    return () => { swing.kill(); gsap.set(leaf, { clearProps: 'transform' }); };
  }), [report.id]);

  const blocks = parseReportRecord(report.body);

  return (
    <article ref={page} className={`report-page report--${report.severity}`} aria-labelledby={`report-${report.id}`}>
      <button ref={back} type="button" className="report-page__back" onClick={onClose}>
        <span aria-hidden>‹</span> Return to the dossier
      </button>
      <header className="report-page__head">
        <p className="report-page__eyebrow">
          {report.category}{report.subcategory ? ` · ${report.subcategory}` : ''}
        </p>
        <h2 id={`report-${report.id}`}>{report.title}</h2>
        <div className="report-page__meta">
          <time dateTime={report.timestamp}>{DAY.format(new Date(report.timestamp))}</time>
          <ReportStamp severity={report.severity} />
        </div>
      </header>

      {/* In the order filed: a run of template fields becomes a record, prose
          stays prose, and nothing is moved out of its place. */}
      <div className="report-page__body">
        {blocks.map((block, index) => block.kind === 'field' ? (
          <dl className="report-page__field" key={index}>
            <dt>{block.label}</dt>
            <dd>{block.value}</dd>
          </dl>
        ) : (
          <p key={index}>{block.text}</p>
        ))}
      </div>

      {report.authorName && <p className="report-page__author">Filed by {report.authorName}</p>}
    </article>
  );
}

export function ReportsView() {
  const [open, setOpen] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const ledger = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<ReportSeverity | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reading, setReading] = useState<Report | null>(null);
  const returnTo = useRef(0);
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
    if (open && revealed && reports && !reading) heading.current?.focus({ preventScroll: true });
  }, [open, reports, revealed, reading]);

  // Each page of filings settles onto the ledger, entry after entry.
  useGSAP(() => staged(({ moving }) => {
    const root = ledger.current;
    if (!moving || !root || reading) return;
    const entries = gsap.utils.toArray<HTMLElement>('.report', root);
    if (!entries.length) return;
    const settle = gsap.effects.unroll(entries);
    return () => { settle.kill(); gsap.set(entries, { clearProps: 'opacity,transform' }); };
  }), [reports, reading]);

  const filter = (next: { category?: string | null; severity?: ReportSeverity | null }) => {
    if ('category' in next) setCategory(next.category ?? null);
    if ('severity' in next) setSeverity(next.severity ?? null);
    setCursor(null);
    setReading(null);
  };

  const openFiling = (report: Report) => {
    returnTo.current = window.scrollY;
    setReading(report);
    window.scrollTo({ top: 0 });
  };

  const closeFiling = () => {
    setReading(null);
    requestAnimationFrame(() => window.scrollTo({ top: returnTo.current }));
  };

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

  if (reading) {
    return (
      <section className="reports-dossier reports-dossier--page">
        <ReportPage report={reading} onClose={closeFiling} />
      </section>
    );
  }

  return (
    <section className="reports-dossier" aria-busy={state.state === 'loading'}>
      <header className="reports-dossier__head">
        <img className="reports-dossier__seal" src="/seal.webp" alt="" width={250} height={250} decoding="async" />
        <p className="reports-dossier__class">Sealed Register · For the Eyes of High Command</p>
        <h1 ref={heading} tabIndex={-1}>High Command Reports</h1>
        <p className="reports-dossier__motto">Filed by the Embassy’s desks, kept under the Dominion’s seal</p>
      </header>

      <details className="reports-dossier__standard">
        <summary>The Saelthar Classification Standard</summary>
        <p>Reports are classified according to the danger presented to Dominion personnel, assets, intelligence, supply, or continued operations. Classification denotes required attention, not the prestige of the reporting officer.</p>
        <p className="reports-dossier__severity-note"><strong>Filing format:</strong> classification is assigned from a standalone <code>Severity: High</code> field (or another listed level) anywhere in the official Military or Informants template. The value may follow on the next line. Blank, missing, or invalid fields remain awaiting assessment; the archive never guesses from report prose.</p>
        <dl>
          <div><dt><ReportStamp severity="critical" /></dt><dd>Immediate threat to Dominion personnel or operations.</dd></div>
          <div><dt><ReportStamp severity="high" /></dt><dd>Serious operational concern requiring urgent attention.</dd></div>
          <div><dt><ReportStamp severity="medium" /></dt><dd>Requires review or investigation.</dd></div>
          <div><dt><ReportStamp severity="low" /></dt><dd>Minor irregularity.</dd></div>
          <div><dt><ReportStamp severity="informational" /></dt><dd>Recorded without action required.</dd></div>
          <div><dt><ReportStamp severity="unassessed" /></dt><dd>No severity was assigned when filed.</dd></div>
        </dl>
      </details>

      <div className="reports-dossier__filters">
        <LiquidNav className="reports-dossier__categories" ariaLabel="Report categories" activeKey={category ?? 'all'}>
          <button aria-pressed={category === null} className={category === null ? 'is-active' : ''} onClick={() => filter({ category: null })}>All desks</button>
          {categories.map((name) => (
            <button key={name} aria-pressed={category === name} className={category === name ? 'is-active' : ''} onClick={() => filter({ category: name })}>{name}</button>
          ))}
        </LiquidNav>
        <LiquidNav className="reports-dossier__severities" ariaLabel="Report classification" activeKey={severity ?? 'all'} tone={severity ?? undefined}>
          <span>Classification</span>
          <button aria-pressed={severity === null} className={severity === null ? 'is-active' : ''} onClick={() => filter({ severity: null })}>All</button>
          {REPORT_SEVERITIES.slice(0, -1).reverse().map((level) => (
            <button key={level} aria-pressed={severity === level} className={`severity severity--${level}${severity === level ? ' is-active' : ''}`} onClick={() => filter({ severity: level })}>{level}</button>
          ))}
          <button aria-pressed={severity === 'unassessed'} className={`severity severity--unassessed${severity === 'unassessed' ? ' is-active' : ''}`} onClick={() => filter({ severity: 'unassessed' })}>Awaiting assessment</button>
        </LiquidNav>
      </div>

      <div className="reports-dossier__ledger" ref={ledger}>
        {reports.reports.length === 0 ? (
          <p className="reports-dossier__empty">
            {severity === 'unassessed' ? 'No filing awaits assessment.' : 'No reports have been filed in this register.'}
          </p>
        ) : byMonth(reports.reports).map(([month, filings]) => (
          <section className="reports-dossier__month" key={month} aria-label={monthOf(month)}>
            <h2 className="reports-dossier__month-head"><span>{monthOf(month)}</span></h2>
            {filings.map((report) => (
              <article className={`report report--${report.severity}`} key={report.id}>
                <button type="button" className="report__open" onClick={() => openFiling(report)}>
                  <span className="report__meta">
                    <span>{report.category}{report.subcategory ? ` · ${report.subcategory}` : ''}</span>
                    <time dateTime={report.timestamp}>{DAY.format(new Date(report.timestamp))}</time>
                  </span>
                  <span className="report__title">{report.title}</span>
                  <span className="report__excerpt">{excerpt(report.body)}</span>
                  <span className="report__foot">
                    <span className={`severity severity--${report.severity}`}>{SEVERITY_LABEL[report.severity]}</span>
                    <span className="report__action">Open the filing <span aria-hidden>›</span></span>
                  </span>
                </button>
              </article>
            ))}
          </section>
        ))}
      </div>

      <nav className="reports-dossier__pager" aria-label="Older and newer filings">
        {cursor && <button className="reports-dossier__more" onClick={() => setCursor(null)}>‹ Newest filings</button>}
        {reports.nextCursor && <button className="reports-dossier__more" onClick={() => setCursor(reports.nextCursor)}>Older filings ›</button>}
      </nav>
    </section>
  );
}
