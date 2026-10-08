// The archive's front door, read as one document from the top down: the
// Embassy's seal and name, the Dominion's statement of why the archive exists,
// the Embassy itself assembled, and then the way on into the records.
//
// The volumes stand in the navigation rail, each on its own painted cover, so
// the hall does not repeat them.

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { D, failsafe, gsap, revealOnEnter, staged, suspendOffScreen } from '../motion';
import { Register } from './Register';
import reportsSealUrl from '../assets/gate-seal.webp';
import portrait1280 from '../assets/hero/embassy-1280.webp';
import portrait1920 from '../assets/hero/embassy-1920.webp';
import filmUrl from '../assets/hero/film.mp4';
import gallery1 from '../assets/hero/gallery-1.webp';
import gallery2 from '../assets/hero/gallery-2.webp';
import gallery3 from '../assets/hero/gallery-3.webp';
import gallery4 from '../assets/hero/gallery-4.webp';
import gallery5 from '../assets/hero/gallery-5.webp';
import gallery6 from '../assets/hero/gallery-6.webp';
import gallery7 from '../assets/hero/gallery-7.webp';
import gallery8 from '../assets/hero/gallery-8.webp';

// In the order scripts/prepare-hero.mjs hangs them.
const GALLERY = [
  { src: gallery1, alt: 'Embassy soldiers ranked in the snow before a hold’s timbered halls, under a low winter sun.' },
  { src: gallery2, alt: 'The Embassy lined up shoulder to shoulder in the snow, blades and banners at rest.' },
  { src: gallery3, alt: 'A lone figure enthroned in a stone hall between two Dominion banners.' },
  { src: gallery4, alt: 'Officers gathered about a long war table in a timbered great hall.' },
  { src: gallery5, alt: 'A column of soldiers marching down a stone stair in warm afternoon light.' },
  { src: gallery6, alt: 'A cloaked Thalmor officer overseeing a formation in a cobbled courtyard.' },
  { src: gallery7, alt: 'Black-armoured agents standing in formation in a mossy courtyard.' },
  { src: gallery8, alt: 'Hooded agents filing up a snow-dusted stair.' },
];

// The Dominion's application form. External, so it opens beside the archive
// rather than in place of it.
const APPLICATION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScvhD-8VfQj3tmGSQ0qB7v7z9tfr7XDILvJwl7Ex2ccrF8Cuw/viewform?usp=publish-edito';

// In-page destinations, not routes: the router owns the path, so these scroll
// rather than set a hash.
const SECTIONS = [
  { id: 'hall-gallery', label: 'Gallery' },
  { id: 'hall-recruitment', label: 'Recruitment' },
  { id: 'hall-command', label: 'High Command' },
] as const;

