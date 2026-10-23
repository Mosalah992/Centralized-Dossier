// GET /api/chronicle — the Thalmor Chronicles.
//
// PUBLIC SINCE 2026-10-23. This was the archive's last sealed volume, behind a
// passphrase of its own; the First Emissary opened it, Latest Filings and all,
// and its gate (chronicle/gate.ts) was taken down. It is read like every other
// register now, so its response may be cached briefly like theirs.
//
// Its text still sits in functions/lib/chronicle.ts rather than the browser
// bundle, so it can be corrected without a rebuild and the nightly filings can
// be laid after it. See the note at the head of that file.

import { FUNERAL, MONTHS, POWERS, UNRESOLVED } from '../../lib/chronicle';
import type { Filing, ServedFiling } from '../../../shared/filings';

interface Env {
  /*
   * The Latest Filings, written nightly by the thalmor-chronicler Worker.
   *
   * OPTIONAL, AND ITS ABSENCE IS SILENT BY DESIGN. An unbound namespace, an
   * empty one, and a night the collector found nothing are the same thing to a
   * reader: the volume's written months, and no filings after them.
   */
  CHRONICLE_FILINGS?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  /*
   * Read-only, and it never fails the request. A KV read that throws — or a
   * value that is somehow not the shape we wrote — costs the filings and
   * nothing else; the written volume does not depend on this having worked.
   */
  let filings: ServedFiling[] = [];
  try {
    const stored = ((await env.CHRONICLE_FILINGS?.get('filings', 'json')) as Filing[] | null) ?? [];
    // The message id stays on this side of the wire.
    filings = stored.map(({ agent, filedAt, inWorld, text }) => ({ agent, filedAt, inWorld, text }));
  } catch {
    filings = [];
  }

  return new Response(
    JSON.stringify({
      fetchedAtUtc: new Date().toISOString(),
      months: MONTHS,
      powers: POWERS,
      unresolved: UNRESOLVED,
      funeral: FUNERAL,
      filings,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // As the other public volumes: a reader may keep it a minute, and the
        // edge may too. The filings change nightly.
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
};
