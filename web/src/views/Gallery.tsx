// The Gallery: the Embassy's name, and beneath it the Embassy itself — the
// assembled portrait, the film and the pictures. Nothing else: it was the
// archive's front door until the room took that (Decision Log, 2026-10-19),
// and its statement, recruitment notice, seal and section bar went with it
// (2026-10-20). The right-hand archway leads here; the Dominion's name at the
// top leads back.

import { useRef, type MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';

import { D, failsafe, gsap, revealOnEnter, staged } from '../motion';
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
import '../styles/gallery.css';

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

interface Props {
  onOpen: (href: string) => void;
}

export function GalleryView({ onOpen }: Props) {
  const hall = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLUListElement>(null);

  // The Dominion's name is the way home: a real link, followed by the router.
  const home = (event: MouseEvent<HTMLAnchorElement>) => {
    // A modified click is the reader asking for a new tab; let it through.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen('/');
  };

  // The name comes up out of the dark. Once, on mount.
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

  return (
    <div className="hall" ref={hall}>
      <nav className="hall-nav" aria-label="The Embassy">
        <div className="hall-nav__bar">
          <a className="hall-nav__brand" href="/" onClick={home} aria-label="Aldmeri Dominion: return to the Embassy">
            Aldmeri Dominion
          </a>
        </div>
      </nav>

      <header className="hall__hero">
        <h1 className="hall__title" data-rise>
          Thalmor Embassy
          <br />
          Archives
        </h1>
        <p className="hall__subtitle" data-rise>Gallery</p>
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

      <ul className="hall__gallery" aria-label="The Embassy in pictures" ref={gallery}>
        {GALLERY.map(({ src, alt }) => (
          <li key={src}>
            <img src={src} alt={alt} width={1200} height={675} loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>

    </div>
  );
}
