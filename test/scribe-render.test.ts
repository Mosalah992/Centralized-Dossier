// The parchment, as the reader's browser draws it (web/src/scribe/). Node has
// no layout, so the fit is checked here on its estimate and the sheet on its
// markup; the browser's own measuring is checked in the browser.

import fs from 'node:fs';
import path from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FILING_LIMITS, IMPORTANCE_LEVELS, type ParchmentRequest } from '../shared/filing';
import { ParchmentSheet } from '../web/src/scribe/Parchment';
import { FITS, PAGE_HEIGHTS, WIDTH, deckle, estimateFit, nextFit, seedOf } from '../web/src/scribe/sheet';
import { SAMPLES } from './scribe-samples';

const sample = (index: number) => SAMPLES[index]!.request;
const withFiling = (request: ParchmentRequest, change: Partial<ParchmentRequest['filing']>): ParchmentRequest => ({
  ...request,
  filing: { ...request.filing, ...change },
});
const sheet = (request: ParchmentRequest, index = estimateFit(request)) =>
  renderToStaticMarkup(createElement(ParchmentSheet, { request, fit: FITS[index]! }));

/** Ordinary prose, as long as a filing may run. */
function longest(): string {
  const words = 'the patrol held the bridge at dawn while scouts from the Markarth detachment searched the ruins below for any sign of the cult'.split(' ');
  let text = '';
  for (let i = 0; text.length < FILING_LIMITS.body; i++) text += words[i % words.length] + ((i + 1) % 60 === 0 ? '\n\n' : ' ');
  return text.slice(0, FILING_LIMITS.body).trim();
}

describe('fitting the body', () => {
  it('gives a short filing a short page in a large hand', () => {
    expect(FITS[estimateFit(sample(1))]).toEqual({ height: 1200, size: 36 });
  });

  it('writes a longer body on a longer page before it writes smaller', () => {
    expect(FITS[estimateFit(sample(2))]!.height).toBeGreaterThan(FITS[estimateFit(sample(0))]!.height);
    for (let i = 1; i < FITS.length; i++) {
      const [before, after] = [FITS[i - 1]!, FITS[i]!];
      expect(after.height > before.height || (after.height === before.height && after.size < before.size)).toBe(true);
    }
  });

  it('starts a body as long as a filing may be, under a three-line title, on the tallest page', () => {
    const request = withFiling(sample(4), {
      title: 'Talos shrine found beneath the Silver-Blood Inn and the keeper, his visitors, the words',
      body: longest(),
    });
    expect(FITS[estimateFit(request)]!.height).toBe(2200);
  });

  it('steps to the next fit while one overruns, and keeps the last however it falls', () => {
    expect(nextFit(0)).toBe(1);
    expect(nextFit(FITS.length - 1)).toBeNull();
  });
});

describe('the sheet', () => {
  it('writes every part of the filing as real text', () => {
    const request = sample(0);
    const html = sheet(request);
    const { filing } = request;
    for (const text of [filing.title, 'Inspection Report', 'To the Military Wing', `Entry No. ${request.serial}`, `${filing.rank} ${filing.name}`, `Answering to ${filing.superior}`]) {
      expect(html, text).toContain(text);
    }
    expect(html).toContain('Forty-two soldiers of the Dominion stood muster');
    expect(sheet({ ...request, serial: null })).toContain('Draft');
  });

  it('escapes what the filer wrote', () => {
    const html = sheet(withFiling(sample(0), { title: '<img src=x onerror=alert(1)>', body: '<script>alert(1)</script> and more words besides' }));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('lays the paper for its own page height, and loads nothing from elsewhere', () => {
    for (const index of [0, 3, FITS.length - 1]) {
      const html = sheet(sample(0), index);
      expect(html).toContain(`parchment-${FITS[index]!.height}.jpg`);
      expect(html).toContain(`width:${WIDTH}px;height:${FITS[index]!.height}px`);
    }
    expect(sheet(sample(0))).not.toMatch(/(?:href|src)="(?:https?:)?\/\//);
    for (const height of PAGE_HEIGHTS) {
      expect(fs.existsSync(path.resolve(__dirname, `../web/src/assets/scribe/parchment-${height}.jpg`)), String(height)).toBe(true);
    }
  });

  it('draws the Cataclysm’s red border and banner, and only for a Cataclysm', () => {
    for (const importance of IMPORTANCE_LEVELS) {
      const html = sheet(withFiling(sample(0), { importance }));
      expect(html.includes('6px solid #8b1a1a'), importance).toBe(importance === 'cataclysm');
      expect(html.includes('All hands on deck'), importance).toBe(importance === 'cataclysm');
    }
  });

  it('presses the Clerk’s stamp in the marked space, and nothing else moves', () => {
    const at = sample(0).filing.time;
    const plain = sheet(sample(0));
    const approved = sheet({ ...sample(0), stamp: { mark: 'approved', at } });
    const denied = sheet({ ...sample(0), stamp: { mark: 'denied', at } });
    expect(plain).toContain('Clerk’s seal');
    expect(approved).toContain('seal-aldmeri.png');
    expect(approved).toContain('Approved');
    expect(denied).toContain('#a01c1c');
    expect(denied).toContain('Denied');
    // The same page, the same torn edge and the same writing above the foot.
    const head = (html: string) => html.slice(0, html.indexOf('Signed'));
    expect(head(approved)).toBe(head(plain));
    expect(head(denied)).toBe(head(plain));
  });

  it('tears the same edge every time, stamped or not, and each filing its own way', () => {
    const at = sample(0).filing.time;
    expect(seedOf({ ...sample(0), stamp: { mark: 'approved', at } })).toBe(seedOf(sample(0)));
    expect(deckle(WIDTH, 1500, seedOf(sample(0)))).toBe(deckle(WIDTH, 1500, seedOf(sample(0))));
    expect(deckle(WIDTH, 1500, 1)).not.toBe(deckle(WIDTH, 1500, 2));
  });
});
