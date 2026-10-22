import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
// The gate keeps the field and the door; Ancarion's performance lives in
// useAncarion so the room's Cabinet can direct him too. Read as one.
const gateAndPerformer = () =>
  read('web/src/components/PortraitGate.tsx') +
  read('web/src/components/useAncarion.tsx') +
  read('web/src/components/ancarion-script.ts');

// Every Ancarion clip the gate plays, each shipped as WebM and MP4.
const PERFORMANCES = [
  'idle',
  'idle-breathe',
  'idle-drowse',
  'idle-appraise',
  'idle-smoke',
  'listening',
  'refusal',
  'shake',
  'sigh',
  'accept',
  'doze',
  'wake',
];

describe('interaction boundaries', () => {
  // The Reports register became the Cabinet on 2026-10-22: its word is asked in
  // the room, before Ancarion, and the PortraitGate keeps the Chronicles alone.
  it('keeps PortraitGate for the Chronicles, and the Cabinet asks in the room', () => {
    expect(read('web/src/views/Informants.tsx')).toContain('<PortraitGate');
    expect(read('web/src/room/Cabinet.tsx')).not.toContain('PortraitGate');
  });

  it('keeps the two gates server-backed and separately adapted', () => {
    expect(read('web/src/room/Cabinet.tsx')).toContain('openReports(passphrase, signal)');
    expect(read('web/src/views/Informants.tsx')).toContain('openChronicle(passphrase, signal)');
  });

  it('uses the existing motion system and keeps Three.js behind the Reports sky', () => {
    // Three.js is allowed for one thing only: the Nirn sky behind the Reports
    // gate, loaded through a dynamic import (Decision Log, 2026-10-06). Nothing
    // else may import it statically; the bundle test checks the entry chunk.
    const sky = read('web/src/components/NirnSky.tsx');
    expect(sky).toContain("import('../sky/nirnScene')");
    expect(sky).not.toMatch(/from 'three/);
    expect(read('web/src/views/Informants.tsx')).not.toMatch(/<PortraitGate[^>]*\bsky\b/);
    const gateCss = read('web/src/styles/portrait-gate.css');
    expect(gateCss).toContain('prefers-reduced-motion: reduce');
    expect(gateCss).toContain('@keyframes portrait-gate-attention-cue');
    expect(gateCss).toContain('.portrait-gate__form input, .portrait-gate__status { animation: none; }');
    const gate = gateAndPerformer();
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
    // The next idle moment is never the one just played.
    expect(gate).toContain('(index) => index !== idleClip && !failedIdleVariants.has(index),');
    expect(gate).toContain('onEnded={nextIdle}');
    // He breathes without a rest: no pause timer between idle clips.
    expect(gate).not.toContain('IDLE_REPLAY_PAUSE_MS');
    expect(gate).toContain('onEnded={() => onComplete(state)}');
    expect(gate).toContain('void element.play().catch((error) => cannotPlay(error) && setIdleUnavailable(true));');
    expect(gate).toContain("return error instanceof DOMException && error.name === 'NotSupportedError';");
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
    // Only the stills are re-encoded (the asleep keyframe and the Chronicles
    // map); the clips are copied as they are.
    expect(preparation.match(/sharp\(/g)).toHaveLength(2);
    expect(preparation).toContain("'ancarion-asleep.png'");
    expect(preparation).toContain("'Assets/chronicles-map.png'");
  });

  it('draws the Summerset map behind the Chronicles gate only', () => {
    expect(read('web/src/views/Informants.tsx')).toMatch(/<PortraitGate[\s\S]*backdrop=\{chroniclesMap\}/);
    const gateCss = read('web/src/styles/portrait-gate.css');
    expect(gateCss).toContain(".portrait-gate[data-backdrop='true']");
    expect(gateCss).toContain('.portrait-gate__backdrop::after');
  });

  it('offers every Ancarion performance as WebM with an MP4 fallback', () => {
    const gate = gateAndPerformer();
    for (const performance of PERFORMANCES) {
      expect(gate).toContain(`ancarion-${performance}.webm`);
      expect(gate).toContain(`ancarion-${performance}.mp4`);
    }
    expect(gate).not.toContain('ancarion-accept.webp');
    expect(gate).toContain('const ACCEPTED_PERFORMANCE_HOLD_MS = 3_700;');
  });

  it('lets Ancarion notice the reader, doze when left alone and speak only when sound is wanted', () => {
    const gate = gateAndPerformer();
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

  it('seals each letter by its wing, and never lets colour alone name a severity', () => {
    const letter = read('web/src/room/takeovers/cabinet/Letter.tsx');
    const css = read('web/src/styles/cabinet.css');
    expect(letter).toContain('severity severity--${report.severity}');
    expect(letter).toContain('{SEVERITY_LABEL[report.severity]}');
    for (const level of ['critical', 'high', 'medium', 'low', 'informational', 'unassessed']) {
      expect(css).toContain(`.severity--${level}`);
    }
    // The wax is the wing's colour, and the wing is named on the envelope too.
    expect(read('web/src/room/takeovers/Cabinet.tsx')).toContain('<span className="envelope__wing">{wing.name}</span>');
  });

  it('unfolds a letter on the motion system, and hands it over at once to readers who ask for less motion', () => {
    const letter = read('web/src/room/takeovers/cabinet/Letter.tsx');
    expect(letter).toContain("import { gsap, staged } from '../../../motion'");
    expect(letter).toContain('if (!moving) {');
    expect(letter).toContain("rotationX: -178");
    expect(letter).toContain('run.timeScale(1.6).reverse();');
  });

  // The navigation rail was retired on 2026-10-20: the room is the way in.
  it('has no navigation rail to drift from the room', () => {
    const app = read('web/src/App.tsx');
    expect(app).not.toContain('ArchiveSidebar');
    expect(app).toContain('Return to the Embassy');
  });
});
