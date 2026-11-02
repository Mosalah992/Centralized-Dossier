// GET /api/room/board/:section: one section's notices, newest first.

import { isBoardSection } from '../../../../shared/room';
import { BOARD_PAGE, boardSummary, noticeOf } from '../../../lib/board';
import { d1FilingStore } from '../../../lib/scribe-d1';
import type { ScribeEnv } from '../../../lib/scribe-env';

export const onRequestGet: PagesFunction<ScribeEnv> = async ({ env, params }) => {
  const id = String(params.section);
  if (!isBoardSection(id)) return Response.json({ error: 'No such section hangs on the board.' }, { status: 404 });
  if (!env.REPORTS) return Response.json({ error: 'The board is not yet hung.' }, { status: 503 });
  const store = d1FilingStore(env.REPORTS);
  const [summary, records] = await Promise.all([boardSummary(store), store.board(id, BOARD_PAGE)]);
  return Response.json(
    { section: summary.find((s) => s.id === id)!, notices: records.map((r) => noticeOf(r, id)) },
    { headers: { 'cache-control': 'public, max-age=60' } },
  );
};
