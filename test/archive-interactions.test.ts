import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_NAVIGATION,
  filterArchiveNavigation,
  navigationItemIsActive,
} from '../web/src/archive-navigation';
import { ALL_SLUGS } from '../shared/volumes';

const read = (path: string) => readFileSync(path, 'utf8');

describe('archive navigation', () => {
  it('is generated from every published volume and High Command, with home left to the insignia', () => {
    const hrefs = ARCHIVE_NAVIGATION.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).not.toContain('/');
    expect(hrefs).toContain('/reports');
    for (const slug of ALL_SLUGS) expect(hrefs).toContain(`/archives/${slug}`);
  });

  it('filters labels and registry groups without searching record bodies', () => {
    expect(filterArchiveNavigation('finance').map((item) => item.href))
      .toEqual(['/archives/ledger', '/archives/stipends']);
    expect(filterArchiveNavigation('high command').map((item) => item.href))
      .toEqual(['/reports']);
  });

  it('marks only the current real route', () => {
    const reports = ARCHIVE_NAVIGATION.find((item) => item.href === '/reports')!;
    const roster = ARCHIVE_NAVIGATION.find((item) => item.href === '/archives/roster')!;
    expect(navigationItemIsActive({ name: 'reports' }, reports)).toBe(true);
    expect(navigationItemIsActive({ name: 'reports' }, roster)).toBe(false);
    expect(navigationItemIsActive({ name: 'volume', slug: 'roster' }, roster)).toBe(true);
  });
});

// Every Ancarion clip the gate plays, each shipped as WebM and MP4.
const PERFORMANCES = [
  'idle',
  'idle-appraise',
  'idle-smoke',
  'listening',
  'refusal',
  'sigh',
  'accept',
  'doze',
  'wake',
];

