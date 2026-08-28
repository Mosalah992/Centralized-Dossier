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
/**
 * Strip the marks of the tool the report was typed into, not of the Embassy.
 *
 * Agents write in Discord, so their filings arrive wrapped in code fences,
 * bracketed whole, and shot through with ** for emphasis. The archive renders a
 * filing as PLAIN TEXT — see the Latest Filings in Informants.tsx — so none of
 * it formats. It simply shows: asterisks around words, ``` on its own line, a
 * report that opens with an unclosed square bracket.
 *
 * IT MUST RUN BEFORE THE REDACTION BELOW, and that ordering is the whole of the
 * care needed here. The redaction's own markers — [an agent], [a rank], [link]
 * — are square-bracketed, so stripping brackets afterwards would erase exactly
 * the marks that show a reader something was taken out.
 *
 * This is where the shared rules and scripts/build-informant-history.mjs
 * legitimately differ, and the difference is the output format rather than
 * drift: that script writes a markdown DOCUMENT, where an agent's ** is real
 * emphasis and a heading has to be demoted rather than removed so it cannot
 * escape the outline. Here there is no outline and no emphasis, only text.
 */
function tidy(text: string): string {
  return text
    // Fenced blocks and inline ticks.
    .replace(/```+/g, '')
    .replace(/`/g, '')
    // ** and *, in any run.
    .replace(/\*+/g, '')
    // Task-list checkboxes first, as a shape. Stripping their brackets with
    // everything else leaves "-   a task" — the dash's own space plus the two
    // the box used to sit between.
    .replace(/^(\s*)[-*+]\s*\[[ xX]?\]\s*/gm, '$1- ')
    // Then wrappers: a report bracketed whole, or a bracketed aside.
    .replace(/[[\]]/g, '')
    // Headings, which would otherwise show their own hashes.
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    // Underscores doing the same work as the asterisks, when they wrap a word
    // rather than sit inside one — a_name_like_this is left alone.
    .replace(/(^|\s)_+([^_\n]+?)_+(?=\s|$)/g, '$1$2')
    .replace(/[ \t]+$/gm, '')
    // Blank runs left where a fence or a bracketed wrapper used to be.
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function redact(text: string): string {
  return tidy(text || '')
    /*
     * A PING IS NOT PROSE, so it is removed rather than marked.
     *
     * These were bracketed markers — [an agent], [a rank] — and the brackets
     * were a mistake twice over. They are the square brackets the filings were
     * meant to be rid of, and one filing opened with one, which put the
     * rubricated initial on "[a" and left "n agent]" stranded in the text.
     *
     * Nothing is lost by deleting them. A mention is somebody typing a name to
     * summon a reader's attention; it carries no account of anything, and a
     * report reads correctly without it — "Other Agents: @Someone" becomes
     * "Other Agents:", which is exactly as informative once the name is gone.
     */
    .replace(/<@!?(\d{17,20})>/g, '')
    .replace(/<@&(\d{17,20})>/g, '')
    .replace(/<#(\d{17,20})>/g, '')
    // Custom emoji keep their name and lose the id that points at the guild.
    .replace(/<a?:(\w+):(\d{17,20})>/g, ':$1:')
    /*
     * A LINK KEEPS A WORD, and it is the one thing here that does. Signed CDN
     * links expire and still encode channel and attachment ids, so the address
     * cannot stay — but a reader should know a filing came with something
     * attached, because "proof:" followed by nothing reads as a report that
     * failed rather than one that was cleaned.
     */
    .replace(/https?:\/\/\S+/g, 'a link')
    // Anything snowflake-shaped left is an id somebody pasted by hand.
    .replace(/\b\d{17,20}\b/g, '')
    // Tidy what the removals left: doubled spaces mid-line, spaces before
    // punctuation, and blank lines at the head where a mention used to sit.
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.;:!?])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
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
