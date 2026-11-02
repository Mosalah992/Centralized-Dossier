// GET /api/room/board: the board's six sections and how many notices hang in
// each. Public, as the board is: anyone in the room may read it.

import { boardSummary } from '../../../lib/board';
import { d1FilingStore } from '../../../lib/scribe-d1';
import type { ScribeEnv } from '../../../lib/scribe-env';

export const onRequestGet: PagesFunction<ScribeEnv> = async ({ env }) => {
  if (!env.REPORTS) return Response.json({ error: 'The board is not yet hung.' }, { status: 503 });
  const sections = await boardSummary(d1FilingStore(env.REPORTS));
  return Response.json({ sections }, { headers: { 'cache-control': 'public, max-age=60' } });
};
