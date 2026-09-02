// GET /api/chronicle — the Thalmor Chronicles.
//
// THE ONLY SEALED VOLUME LEFT, AND THE CHECK BELOW IS THE WHOLE OF THE SEAL.
// This route was the inner of two locks: api/_middleware.ts established that
// the caller held an archive writ before it ran at all, and what happened here
// was the second question. The archive's gate is gone — every other register is
// public now — so nothing runs in front of this. The writ read below, minted by
// chronicle/gate.ts against the volume's own passphrase, is the only thing
// between this text and anyone with the link.
//
// The scope check in readWrit still matters for the same reason it always did,
// and rather more: readers are holding week-long archive writs that are validly
// signed, and a cookie's value can be moved. One replayed into this cookie is
// refused because the scope is signed into the body. See session.ts.
//
// The failure is 403 and deliberately not 401 — 401 has no meaning here now
// that there is no outer gate to fall back to, and this is a volume shut under
// its own word rather than a reader who is not admitted.
//
// Its text sits in functions/lib/chronicle.ts and never enters the browser
// bundle. See the note at the head of that file for why.

import { CHRONICLE_COOKIE_NAME, readCookie, readWrit } from '../../lib/session';
import { FUNERAL, MONTHS, POWERS, UNRESOLVED } from '../../lib/chronicle';
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
    funeral: FUNERAL,
    filings,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // LOAD-BEARING, not a duplicate of something upstream. The middleware
      // used to rewrite every gated response to this and no longer rewrites
      // anything; these two headers are now the only reason a shared cache
      // cannot hold a copy of the sealed volume. Do not remove them as
      // redundant with the gate above — they are what makes the gate mean
      // anything at the edge.
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
}
