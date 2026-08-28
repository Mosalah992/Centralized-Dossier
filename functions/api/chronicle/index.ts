// GET /api/chronicle — the Thalmor Chronicles.
//
// The only volume behind two locks. api/_middleware.ts has already established
// that the caller holds an archive writ before this route runs at all; what is
// checked here is the SECOND writ, minted by chronicle/gate.ts against the
// volume's own passphrase. Holding one does not imply the other: the scope is
// signed into each writ, so an archive writ moved into the chronicle's cookie
// is rejected (see WritScope in functions/lib/session.ts).
//
// The failure is 403 and deliberately not 401. The web app treats 401 from any
// volume as "the archive has resealed" and drops the reader back to the main
// gate — which would be wrong and disorienting here, since their writ for the
// archive is perfectly good and it is only this volume that is shut to them.
//
// Its text sits in functions/lib/chronicle.ts and never enters the browser
// bundle. See the note at the head of that file for why.

import { CHRONICLE_COOKIE_NAME, readCookie, readWrit } from '../../lib/session';
import { MONTHS, POWERS, UNRESOLVED } from '../../lib/chronicle';
import type { Filing, ServedFiling } from '../../../shared/filings';

interface Env {
  GATE_SECRET: string;
  GATE_EPOCH?: string;
  /*
   * The Latest Filings, written nightly by the thalmor-chronicler Worker.
   *
   * OPTIONAL, AND ITS ABSENCE IS SILENT BY DESIGN. An unbound namespace, an
   * empty one, and a night the collector found nothing are the same thing to a
   * reader: the volume's written months, and no filings after them. Sealing or
   * erroring because an accessory feed is unconfigured would take down the one
   * volume that already needs the Worker up to be read at all.
   */
  CHRONICLE_FILINGS?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Fails closed, exactly as the archive gate does. A missing secret must never
  // mean an open volume.
  if (!env.GATE_SECRET) {
    return json({ error: 'The volume is sealed pending the warden’s key.' }, 503);
  }

  const epoch = Number(env.GATE_EPOCH ?? '1');
  const writ = await readWrit(
    env.GATE_SECRET,
    epoch,
    readCookie(request, CHRONICLE_COOKIE_NAME),
    'chronicle',
  );

  if (!writ) {
    return json({ error: 'This volume is sealed under its own word.' }, 403);
  }

  /*
   * Read-only, and it never fails the request. A KV read that throws — or a
   * value that is somehow not the shape we wrote — costs the filings and
   * nothing else; the written volume is already in hand and does not depend on
   * this having worked.
   */
  let filings: ServedFiling[] = [];
  try {
    const stored = ((await env.CHRONICLE_FILINGS?.get('filings', 'json')) as Filing[] | null) ?? [];
    // The message id stays on this side of the wire.
    filings = stored.map(({ agent, filedAt, inWorld, text }) => ({ agent, filedAt, inWorld, text }));
  } catch {
    filings = [];
  }

  return json({
    fetchedAtUtc: new Date().toISOString(),
    months: MONTHS,
    powers: POWERS,
    unresolved: UNRESOLVED,
    filings,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // The middleware rewrites this on the way out for gated routes; it is set
      // here so the answer is still right if this route is ever reached
      // without passing through it.
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
}
