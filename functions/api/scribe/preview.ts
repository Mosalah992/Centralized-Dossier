// POST /api/scribe/preview { filing } → the parchment as it would be filed,
// without an entry number. A member's kinds need the seal; Applications and
// Public Requests need none. Each drawing costs the Scribe real work, so they
// are counted per seal, or per address for an open filing.

import { CATEGORY_INFO, checkFiling } from '../../../shared/filing';
import { PREVIEWS, count, overLimit, readSeal } from '../../lib/codes';
import { NOT_CONSECRATED, addressOf, readBody, refuseForeignWrite, scribeJson, sealOf } from '../../lib/scribe-http';
import { codeStore, renderWith, type ScribeEnv } from '../../lib/scribe-env';

export const onRequestPost: PagesFunction<ScribeEnv> = async ({ request, env }) => {
  if (!env.REPORTS || !env.CODE_PEPPER || !env.SCRIBE) return scribeJson({ error: NOT_CONSECRATED }, 503);
  const foreign = refuseForeignWrite(request);
  if (foreign) return foreign;

  const body = await readBody(request);
  const checked = checkFiling(body?.filing);
  if (!checked.ok) return scribeJson({ error: checked.error, field: checked.field }, 422);
  const filing = checked.value;

  const codeId = await readSeal(env.CODE_PEPPER, sealOf(request));
  const holder = codeId === null ? null : await codeStore(env.REPORTS).byId(codeId);
  if (!CATEGORY_INFO[filing.category].open && !holder) {
    return scribeJson({ error: 'Give your code first: only a member of the Embassy may file that.' }, 401);
  }

  const key = PREVIEWS.key(holder ? `code-${holder.id}` : addressOf(request));
  if (await overLimit(env.GATE_ATTEMPTS, key, PREVIEWS.max)) {
    return scribeJson({ error: 'The Scribe’s hand is tired. Try again in a few minutes.' }, 429);
  }
  await count(env.GATE_ATTEMPTS, key, PREVIEWS.window);

  const png = await renderWith(env.SCRIBE, { filing, serial: null, stamp: null });
  if (!png) return scribeJson({ error: 'The Scribe could not draw it just now.' }, 503);
  return new Response(png, {
    headers: { 'content-type': 'image/png', 'cache-control': 'private, no-store', vary: 'Cookie' },
  });
};
