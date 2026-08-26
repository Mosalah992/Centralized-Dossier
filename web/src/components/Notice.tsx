// Loading and failure, kept in the archive's voice rather than a spinner and a
// stack trace.

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';

import { gsap, staged } from '../motion';

interface Props {
  kind: 'loading' | 'error';
  title: string;
  body?: string;
}

export function Notice({ kind, title, body }: Props) {
  const line = useRef<HTMLParagraphElement>(null);

  /*
   * The archivist is fetching the volume, not a spinner.
   *
   * Under reduced motion the title is simply left at the dim opacity its
   * stylesheet gives it — legible, and honest about the fact that something is
   * still happening, without anything moving to say so.
   */
  useGSAP(() => staged(({ moving }) => {
    if (kind !== 'loading' || !moving || !line.current) return;
    const pulse = gsap.to(line.current, {
      opacity: 1, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1,
    });
    return () => { pulse.kill(); };
  }), [kind]);

  return (
    <div
      className={`notice notice--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <p className="notice__title" ref={line}>{title}</p>
      {body && <p className="notice__body">{body}</p>}
    </div>
  );
}

export const Consulting = () => (
  <Notice kind="loading" title="The archivist is consulting the register…" />
);