describe('interaction boundaries', () => {
  it('uses one PortraitGate for both sealed routes', () => {
    expect(read('web/src/views/Reports.tsx')).toContain('<PortraitGate');
    expect(read('web/src/views/Informants.tsx')).toContain('<PortraitGate');
    expect(read('web/src/views/Reports.tsx')).not.toContain('ArchiveSeal');
  });

  it('keeps the two gates server-backed and separately adapted', () => {
    const reports = read('web/src/views/Reports.tsx');
    const chronicle = read('web/src/views/Informants.tsx');
    expect(reports).toContain('openReports(passphrase, signal)');
    expect(chronicle).toContain('openChronicle(passphrase, signal)');
  });

  it('uses the existing motion system and keeps Three.js behind the Reports sky', () => {
    // Three.js is allowed for one thing only: the Nirn sky behind the Reports
    // gate, loaded through a dynamic import (Decision Log, 2026-10-06). Nothing
    // else may import it statically; the bundle test checks the entry chunk.
    const sky = read('web/src/components/NirnSky.tsx');
    expect(sky).toContain("import('../sky/nirnScene')");
    expect(sky).not.toMatch(/from 'three/);
    expect(read('web/src/views/Reports.tsx')).toMatch(/<PortraitGate[\s\S]*\bsky\b/);
    expect(read('web/src/views/Informants.tsx')).not.toMatch(/<PortraitGate[^>]*\bsky\b/);
    const gateCss = read('web/src/styles/portrait-gate.css');
    expect(gateCss).toContain('prefers-reduced-motion: reduce');
    expect(gateCss).toContain('@keyframes portrait-gate-attention-cue');
    expect(gateCss).toContain('.portrait-gate__form input, .portrait-gate__status { animation: none; }');
    const gate = read('web/src/components/PortraitGate.tsx');
    expect(gate).toContain('clips?: Partial<');
    expect(gate).toContain("ancarion-idle.mp4");
    expect(gate).toContain("ancarion-refusal.webm");
    expect(gate).toContain("ancarion-sigh.webm");
    expect(gate).toContain("import { D, gsap, staged } from '../motion'");
    expect(gate).toContain('export type PortraitState =');
    expect(gate).toContain('className="portrait-gate__media-stage"');
    expect(gate).toContain('preload="auto"');
    // The idle layer is started and paced by the component (rotation, and a
    // pause on the still while another clip covers it), not by autoPlay.
    expect(gate).not.toContain('autoPlay');
    expect(gate).toContain('const IDLE_REPLAY_PAUSE_MS = 2_000');
    expect(gate).toContain('onEnded={pauseBeforeIdleReplay}');
    expect(gate).toContain('onEnded={() => onComplete(state)}');
    expect(gate).toContain('void element.play().catch(() => setIdleUnavailable(true))');
    const idleVideo = gate.match(/<video\s+ref=\{idleVideo\}[\s\S]*?\/>/)?.[0] ?? '';
    expect(idleVideo).not.toContain('loop');
    expect(gate).toContain("setPortraitState('accepted')");
    expect(gate).toContain('onFocus={notice}');
    expect(gate).toContain('const passphrase = phrase;');
    expect(gate).not.toContain('const passphrase = phrase.trim();');
  });

  it('prepares the supplied portrait performances without transcoding them', () => {
    const preparation = read('scripts/prepare-portrait-video.mjs');
    expect(preparation).toContain("resolve(ROOT, 'Assets/portrait-clips')");
    for (const performance of PERFORMANCES) expect(preparation).toContain(`'${performance}'`);
    expect(preparation).toContain("const formats = ['webm', 'mp4'];");
    expect(preparation).toContain('await copyFile(');
    // Only the asleep keyframe is re-encoded; the clips are copied as they are.
    expect(preparation.match(/sharp\(/g)).toHaveLength(1);
    expect(preparation).toContain("'ancarion-asleep.png'");
  });

  it('offers every Ancarion performance as WebM with an MP4 fallback', () => {
    const gate = read('web/src/components/PortraitGate.tsx');
    for (const performance of PERFORMANCES) {
      expect(gate).toContain(`ancarion-${performance}.webm`);
      expect(gate).toContain(`ancarion-${performance}.mp4`);
    }
    expect(gate).not.toContain('ancarion-accept.webp');
    expect(gate).toContain('const ACCEPTED_PERFORMANCE_HOLD_MS = 3_700;');
  });

  it('lets Ancarion notice the reader, doze when left alone and speak only when sound is wanted', () => {
    const gate = read('web/src/components/PortraitGate.tsx');
    expect(gate).toContain("| 'dozing'");
    expect(gate).toContain("| 'asleep'");
    expect(gate).toContain("| 'waking'");
    expect(gate).toContain('const DOZE_AFTER_MS = 45_000;');
    expect(gate).toContain('const NIGHT_DOZE_AFTER_MS = 20_000;');
    expect(gate).toContain('return hour >= 23 || hour < 6;');
    expect(gate).toContain("import ancarionAsleep from '../assets/ancarion-asleep.webp'");
    // Motion-sensitive readers never see him doze.
    expect(gate).toContain('if (reducedMotion || !canDoze) return;');
    // The listening clip plays once, on the first notice, not per keystroke.
    expect(gate).toContain("if (portraitState !== 'idle') return;");
    expect(gate).toContain("return portraitState === 'listening' && attentive;");
    // The voice answers to the archive's one sound control.
    expect(gate).toContain("import { AMBIENCE_CHANGED_EVENT, ambienceWanted } from './Ambience'");
    expect(gate).toContain('if (!audio || !source || !ambienceWanted()) return;');
    expect(gate).toContain('window.addEventListener(AMBIENCE_CHANGED_EVENT, onPreferenceChange);');
  });

  it('moves a CSS-driven Dominion ink marker between Reports filters', () => {
    const reports = read('web/src/views/Reports.tsx');
    const reportsCss = read('web/src/styles/reports.css');
    expect(reports).toContain('function LiquidNav');
    expect(reports).toContain('ResizeObserver');
    expect(reports).toContain('aria-pressed={filters.category === name}');
    expect(reportsCss).toContain('.reports-liquid-nav::before');
    expect(reportsCss).toContain('@keyframes reports-liquid-settle');
    expect(reportsCss).toContain('border-radius: 2px');
    expect(reportsCss).toContain(".reports-liquid-nav[data-tone='critical']");
    expect(reportsCss).not.toContain('border-radius: 46% 54%');
  });

  it('color-codes report cards without making color the only severity label', () => {
    const reports = read('web/src/views/Reports.tsx');
    const reportsCss = read('web/src/styles/reports.css');
    expect(reports).toContain('report report--${report.severity}');
    expect(reports).toContain('severity severity--${report.severity}');
    for (const level of ['critical', 'high', 'medium', 'low', 'informational', 'unassessed']) {
      expect(reportsCss).toContain(`.report--${level}`);
      expect(reportsCss).toContain(`.severity--${level}`);
    }
  });

  it('slides the desktop rail open on hover or focus and keeps mobile dismissal controls', () => {
    const sidebar = read('web/src/components/ArchiveSidebar.tsx');
    const navigationCss = read('web/src/styles/archive-navigation.css');
    expect(sidebar).toContain('onMouseEnter');
    expect(sidebar).toContain('const expanded = hovered || focused');
    expect(navigationCss).toContain('--archive-nav-open');
    expect(sidebar).toContain("event.key === 'Escape'");
    expect(sidebar).toContain('archive-sidebar__backdrop');
    expect(sidebar).toContain("document.body.style.overflow = 'hidden'");
  });

  it('keeps the sidebar scrollable without exposing a native scrollbar track', () => {
    const navigationCss = read('web/src/styles/archive-navigation.css');
    expect(navigationCss).toContain('overflow: hidden auto');
    expect(navigationCss).toContain('scrollbar-width: none');
    expect(navigationCss).toContain('.archive-sidebar::-webkit-scrollbar');
  });
});
