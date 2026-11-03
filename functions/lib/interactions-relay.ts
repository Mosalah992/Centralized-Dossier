// One bot, two Workers. The Scribe runs on Archivist Ancarion, the Embassy's
// established bot (the team's choice, 2026-11-03), and a Discord application
// sends every interaction to a single endpoint. That endpoint is now the
// archive's (functions/api/discord/interactions.ts): it answers the Scribe's
// own interactions and hands every other one, unchanged, to the quartermaster
// Worker that served Ancarion before (/clockin, /clockout, /stock and the rest).
//
// THE COST, ACCEPTED KNOWINGLY: clock-ins now pass through the archive, so they
// fail when the archive does. The quartermaster's source is not kept here, so
// the archive could not be the one to forward instead.
//
// The forward is byte-for-byte: the raw body and Discord's two signature
// headers, so the quartermaster's own signature check still passes. Discord
// waits three seconds for an answer; the forward gives up a little before
// that, so the member is told plainly rather than shown "did not respond".
//
// Pure (fetch is passed in), so the tests run it in Node.

/** Interaction types (Discord). */
const COMMAND = 2;
const COMPONENT = 3;
const AUTOCOMPLETE = 4;
const MODAL_SUBMIT = 5;

/** The Scribe's own commands, and the prefix on every custom_id its messages carry (report-wizard.ts). */
export const SCRIBE_COMMANDS: readonly string[] = ['archives', 'report'];
export const SCRIBE_CUSTOM_ID = 'scribe:';

export interface RelayedInteraction {
  type: number;
  data?: { name?: string; custom_id?: string };
}

/** Whether the Scribe answers this interaction itself. Anything else is the quartermaster's. */
export function isScribeInteraction(i: RelayedInteraction): boolean {
  if (i.type === COMMAND || i.type === AUTOCOMPLETE) return SCRIBE_COMMANDS.includes(i.data?.name ?? '');
  if (i.type === COMPONENT || i.type === MODAL_SUBMIT) return (i.data?.custom_id ?? '').startsWith(SCRIBE_CUSTOM_ID);
  return false;
}

/** How long the quartermaster is given, of Discord's three seconds. */
export const RELAY_TIMEOUT_MS = 2500;

export const QUARTERMASTER_DOWN = 'The quartermaster’s ledger cannot be reached just now. Try again in a moment.';

/**
 * The answer when the quartermaster cannot give one: an ephemeral message, or
 * for autocomplete (which may not answer with a message) no choices.
 */
export function unreachable(type: number): Response {
  if (type === AUTOCOMPLETE) return Response.json({ type: 8, data: { choices: [] } });
  return Response.json({ type: 4, data: { content: QUARTERMASTER_DOWN, flags: 1 << 6, allowed_mentions: { parse: [] } } });
}

export interface Signed {
  raw: ArrayBuffer;
  signature: string;
  timestamp: string;
  contentType: string;
}

/**
 * Hand an interaction to the quartermaster exactly as Discord sent it, and its
 * answer back exactly as it gave it. A failure, a refusal from its server, or
 * no answer in time is turned into a plain message instead.
 */
export async function forwardInteraction(
  url: string | undefined,
  type: number,
  signed: Signed,
  fetcher: typeof fetch = fetch,
  timeoutMs: number = RELAY_TIMEOUT_MS,
): Promise<Response> {
  if (!url) return unreachable(type);
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': signed.contentType,
        'X-Signature-Ed25519': signed.signature,
        'X-Signature-Timestamp': signed.timestamp,
      },
      body: signed.raw,
      signal: AbortSignal.timeout(timeoutMs),
    });
    // A 5xx is the quartermaster failing, not answering. A 4xx (its own
    // signature refusal, say) is relayed as given: that is its answer.
    if (res.status >= 500) {
      console.warn('relay: quartermaster failed', res.status);
      return unreachable(type);
    }
    return new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (error) {
    console.warn('relay: quartermaster unreachable', error);
    return unreachable(type);
  }
}
