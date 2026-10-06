import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useGSAP } from '@gsap/react';

import {
  NO_REPORT_FILTERS,
  openReports,
  reportsFilterQuery,
  reportsIsOpen,
  useReport,
  useReports,
  useReportsSummary,
  type Report,
  type ReportsFilters,
  type ReportsResponse,
  type ReportsSummary,
} from '../api';
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

/** Filters read from the page URL, keeping only values the register knows. */
function filtersFromUrl(search: string): ReportsFilters {
  const params = new URLSearchParams(search);
  const severity = params.get('severity');
  const date = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  return {
    category: (REPORT_CATEGORY_NAMES as readonly string[]).includes(params.get('category') ?? '') ? params.get('category') : null,
    subcategory: params.get('subcategory') || null,
    severity: (REPORT_SEVERITIES as readonly string[]).includes(severity ?? '') ? severity as ReportSeverity : null,
    q: params.get('q')?.trim().slice(0, 80) || null,
    from: date(params.get('from')),
    to: date(params.get('to')),
  };
}

const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0);

/** One quiet line at the head of the dossier: what is filed, and what presses. */
function SummaryLine({ summary }: { summary: ReportsSummary }) {
  const filed = sum(summary.total);
  const awaiting = sum(summary.total.filter((row) => row.severity === 'unassessed'));
  const pressing = (['critical', 'high'] as const)
    .map((level) => [level, sum(summary.week.filter((row) => row.severity === level))] as const)
    .filter(([, count]) => count > 0);
  return (
    <p className="reports-dossier__summary">
      <span>{filed} {filed === 1 ? 'filing' : 'filings'} on record</span>
      {pressing.length > 0 && (
        <span>This week: {pressing.map(([level, count]) => `${count} ${SEVERITY_LABEL[level]}`).join(' · ')}</span>
      )}
      {awaiting > 0 && <span>{awaiting} awaiting assessment</span>}
    </p>
  );
}

