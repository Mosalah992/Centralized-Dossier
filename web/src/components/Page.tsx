// The parchment frame every opened volume shares: heading, contents, and a
// foot that names the register it was read from.

import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  /** The source tab this was read from. */
  tab: string;
  fetchedAtUtc: string;
  children: ReactNode;
}

/** Time only: the archive shows freshness without printing an ISO timestamp. */
function consultedAt(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return 'just now';
  return `${when.toISOString().slice(11, 16)} UTC`;
}

export function Page({ title, subtitle, tab, fetchedAtUtc, children }: Props) {
  return (
    <article className="page">
      <header className="page__head">
        <p className="page__classification">Thalmor Embassy</p>
        <h1 className="page__title">{title}</h1>
        <p className="page__subtitle">{subtitle}</p>
      </header>

      {children}

      <footer className="page__foot">
        <p className="page__source">
          Transcribed from the <strong>{tab}</strong> register, consulted {consultedAt(fetchedAtUtc)}.
        </p>
      </footer>
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
