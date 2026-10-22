// A letter taken from the Cabinet and opened: the envelope rises from the
// drawer to the middle of the room, its flap lifts, the folded letter slides
// out, the envelope falls away, and the paper opens out of its three folds.
// Folding it away runs the same film backwards.
//
// The folds are drawings of the letter, three bands of one page each turned on
// its crease (aria-hidden copies). When the paper lies flat they give way to
// the letter itself, which is the one a reader or a screen reader reads, and
// which scrolls if the report is longer than the page. A reader who asks for
// less motion is handed the open letter at once.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';

import type { Report } from '../../../api';
import { gsap, staged } from '../../../motion';
import { parseReportRecord, type ReportSeverity } from '../../../../../shared/reports';
import { WING_INFO, wingOf } from '../../../../../shared/wings';
import { Emblem } from './Emblem';

export const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  informational: 'Informational',
  unassessed: 'Awaiting assessment',
};

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const filedOn = (timestamp: string) => DAY.format(new Date(timestamp));

/** The wax colours of a report's wing, as custom properties. */
export function waxOf(report: Report): CSSProperties {
  const wing = WING_INFO[wingOf(report.category)];
  return { ['--wax' as string]: wing.wax, ['--wax-ink' as string]: wing.ink };
}

/** The writing on the page: the same record the Reports page set out. */
function Writing({ report, titleId }: { report: Report; titleId?: string }) {
  const wing = WING_INFO[wingOf(report.category)];
  const blocks = parseReportRecord(report.body);
  return (
    <>
      <header className="letter__head">
        <p className="letter__wing">
          <span className="letter__wing-seal" aria-hidden="true">
            <Emblem name={wing.emblem} size={14} />
          </span>
          {wing.name}
          <span className="letter__category">
            {' · '}
            {report.category}
            {report.subcategory ? ` · ${report.subcategory}` : ''}
          </span>
        </p>
        <h2 id={titleId}>{report.title}</h2>
        <div className="letter__meta">
          <time dateTime={report.timestamp}>{filedOn(report.timestamp)}</time>
          <span className={`severity severity--${report.severity}`}>{SEVERITY_LABEL[report.severity]}</span>
        </div>
      </header>
      <div className="letter__body">
        {blocks.map((block, index) =>
          block.kind === 'field' ? (
            <dl className="letter__field" key={index}>
              <dt>{block.label}</dt>
              <dd>{block.value}</dd>
            </dl>
          ) : (
            <p key={index}>{block.text}</p>
          ),
        )}
      </div>
      {report.authorName && <p className="letter__author">Filed by {report.authorName}</p>}
    </>
  );
}

interface Props {
  report: Report;
  /** Where the envelope stood in the drawer, so it can rise from there. */
  origin: DOMRect | null;
  onFold: () => void;
}

export function Letter({ report, origin, onFold }: Props) {
  const scene = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLElement>(null);
  const film = useRef<gsap.core.Timeline | null>(null);
  const [height, setHeight] = useState(0);
  const [open, setOpen] = useState(false);
  const [folding, setFolding] = useState(false);
  const wing = WING_INFO[wingOf(report.category)];
  const titleId = `letter-${report.id}`;

  // The page's height, from an unseen copy of the writing at the page's width.
  useLayoutEffect(() => {
    const h = measure.current?.offsetHeight ?? 0;
    setHeight(Math.round(Math.min(h, window.innerHeight * 0.78)));
  }, [report.id]);

  useGSAP(() => staged(({ moving }) => {
    const root = scene.current;
    if (!root || !height) return;
    if (!moving) {
      setOpen(true);
      return;
    }
    const q = gsap.utils.selector(root);
    const [envelope] = q('.envelope-open');
    const [paper] = q('.letter-paper');
    if (!envelope || !paper) return;

    const film_ = gsap.timeline({ defaults: { ease: 'draw' }, onComplete: () => setOpen(true) });
    // Rise from the drawer.
    if (origin) {
      const to = envelope.getBoundingClientRect();
      film_.from(envelope, {
        x: origin.left + origin.width / 2 - (to.left + to.width / 2),
        y: origin.top + origin.height / 2 - (to.top + to.height / 2),
        scale: Math.max(0.15, origin.width / to.width),
        rotation: -4,
        duration: 0.6,
      });
    } else {
      film_.from(envelope, { y: 40, scale: 0.6, autoAlpha: 0, duration: 0.5 });
    }
    film_
      // The seal gives and the flap lifts.
      .to(q('.envelope-open__flap'), { rotationX: -178, duration: 0.5, ease: 'swing' })
      // The folded letter slides out.
      .to(paper, { y: -height * 0.42, duration: 0.55 })
      // The envelope falls away; the letter settles.
      .to(q('.envelope-open__back, .envelope-open__pocket, .envelope-open__flap'), { y: 90, autoAlpha: 0, duration: 0.4, ease: 'break' })
      .to(paper, { y: 0, duration: 0.45 }, '<0.1')
      // The paper opens out of its folds.
      .fromTo(q('.letter-fold--top'), { rotationX: -178 }, { rotationX: 0, duration: 0.55, ease: 'swing' })
      .fromTo(q('.letter-fold--bottom'), { rotationX: 178 }, { rotationX: 0, duration: 0.55, ease: 'swing' }, '<0.15');
    film.current = film_;
    return () => {
      film_.kill();
      film.current = null;
    };
  }), { dependencies: [height, report.id], scope: scene });

  // Once open, the letter has the reader's attention.
  useEffect(() => {
    if (open && !folding) page.current?.focus({ preventScroll: true });
  }, [open, folding]);

  const fold = () => {
    const run = film.current;
    if (!run || folding) return onFold();
    setFolding(true);
    setOpen(false);
    run.eventCallback('onReverseComplete', onFold);
    run.timeScale(1.6).reverse();
  };

  // Escape folds the letter before anything else in the Cabinet hears it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      fold();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const third = height / 3;
  const paperStyle = { height: `${height}px`, ...waxOf(report) } as CSSProperties;

  return (
    <div className="letter-scene" ref={scene} data-open={open || undefined}>
      <div className="letter-scene__veil" aria-hidden="true" onClick={fold} />

      {/* The writing at the page's width, unseen, to take the page's height. */}
      <div className="letter-measure" ref={measure} aria-hidden="true">
        <div className="letter">
          <Writing report={report} />
        </div>
      </div>

      {height > 0 && (
        <div className="envelope-open" style={{ ['--third' as string]: `${third}px`, ...waxOf(report) }} aria-hidden="true">
          <div className="envelope-open__back" />
          <div className="letter-paper" style={paperStyle}>
            {(['top', 'middle', 'bottom'] as const).map((band, i) => (
              <div key={band} className={`letter-fold letter-fold--${band}`} style={{ top: `${i * third}px`, height: `${third}px` }}>
                <div className="letter-fold__face">
                  <div className="letter" style={{ top: `${-i * third}px` }}>
                    <Writing report={report} />
                  </div>
                </div>
                {band !== 'middle' && <div className="letter-fold__back" />}
              </div>
            ))}
          </div>
          <div className="envelope-open__pocket" />
          <div className="envelope-open__flap">
            <span className="envelope-open__seal">
              <Emblem name={wing.emblem} size={20} />
            </span>
          </div>
        </div>
      )}

      {open && (
        <article className="letter letter--open" ref={page} tabIndex={-1} aria-labelledby={titleId} style={waxOf(report)}>
          <Writing report={report} titleId={titleId} />
          <button type="button" className="letter__fold" onClick={fold}>
            Fold it away
          </button>
        </article>
      )}
    </div>
  );
}
