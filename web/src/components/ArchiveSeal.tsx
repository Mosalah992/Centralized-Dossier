import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';

import { D, failsafe, gsap, staged, suspendOffScreen } from '../motion';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  crestSrc: string;
  children: ReactNode;
}

const GLYPHS = [...'ALDMERISDOMINIONARCHIVES'];

export function ArchiveSeal({ eyebrow, title, subtitle, crestSrc, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backFace = useRef<HTMLDivElement>(null);
  const awakeningTimer = useRef<number>();
  const panelId = useId();
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'awakening' | 'active' | 'opening' | 'opened'>('idle');

  const awaken = () => {
    if (phase === 'opening' || phase === 'opened') return;
    window.clearTimeout(awakeningTimer.current);
    setPhase('awakening');
    awakeningTimer.current = window.setTimeout(() => setPhase('active'), 320);
  };

  const sleep = () => {
    if (phase === 'opening' || phase === 'opened') return;
    window.clearTimeout(awakeningTimer.current);
    setPhase('idle');
  };

  useEffect(() => () => window.clearTimeout(awakeningTimer.current), []);

  useGSAP(() => staged(({ moving }) => {
    if (!moving || !root.current) return;
    const seal = root.current;
    const entrance = gsap.fromTo(seal,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: D.page, ease: 'draw', clearProps: 'opacity,transform' });
    const rescue = failsafe(entrance);
    return () => {
      rescue();
      entrance.kill();
      gsap.set(seal, { clearProps: 'opacity,transform' });
    };
  }), { scope: root });

  useGSAP(() => {
    if (phase === 'opening' || !root.current) return;
    const seal = root.current;
    return staged(({ moving }) => {
      if (!moving) return;
      const glyphs = gsap.utils.toArray<HTMLElement>('.archive-seal__glyph', seal);
      const travel = gsap.timeline({ repeat: -1, paused: true })
        .to(glyphs, {
          opacity: (index) => [0.58, 0.72, 0.64, 0.91, 0.68, 0.8][index % 6]!,
          duration: 1.9,
          ease: 'draw',
          stagger: { each: 0.28, from: 'start' },
        }, 0)
        .to(glyphs, {
          opacity: (index) => [0.36, 0.48, 0.41, 0.62][index % 4]!,
          duration: 2.6,
          ease: 'swing',
          stagger: { each: 0.28, from: 'start' },
        }, 0.85);
      const watch = suspendOffScreen(seal, travel);
      travel.play();
      return () => {
        watch();
        travel.kill();
        gsap.set(glyphs, { clearProps: 'opacity' });
      };
    });
  }, { dependencies: [phase === 'opening'], scope: root });

  useGSAP(() => {
    if (phase !== 'opening' || !root.current) return;
    const seal = root.current;
    return staged(({ moving }) => {
      if (!moving) {
        setFlipped(true);
        setPhase('opened');
        return;
      }
      const glyphs = gsap.utils.toArray<HTMLElement>('.archive-seal__glyph', seal);
      const timeline = gsap.timeline()
        .to(seal.querySelector('.archive-seal__halo'), {
          opacity: 0.86,
          scale: 1.045,
          duration: 0.35,
          ease: 'draw',
        }, 0)
        .to(glyphs, {
          opacity: 1,
          duration: 0.18,
          stagger: { each: 0.018, from: 'start' },
          ease: 'none',
        }, 0.1)
        .call(() => setFlipped(true), [], 0.45)
        .to(seal.querySelector('.archive-seal__halo'), {
          opacity: 0.42,
          scale: 1,
          duration: 0.5,
          ease: 'swing',
        }, 0.58)
        .call(() => setPhase('opened'), [], 1.15);
      return () => timeline.kill();
    });
  }, { dependencies: [phase], scope: root });

  useEffect(() => {
    if (backFace.current) backFace.current.inert = !flipped;
    if (!flipped) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const focusDelay = reduced ? 0 : 720;
    const timer = window.setTimeout(() => {
      backFace.current?.querySelector<HTMLElement>('input, button, a[href]')?.focus();
    }, focusDelay);
    return () => window.clearTimeout(timer);
  }, [flipped]);

  return (
    <div
      ref={root}
      className="archive-seal"
      data-phase={phase}
      data-flipped={flipped}
      onPointerEnter={awaken}
      onPointerLeave={sleep}
      onFocus={awaken}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          sleep();
        }
      }}
    >
      <span className="archive-seal__halo" aria-hidden />
      <span className="archive-seal__ring" aria-hidden>
        {GLYPHS.map((glyph, index) => (
          <span
            className="archive-seal__glyph"
            key={`${glyph}-${index}`}
            style={{
              '--glyph-index': index,
              '--glyph-count': GLYPHS.length,
            } as React.CSSProperties}
          >
            {glyph}
          </span>
        ))}
      </span>

      <div className="archive-seal__card">
        <div className="archive-seal__face archive-seal__front">
          <button
            ref={frontButton}
            className="archive-seal__front-button"
            type="button"
            aria-expanded={flipped}
            aria-controls={panelId}
            tabIndex={flipped ? -1 : 0}
            onClick={() => {
              if (phase !== 'opening') setPhase('opening');
            }}
          >
            <span className="archive-seal__eyebrow">{eyebrow}</span>
            <span className="archive-seal__title">{title}</span>
            <img src={crestSrc} alt="" width={116} height={116} />
            <span className="archive-seal__subtitle">{subtitle}</span>
            <span className="archive-seal__instruction">Turn the seal</span>
          </button>
        </div>

        <div
          ref={backFace}
          id={panelId}
          className="archive-seal__face archive-seal__back"
          aria-hidden={!flipped}
        >
          {children}
          <button
            className="archive-seal__return"
            type="button"
            onClick={() => {
              setFlipped(false);
              setPhase('idle');
              window.setTimeout(() => frontButton.current?.focus(), 0);
            }}
          >
            Turn seal faceward
          </button>
        </div>
      </div>
    </div>
  );
}