export function ReportsView({ filingId, onNavigate }: { filingId: string | null; onNavigate: (href: string) => void }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const ledger = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<ReportsFilters>(() => filtersFromUrl(window.location.search));
  const [draft, setDraft] = useState(() => filters.q ?? '');
  const [cursor, setCursor] = useState<string | null>(null);
  const returnTo = useRef(0);
  const previousReports = useRef<ReportsResponse | null>(null);
  useEffect(() => {
    void reportsIsOpen().then((isOpen) => {
      setOpen(isOpen);
      setRevealed(isOpen);
    });
  }, []);
  const unlocked = open === true;
  const state = useReports(unlocked, filters, cursor);
  const filing = useReport(unlocked, filingId);
  const summary = useReportsSummary(unlocked);
  const categories = useMemo(() => REPORT_CATEGORY_NAMES, []);
  if (state.state === 'ready') previousReports.current = state.value;
  const reports = state.state === 'ready' ? state.value : previousReports.current;
  const desks = summary.state === 'ready' ? summary.value.desks : [];
  const subcategories = desks
    .filter((desk) => desk.subcategory && (!filters.category || desk.category === filters.category))
    .map((desk) => desk.subcategory as string)
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort();
  const lagging = desks.filter((desk) => desk.unassessed > 0);

  // The filters live in the address, so a view can be reloaded or handed to
  // another officer. Replaced rather than pushed: refining a search is not a
  // page the reader expects Back to step through.
  useEffect(() => {
    if (filingId) return;
    const query = reportsFilterQuery(filters).toString();
    const next = `/reports${query ? `?${query}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(null, '', next);
  }, [filters, filingId]);

  useEffect(() => {
    if (open && revealed && reports && !filingId) heading.current?.focus({ preventScroll: true });
  }, [open, reports, revealed, filingId]);

  // Each page of filings settles onto the ledger, entry after entry.
  useGSAP(() => staged(({ moving }) => {
    const root = ledger.current;
    if (!moving || !root || filingId) return;
    const entries = gsap.utils.toArray<HTMLElement>('.report', root);
    if (!entries.length) return;
    const settle = gsap.effects.unroll(entries);
    return () => { settle.kill(); gsap.set(entries, { clearProps: 'opacity,transform' }); };
  }), [reports, filingId]);

  const filter = (next: Partial<ReportsFilters>) => {
    setFilters((current) => {
      const merged = { ...current, ...next };
      // A desk belongs to its category; changing the category clears it.
      if ('category' in next && next.category !== current.category && !('subcategory' in next)) merged.subcategory = null;
      return merged;
    });
    setCursor(null);
  };

  const openFiling = (report: Report) => {
    returnTo.current = window.scrollY;
    onNavigate(`/reports/${report.id}`);
  };

  const closeFiling = () => {
    const query = reportsFilterQuery(filters).toString();
    onNavigate(`/reports${query ? `?${query}` : ''}`);
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

  if (filingId) {
    if (filing.state === 'loading') return <Consulting />;
    if (filing.state === 'error') {
      return (
        <section className="reports-dossier reports-dossier--page">
          <Notice kind="error" title="No such filing" body="This register holds no filing at that address." />
          <button type="button" className="reports-dossier__more" onClick={closeFiling}>‹ Return to the dossier</button>
        </section>
      );
    }
    return (
      <section className="reports-dossier reports-dossier--page">
        <ReportPage report={filing.value.report} onClose={closeFiling} />
      </section>
    );
  }

  if (state.state === 'error') {
    return <Notice kind="error" title="Reports unavailable" body={state.message} />;
  }
  if (!reports) return <Consulting />;

  const filtered = Object.values(filters).some(Boolean);

  return (
    <section className="reports-dossier" aria-busy={state.state === 'loading'}>
      <header className="reports-dossier__head">
        <img className="reports-dossier__seal" src="/seal.webp" alt="" width={250} height={250} decoding="async" />
        <p className="reports-dossier__class">Sealed Register · For the Eyes of High Command</p>
        <h1 ref={heading} tabIndex={-1}>High Command Reports</h1>
        <p className="reports-dossier__motto">Filed by the Embassy’s desks, kept under the Dominion’s seal</p>
        {summary.state === 'ready' && <SummaryLine summary={summary.value} />}
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
        {lagging.length > 0 && (
          <div className="reports-dossier__lagging">
            <p className="reports-dossier__lagging-head">Desks filing without classification · last thirty days</p>
            <ul>
              {lagging.map((desk) => (
                <li key={`${desk.category}-${desk.subcategory ?? ''}`}>
                  <button
                    type="button"
                    onClick={() => filter({ category: desk.category, subcategory: desk.subcategory, severity: 'unassessed' })}
                  >
                    {desk.category}{desk.subcategory ? ` · ${desk.subcategory}` : ''}
                    <span>{desk.unassessed} of {desk.filed} awaiting assessment</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <form
        className="reports-dossier__search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          filter({ q: draft.trim().slice(0, 80) || null });
        }}
      >
        <label className="reports-dossier__search-text">
          <span className="sr-only">Search the filings</span>
          <input
            type="search"
            value={draft}
            maxLength={80}
            placeholder="Search the filings…"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <label>
          <span>Desk</span>
          <select value={filters.subcategory ?? ''} onChange={(event) => filter({ subcategory: event.target.value || null })}>
            <option value="">Every desk</option>
            {subcategories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>From</span>
          <input type="date" value={filters.from ?? ''} max={filters.to ?? undefined} onChange={(event) => filter({ from: event.target.value || null })} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={filters.to ?? ''} min={filters.from ?? undefined} onChange={(event) => filter({ to: event.target.value || null })} />
        </label>
        <button type="submit" className="reports-dossier__more">Search</button>
        {filtered && (
          <button
            type="button"
            className="reports-dossier__clear"
            onClick={() => { setDraft(''); setFilters(NO_REPORT_FILTERS); setCursor(null); }}
          >
            Clear all
          </button>
        )}
      </form>

      <div className="reports-dossier__filters">
        <LiquidNav className="reports-dossier__categories" ariaLabel="Report categories" activeKey={filters.category ?? 'all'}>
          <button aria-pressed={filters.category === null} className={filters.category === null ? 'is-active' : ''} onClick={() => filter({ category: null })}>All desks</button>
          {categories.map((name) => (
            <button key={name} aria-pressed={filters.category === name} className={filters.category === name ? 'is-active' : ''} onClick={() => filter({ category: name })}>{name}</button>
          ))}
        </LiquidNav>
        <LiquidNav className="reports-dossier__severities" ariaLabel="Report classification" activeKey={filters.severity ?? 'all'} tone={filters.severity ?? undefined}>
          <span>Classification</span>
          <button aria-pressed={filters.severity === null} className={filters.severity === null ? 'is-active' : ''} onClick={() => filter({ severity: null })}>All</button>
          {REPORT_SEVERITIES.slice(0, -1).reverse().map((level) => (
            <button key={level} aria-pressed={filters.severity === level} className={`severity severity--${level}${filters.severity === level ? ' is-active' : ''}`} onClick={() => filter({ severity: level })}>{level}</button>
          ))}
          <button aria-pressed={filters.severity === 'unassessed'} className={`severity severity--unassessed${filters.severity === 'unassessed' ? ' is-active' : ''}`} onClick={() => filter({ severity: 'unassessed' })}>Awaiting assessment</button>
        </LiquidNav>
      </div>

      <div className="reports-dossier__ledger" ref={ledger}>
        {reports.reports.length === 0 ? (
          <p className="reports-dossier__empty">
            {filters.q
              ? `No filing mentions “${filters.q}”.`
              : filters.severity === 'unassessed' ? 'No filing awaits assessment.' : 'No reports have been filed in this register.'}
          </p>
        ) : byMonth(reports.reports).map(([month, filings]) => (
          <section className="reports-dossier__month" key={month} aria-label={monthOf(month)}>
            <h2 className="reports-dossier__month-head"><span>{monthOf(month)}</span></h2>
            {filings.map((report) => (
              <article className={`report report--${report.severity}`} key={report.id}>
                <a
                  className="report__open"
                  href={`/reports/${report.id}`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    openFiling(report);
                  }}
                >
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
                </a>
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