function goTo(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

interface Props {
  onOpen: (href: string) => void;
}

export function Shelf({ onOpen }: Props) {
  const hall = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLSpanElement>(null);
  const portrait = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLUListElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // The drop-down is the phone layout's; widening the window shuts it.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 641px)');
    const shut = () => { if (wide.matches) setMenuOpen(false); };
    wide.addEventListener('change', shut);
    return () => wide.removeEventListener('change', shut);
  }, []);

  const jump = (id: string) => {
    setMenuOpen(false);
    goTo(id);
  };

  // The hall comes up out of the dark, seal first. Once, on mount.
  useGSAP(() => staged(({ moving }) => {
    const root = hall.current;
    if (!moving || !root) return;

    const parts = gsap.utils.toArray<HTMLElement>('[data-rise]', root);
    if (!parts.length) return;

    const rise = gsap.fromTo(parts,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: D.page, ease: 'draw', stagger: 0.12,
        clearProps: 'opacity,transform' });
    // A hero blanked and never un-blanked is a door nobody can find.
    const rescue = failsafe(rise);

    return () => {
      rescue();
      rise.kill();
      gsap.set(parts, { clearProps: 'opacity,transform' });
    };
  }), []);

  /*
   * The portrait is come upon, not loaded.
   *
   * Dimmed, a little low and a little small until the reader scrolls to it,
   * then drawn up into place slowly — a picture being uncovered, not a banner
   * arriving. Skipped if the page opens already scrolled onto it: blanking
   * something the reader is looking at only to bring it back is the one
   * entrance worse than none.
   */
  useGSAP(() => staged(({ moving }) => {
    const el = portrait.current;
    if (!moving || !el) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.88) return;

    return revealOnEnter(
      [el],
      (batch) => {
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1,
          duration: D.ceremony + 0.6, ease: 'draw',
          clearProps: 'opacity,transform',
        });
      },
      { opacity: 0.35, y: 36, scale: 0.98 },
    );
  }), []);

  // The rest of the Embassy, each picture uncovered the same way as the
  // portrait but quicker and lighter, since there are eight of them.
  useGSAP(() => staged(({ moving }) => {
    const list = gallery.current;
    if (!moving || !list) return;
    const items = gsap.utils.toArray<HTMLElement>('li', list)
      .filter((el) => el.getBoundingClientRect().top >= window.innerHeight * 0.88);

    return revealOnEnter(
      items,
      (batch) => {
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1,
          duration: D.ceremony, ease: 'draw', stagger: 0.15,
          clearProps: 'opacity,transform',
        });
      },
      { opacity: 0.35, y: 24, scale: 0.985 },
    );
  }), []);

  /*
   * The film plays only while it can be seen, and only for readers who have
   * not asked for less motion — they get the player's own controls instead.
   * Nothing is fetched until the reader is nearly there (`preload="none"`):
   * it is the heaviest thing on the page and most visits never reach it.
   */
  useGSAP(() => staged(({ moving }) => {
    const video = film.current;
    if (!video) return;
    if (!moving) {
      video.controls = true;
      return () => { video.controls = false; };
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) {
        video.preload = 'auto';
        // Autoplay of a muted video is allowed, but a browser may still
        // decline; the still frame is an acceptable thing to be left with.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { rootMargin: '200px 0px' });
    observer.observe(video);

    return () => { observer.disconnect(); video.pause(); };
  }), []);

  /*
   * Motes drifting through the torchlight, suspended once the hall is
   * scrolled out of view — which CSS keyframes cannot do, since
   * `animation-play-state` cannot be driven from intersection.
   */
  useGSAP(() => staged(({ moving }) => {
    const motes = dust.current;
    if (!moving || !motes) return;

    const drift = gsap.fromTo(motes,
      { y: 0 },
      { y: '-1.5rem', duration: 14, ease: 'none', repeat: -1 });
    const watch = suspendOffScreen(motes, drift);

    return () => { watch(); drift.kill(); };
  }), []);

  return (
    <div className="hall" ref={hall}>
      <nav
        className="hall-nav"
        aria-label="Hall sections"
      >
        <div className="hall-nav__bar">
          <button className="hall-nav__brand" type="button" onClick={() => jump('hall-archive')}>
            <span>Aldmeri Dominion</span>
          </button>
          <ul className="hall-nav__links">
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <button type="button" onClick={() => jump(id)}>{label}</button>
              </li>
            ))}
          </ul>
          <button
            className="hall-nav__toggle"
            type="button"
            aria-label="Toggle hall sections"
            aria-expanded={menuOpen}
            aria-controls="hall-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <ul className="hall-nav__menu" id="hall-nav-menu">
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <button type="button" onClick={() => jump(id)}>{label}</button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <span className="hall__dust" ref={dust} aria-hidden />

      <header className="hall__hero" id="hall-archive">
        {/* The Dominion insignia. Decorative — the heading beneath it already
            names the archive, so it is not announced a second time. */}
        <img
          className="hall__seal"
          src="/seal.webp"
          alt=""
          width={250}
          height={250}
          decoding="async"
          data-rise
        />
        {/* The torches flank the title itself, so they stay level with it
            however the title scales or the hero is laid out. */}
        <div className="hall__crest">
          <span className="hall__torch hall__torch--left" aria-hidden />
          <h1 className="hall__title" data-rise>
            Thalmor Embassy
            <br />
            Archives
          </h1>
          <span className="hall__torch hall__torch--right" aria-hidden />
        </div>
        <p className="hall__subtitle" data-rise>Official Administrative Registers</p>
        <p className="hall__motto" data-rise>By Order of the Third Aldmeri Dominion</p>

        <div className="hall__mission" data-rise>
          <p className="hall__mission-lead">
            The Dominion does not merely govern the present. It preserves the
            record by which the future shall understand it.
          </p>
          <p>
            These archives serve as the official repository of Thalmor activity
            throughout Tamriel, documenting our personnel, operations, hierarchy,
            judgments, honors, and the events that shape the Dominion’s continued
            mission.
          </p>
          <p className="hall__maxims">
            <span>Order is maintained through knowledge.</span>
            <span>Authority is preserved through record.</span>
            <span>History belongs to those disciplined enough to keep it.</span>
          </p>
        </div>
      </header>

      <figure className="hall__portrait" ref={portrait}>
        <img
          src={portrait1920}
          srcSet={`${portrait1280} 1280w, ${portrait1920} 1920w`}
          sizes="(max-width: 900px) 92vw, min(1440px, calc(100vw - 10rem))"
          alt="The Thalmor Embassy assembled in its black and gold, ranked in the snow before the timbered halls of a Skyrim hold."
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
        />
      </figure>

      <figure className="hall__film">
        <video
          ref={film}
          src={filmUrl}
          muted
          loop
          playsInline
          preload="none"
          aria-label="Film of the Thalmor Embassy at work in Skyrim."
        />
      </figure>

      <ul className="hall__gallery" id="hall-gallery" ref={gallery}>
        {GALLERY.map(({ src, alt }) => (
          <li key={src}>
            <img src={src} alt={alt} width={1200} height={675} loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>

      <section className="hall__recruit" id="hall-recruitment" aria-labelledby="hall-recruit-title">
        <div className="hall__divider" aria-hidden>
          <span />
        </div>
        <p className="hall__recruit-label">Recruitment</p>
        <h2 className="hall__recruit-title" id="hall-recruit-title">To Join the Thalmor</h2>
        <ul className="hall__recruit-terms">
          <li>We accept no AI-made applications.</li>
          <li>Joining the Thalmor demands a life oath, so prepare to give your life to the Dominion.</li>
          <li>We do not mind Bosmer or Khajiit applicants.</li>
          <li>Make sure you don’t write too much, but not too little — in between is good.</li>
        </ul>
        <p className="hall__recruit-blessing">May Auri-El bless you and Xarxes guide your word.</p>
        <a
          className="hall__recruit-oath"
          href={APPLICATION_URL}
          target="_blank"
          rel="noopener noreferrer external"
          aria-label="Submit Your Oath (opens the application form in a new tab)"
        >
          Submit Your Oath
        </a>
      </section>

      <div className="hall__divider" aria-hidden>
        <span />
      </div>

      {/* A guarded doorway, not another volume: High Command's seal is held
          below the hall so the public registers remain the primary action. */}
      <section className="hall__command" id="hall-command" aria-label="High Command reports">
        <p className="hall__command-label">For the Eyes of High Command</p>
        <button className="hall__command-seal" type="button" onClick={() => onOpen('/reports')}>
          <img src={reportsSealUrl} alt="" width={132} height={132} />
          <span>Reports</span>
        </button>
      </section>

      <Register />
    </div>
  );
}
