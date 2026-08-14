// The parchment frame every opened volume shares: heading, contents, and a
// foot that names the register it was read from.

import type { ReactNode } from 'react';

/**
 * Either the page was read from a register — in which case it must say which
 * one and when — or the Embassy keeps it itself, and may give its own
 * provenance or none. A union rather than three optional fields, so a
 * sheet-backed volume cannot quietly ship without its source line.
 */
type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
} & (
  | { tab: string; fetchedAtUtc: string; source?: never }
  | { tab?: never; fetchedAtUtc?: never; source?: ReactNode }
);

/** Time only: the archive shows freshness without printing an ISO timestamp. */
function consultedAt(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return 'just now';
  return `${when.toISOString().slice(11, 16)} UTC`;
}

export function Page({ title, subtitle, tab, fetchedAtUtc, source, children }: Props) {
  return (
    <article className="page">
      <header className="page__head">
        <p className="page__classification">Thalmor Embassy</p>
        <h1 className="page__title">{title}</h1>
        <p className="page__subtitle">{subtitle}</p>
      </header>

      {children}

      {/* Omitted entirely when there is nothing to attribute — an empty foot
          would still draw its rule across the bottom of the page. */}
      {(source || tab) && (
        <footer className="page__foot">
          {source ?? (
            <p className="page__source">
              Transcribed from the <strong>{tab}</strong> register, consulted{' '}
              {consultedAt(fetchedAtUtc as string)}.
            </p>
          )}
        </footer>
      )}
    </article>
  );
}

/** Septims and counts, grouped for reading. */
export const figure = (value: number) => value.toLocaleString('en-GB');

export function Registers({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="registers">
      {items.map((item) => (
        <div className="register" key={item.label}>
          <div className="register__label">{item.label}</div>
          <div className="register__value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export const Mark = ({ on }: { on: boolean }) => (
  <span className={`mark mark--${on ? 'yes' : 'no'}`} aria-label={on ? 'yes' : 'no'} />
);
