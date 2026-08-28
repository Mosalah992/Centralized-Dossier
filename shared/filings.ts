// The Latest Filings — redaction and report-detection for the nightly pull.
//
// WHY THIS IS SHARED RATHER THAN LIVING IN THE WORKER. These rules already
// existed once, in scripts/build-informant-history.mjs, where they turn the raw
// dump into docs/informant-reports.md. That script runs by hand on a machine;
// the chronicler Worker runs unattended every night and PUBLISHES what it
// produces to a hundred readers. The rules must not drift apart, because the
// half that drifts is the half nobody is watching.
//
// The Node script keeps its own copy deliberately: it is committed, it works,
// and docs/informant-reports.md is meant to regenerate byte for byte. Rewriting
// it to import from here would put that reproducibility at risk for a tidiness
// nobody asked for. test/filings.test.ts pins the BEHAVIOUR of both instead,
// which is the thing that actually has to agree.
//
// TWO STAGES, AND THE SECOND IS THE ONE THAT MATTERS. `redact` transforms;
// `survivors` checks the transform worked, against the real identifiers of the
// people in the messages. A regex that silently stops matching is not a bug you
// see in the output — the output looks fine. It is a bug you see in the check.

/** A message as Discord hands it over, narrowed to what we read. */
export interface RawMessage {
  id: string;
  content?: string;
  timestamp: string;
  author: { id: string; username?: string; global_name?: string | null; bot?: boolean };
  mentions?: { id: string; username?: string; global_name?: string | null }[];
}

/** One filing, redacted and safe to serve. */
export interface Filing {
  /**
   * Discord message id. Kept in KV to order and de-duplicate; STRIPPED at the
   * API boundary, so it never reaches a reader — see ServedFiling and the map
   * in functions/api/chronicle/index.ts.
   */
  id: string;
  /** The channel's name with "-reports" trimmed, e.g. `telandor`. */
  agent: string;
  /** ISO instant the report was filed. */
  filedAt: string;
  /** The in-world date the report states, when it states one. */
  inWorld: string | null;
  text: string;
}

/**
 * A report, as against the conversation around it.
 *
 * The same two tests the export uses: an explicit "Agent's name:" header, or
 * four hundred characters of substance. Most channel traffic is chatter, and
 * 1900 of the 2687 messages in the last full export were exactly that.
 */
export const SUBSTANCE = 400;
export const HEADER = /agent'?s?\s*n[ao]me\s*[:\-]/i;

export function isReport(content: string): boolean {
  return HEADER.test(content) || content.length >= SUBSTANCE;
}

/** In-world date, when the filing states one. */
const IN_WORLD_DATE =
  /\b((?:\d{1,2}(?:st|nd|rd|th)?\s+of\s+)?(?:Morning Star|Sun'?[’']?s Dawn|First Seed|Rain'?[’']?s Hand|Second Seed|Mid ?year|Sun'?[’']?s Height|Last Seed|Heart ?fire|Frostfall|Sun'?[’']?s Dusk|Evening Star)(?:\s+\d{1,2}(?:st|nd|rd|th)?)?)/i;

export function statedDate(content: string): string | null {
  const hit = content.match(IN_WORLD_DATE);
  // Group 1 is the whole alternation and cannot be undefined when the match
  // succeeded, but the type says otherwise and an unchecked index here would
  // be the one place this module can throw on ordinary input.
  const found = hit?.[1];
  return found ? found.trim().replace(/[*_]+$/, '').replace(/[.,]$/, '') : null;
}

/**
 * Strip everything that identifies an account.
 *
 * Order is load-bearing. Mention markup goes first, because the bare-snowflake
 * sweep below would otherwise eat the id out of `<@123…>` and leave `<@[id]>`
 * behind — markup that no longer resolves and no longer reads as anything.
 */
export function redact(text: string): string {
  return (text || '')
    .replace(/<@!?(\d{17,20})>/g, '[an agent]')
    .replace(/<@&(\d{17,20})>/g, '[a rank]')
    .replace(/<#(\d{17,20})>/g, '[a channel]')
    // Custom emoji keep their name and lose the id that points at the guild.
    .replace(/<a?:(\w+):(\d{17,20})>/g, ':$1:')
    // Signed CDN links expire and still encode channel and attachment ids; any
    // other link is an offsite reference we have no reason to republish.
    .replace(/https?:\/\/\S+/g, '[link]')
    // Anything snowflake-shaped left is an id somebody pasted by hand.
    .replace(/\b\d{17,20}\b/g, '[id]')
    // A report's own markdown headings must not escape into the page's outline.
    .replace(/^#{1,4}(\s)/gm, '#####$1')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Collect the identifiers that must never appear in published text.
 *
 * Usernames and account ids only. Display names are deliberately NOT secrets:
 * Discord has no lookup by them, and in this guild they are overwhelmingly the
 * character names the reports are about — treating them as secrets would redact
 * the very names that make a filing legible, and would match inside ordinary
 * words while doing it.
 */
export function identifiersIn(messages: RawMessage[]): Set<string> {
  const out = new Set<string>();
  for (const m of messages) {
    for (const p of [m.author, ...(m.mentions ?? [])]) {
      if (!p) continue;
      if (p.id) out.add(p.id);
      if (p.username) out.add(p.username);
    }
  }
  return out;
}

/**
 * What survived redaction that should not have. Empty means safe to publish.
 *
 * Short identifiers are skipped: under four characters a "username" collides
 * with ordinary prose constantly, and a check that cries wolf on every filing
 * is a check that gets switched off.
 */
export function survivors(text: string, secrets: Set<string>): string[] {
  const lower = text.toLowerCase();
  const leaks: string[] = [];

  for (const s of secrets) {
    const needle = String(s ?? '');
    if (needle.length < 4) continue;
    if (lower.includes(needle.toLowerCase())) leaks.push(needle);
  }
  if (/\b\d{17,20}\b/.test(text)) leaks.push('<bare snowflake id>');
  if (/https?:\/\//.test(text)) leaks.push('<url>');

  return leaks;
}

/**
 * Turn fetched messages into publishable filings.
 *
 * A filing that fails the survivor check is DROPPED, not published with a
 * warning. This runs unattended: there is nobody to read a warning before a
 * hundred people read the leak.
 */
export function toFilings(
  messages: RawMessage[],
  agent: string,
  secrets: Set<string>,
): { filings: Filing[]; dropped: number } {
  const filings: Filing[] = [];
  let dropped = 0;

  for (const m of messages) {
    if (m.author?.bot) continue;
    const content = m.content ?? '';
    if (!isReport(content)) continue;

    const text = redact(content);
    if (!text) continue;

    if (survivors(text, secrets).length > 0) {
      dropped++;
      continue;
    }

    filings.push({
      id: m.id,
      agent,
      filedAt: m.timestamp,
      inWorld: statedDate(content),
      text,
    });
  }

  return { filings, dropped };
}

/**
 * A filing as a reader receives it.
 *
 * The message id is gone. It identifies nobody by itself, which is why the
 * survivor check does not object to it, but it is a live handle on a message in
 * a channel and the volume has no use for it — the ordering it exists for has
 * already happened by the time this is built. Publishing an identifier because
 * nothing forbade it is how the interesting ones get out.
 */
export type ServedFiling = Omit<Filing, 'id'>;
