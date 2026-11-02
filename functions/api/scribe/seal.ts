// The Scribe Table's seal: a member gives their code and is filled in.
//
//   GET     who the seal names now (asked of Discord again), or null
//   POST    { code } → the holder's rank, office and name, and the seal cookie
//   DELETE  give the seal back
//
// Wrong codes are counted per address in the gates' attempts KV; without that
// store the table refuses codes rather than let them be guessed freely.

import type { ScribeHolder } from '../../../shared/filing';
import { CODE_ATTEMPTS, clearedSealCookie, count, issueSeal, overLimit, readSeal, sealCookie } from '../../lib/codes';
import { NOT_CONSECRATED, addressOf, readBody, refuseForeignWrite, scribeJson, sealOf } from '../../lib/scribe-http';
import { admitCode, admitCodeId, type ScribeEnv } from '../../lib/scribe-env';
import type { Admission } from '../../lib/codes';

const holderOf = (admitted: Extract<Admission, { ok: true }>): ScribeHolder => ({
  rank: admitted.grant.rank,
  office: admitted.grant.office,
  name: admitted.holder.name,
});

export const onRequest: PagesFunction<ScribeEnv> = async ({ request, env }) => {
  if (!env.REPORTS || !env.CODE_PEPPER) return scribeJson({ error: NOT_CONSECRATED }, 503);
  const db = env.REPORTS;
  const pepper = env.CODE_PEPPER;

  if (request.method === 'GET') {
    const codeId = await readSeal(pepper, sealOf(request));
    if (codeId === null) return scribeJson({ holder: null });
    const admitted = await admitCodeId({ ...env, REPORTS: db }, codeId);
    if (!admitted.ok) {
      return scribeJson({ holder: null, ...(admitted.reason === 'unavailable' ? { error: admitted.message } : {}) }, 200, {
        ...(admitted.reason === 'unavailable' ? {} : { 'set-cookie': clearedSealCookie() }),
      });
    }
    return scribeJson({ holder: holderOf(admitted) });
  }

  if (request.method === 'DELETE') return scribeJson({ holder: null }, 200, { 'set-cookie': clearedSealCookie() });
  if (request.method !== 'POST') return scribeJson({ error: 'Method not permitted.' }, 405);

  const foreign = refuseForeignWrite(request);
  if (foreign) return foreign;

  const key = CODE_ATTEMPTS.key(addressOf(request));
  if (await overLimit(env.GATE_ATTEMPTS, key, CODE_ATTEMPTS.max)) {
    return scribeJson({ error: 'The Scribe will take no more codes from you for a time.' }, 429);
  }

  const body = await readBody(request, 1024);
  const offered = typeof body?.code === 'string' ? body.code : '';
  const admitted = await admitCode({ ...env, REPORTS: db, CODE_PEPPER: pepper }, offered);
  if (!admitted.ok) {
    if (admitted.reason === 'unknown-code') await count(env.GATE_ATTEMPTS, key, CODE_ATTEMPTS.window);
    return scribeJson({ error: admitted.message }, admitted.reason === 'unavailable' ? 503 : 401);
  }

  const token = await issueSeal(pepper, admitted.holder.id);
  return scribeJson({ holder: holderOf(admitted) }, 200, { 'set-cookie': sealCookie(token) });
};
