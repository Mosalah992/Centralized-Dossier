// POST /api/scribe/file { filing } → { id, destination }: file it.
//
// A member's kinds need the seal, and Discord is asked again that its holder
// still holds a mapped role; the filer's Discord id is kept (never served) so
// the bot can name who filed it. Applications and Public Requests need no
// seal and are limited per address instead. Either way the filing is recorded
// and entered in the Cabinet before the answer, and drawn and posted after it.

import { CATEGORY_INFO, checkFiling, type FiledAnswer } from '../../../shared/filing';
import { OPEN_FILINGS, count, overLimit, readSeal } from '../../lib/codes';
import { publish, record } from '../../lib/scribe';
import { NOT_CONSECRATED, addressOf, readBody, refuseForeignWrite, scribeJson, sealOf } from '../../lib/scribe-http';
import { admitCodeId, scribeDeps, type ScribeEnv } from '../../lib/scribe-env';

export const onRequestPost: PagesFunction<ScribeEnv> = async ({ request, env, waitUntil }) => {
  if (!env.REPORTS || !env.CODE_PEPPER) return scribeJson({ error: NOT_CONSECRATED }, 503);
  const db = env.REPORTS;
  const foreign = refuseForeignWrite(request);
  if (foreign) return foreign;

  const body = await readBody(request);
  const checked = checkFiling(body?.filing);
  if (!checked.ok) return scribeJson({ error: checked.error, field: checked.field }, 422);
  const filing = checked.value;
  const open = CATEGORY_INFO[filing.category].open;

  let filer: string | null = null;
  const codeId = await readSeal(env.CODE_PEPPER, sealOf(request));
  if (codeId !== null) {
    const admitted = await admitCodeId({ ...env, REPORTS: db }, codeId);
    if (admitted.ok) filer = admitted.holder.discordUserId;
    else if (!open) return scribeJson({ error: admitted.message }, admitted.reason === 'unavailable' ? 503 : 401);
  } else if (!open) {
    return scribeJson({ error: 'Give your code first: only a member of the Embassy may file that.' }, 401);
  }

  const key = OPEN_FILINGS.key(addressOf(request));
  if (!filer) {
    if (await overLimit(env.GATE_ATTEMPTS, key, OPEN_FILINGS.max)) {
      return scribeJson({ error: 'The Clerk has enough from you for now. Try again within the hour.' }, 429);
    }
    await count(env.GATE_ATTEMPTS, key, OPEN_FILINGS.window);
  }

  const deps = scribeDeps({ ...env, REPORTS: db });
  const id = await record(deps, filing, 'web', filer);
  waitUntil(publish(deps, id).catch((error) => console.warn('scribe: not posted', id, error)));
  const answer: FiledAnswer = { id, destination: CATEGORY_INFO[filing.category].destination.kind };
  return scribeJson(answer, 201);
};
