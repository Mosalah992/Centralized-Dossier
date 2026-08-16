// Turns the raw dump in tmp/informants/ into a single redacted, chronological
// markdown record of the Informants' reports.
//
//   node scripts/dump-informant-reports.mjs     # first — writes tmp/informants/
//   node scripts/build-informant-history.mjs    # then — writes docs/informant-reports.md
//
// Two things drive the design.
//
// **Attribution is in-character only.** The raw payloads carry Discord
// usernames, snowflake IDs and signed CDN URLs for ~60 real accounts. None of
// that reaches the output: an entry is credited to the agent name the report
// itself declares, falling back to the name of the channel it was filed in.
// The mapping from character to account exists only in gitignored tmp/.
// verifyClean() below refuses to write a file that still holds any of it.
//
// **Ordering is by filing time, not by the in-world date.** Only about one
// report in four states an in-world date, and those that do disagree about the
// calendar — "10th of Mid Year, 4E226" and "7/16/2026" both appear. Discord's
// timestamp is on every message and matches the order events were reported in,
// so it is the spine; a declared in-world date is printed alongside the entry
// rather than used to sort it. Sorting on a field three quarters of the corpus
// lacks would invent a chronology rather than extract one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'tmp', 'informants');
const OUT = path.join(ROOT, 'docs', 'informant-reports.md');

// A message counts as a report if it declares itself one, or is long enough to
// be substance rather than back-chat. The channels mix filed reports with
// ordinary conversation, and the median chat line is well under this.
const SUBSTANCE = 400;

const HEADER = /agent'?s?\s*n[ao]me\s*[:\-]/i;
const IN_WORLD_DATE = /date\s+of\s+(?:the\s+)?report\s*[:\-]*\s*\*{0,2}\s*([^\n*]{2,60})/i;

if (!fs.existsSync(IN)) {
  console.error('No tmp/informants/ — run scripts/dump-informant-reports.mjs first.');
  process.exit(1);
}

const files = fs.readdirSync(IN).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

// ---------------------------------------------------------------- redaction

// Identifiers split two ways, because they carry very different risk.
//
// `secrets` — usernames and account ids — are hard failures. A username is the
// handle you can look an account up by; an id is the account itself. Neither
// has any business in a published file, and neither legitimately occurs in
// prose.
//
// `displayNames` are only warned about. A display name identifies nobody on its
// own — Discord has no lookup by it — and in this guild they are overwhelmingly
// the *character* names the history is about. Treating them as secrets fails on
// substrings of ordinary words ("stripped" contains a display name, so does
// "retired") and would redact the very names that make the record legible.
const secrets = new Set();
const displayNames = new Set();

const raw = [];
for (const file of files) {
  for (const m of JSON.parse(fs.readFileSync(path.join(IN, file), 'utf8'))) {
    const people = [m.author, ...(m.mentions || [])];
    for (const p of people) {
      secrets.add(p.id);
      if (p.username) secrets.add(p.username);
      if (p.global_name) displayNames.add(p.global_name);
    }
    raw.push({ ...m, _file: file });
  }
}

function redact(text) {
  return (text || '')
    // Mention markup, before the bare-snowflake sweep can maul it.
    .replace(/<@!?(\d{17,20})>/g, '[an agent]')
    .replace(/<@&(\d{17,20})>/g, '[a rank]')
    .replace(/<#(\d{17,20})>/g, '[a channel]')
    // Custom emoji keep their name, lose the id that points at the guild.
    .replace(/<a?:(\w+):(\d{17,20})>/g, ':$1:')
    // Signed CDN links expire but still encode channel and attachment ids, and
    // any other link is an offsite reference we have no reason to republish.
    .replace(/https?:\/\/\S+/g, '[link]')
    // Anything snowflake-shaped left over is an id someone pasted by hand.
    .replace(/\b\d{17,20}\b/g, '[id]')
    // Agents sometimes head their own sections with markdown. Left alone, a
    // body's `###` is indistinguishable from one of this document's day
    // headings and silently breaks the outline — demote anything at or above
    // the entry's own level so a report can never escape its entry.
    .replace(/^#{1,4}(\s)/gm, '#####$1')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

// --------------------------------------------------------------- the calendar

// Tamriel's months against the Julian ones. The correspondence is the standard
// Elder Scrolls one, and the reports bear it out: of the 132 that state an
// in-world date, 131 name the month matching the month they were filed in.
const TES_MONTHS = [
  'Morning Star', 'Sun’s Dawn', 'First Seed', 'Rain’s Hand',
  'Second Seed', 'Mid Year', 'Sun’s Height', 'Last Seed',
  'Hearthfire', 'Frostfall', 'Sun’s Dusk', 'Evening Star',
];

// Reports are filed after the session they describe, and a session that runs
// past midnight UTC is filed under the next date while belonging to the night
// before. Shifting the clock back before reading the date corrects for it.
//
// Seven hours is calibrated, not chosen: tested against the 131 reports that
// state their own in-world date, agreement peaks on a 6–8h plateau at 86%,
// against 72% for no shift at all. The residual is authors dating a report to
// when the events happened rather than when they wrote it, which no offset can
// recover — which is why a stated date always wins over a derived one below.
const SESSION_SHIFT_H = 7;

function derivedDate(at) {
  const d = new Date(at.getTime() - SESSION_SHIFT_H * 3600e3);
  return `${TES_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// A stated date is authoritative but arrives in a dozen spellings — "10th of
// Mid Year, 4E226", "4th of Sun's Height", "11th of Sun's height, 4E 226".
// Normalise what parses and keep the rest verbatim rather than discard it.
const MONTH_LOOKUP = new Map(
  TES_MONTHS.flatMap((m, i) => {
    const plain = m.replace(/’/g, "'").toLowerCase();
    return [[plain, i], [plain.replace(/'/g, ''), i], [plain.replace(/\s+/g, ''), i]];
  }),
);

function normaliseStated(text) {
  if (!text) return null;
  const hit = text
    .toLowerCase()
    .replace(/,/g, ' ')
    .match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z'’ ]+)/);
  if (!hit) return text;
  const key = hit[2].replace(/’/g, "'").replace(/\s*4e.*$/, '').trim();
  const month = MONTH_LOOKUP.get(key) ?? MONTH_LOOKUP.get(key.replace(/\s+/g, ''));
  if (month === undefined) return text;
  return `${TES_MONTHS[month]} ${Number(hit[1])}`;
}

// ------------------------------------------------------- agent name per file

// Prefer the name agents give themselves in the report header — it is the full
// in-character name — and fall back to the channel's own prefix.
const titleCase = (s) =>
  s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

const agentNames = new Map();
for (const file of files) {
  const slug = file.replace(/\.json$/, '').replace(/-reporte?s?$/, '');
  const declared = new Map();

  for (const m of raw) {
    if (m._file !== file || m.author.bot) continue;
    const hit = (m.content || '').match(/agent'?s?\s*n[ao]me\s*[:\-]*\s*\*{0,2}\s*([^\n*]{2,48})/i);
    if (!hit) continue;
    const name = hit[1].trim().replace(/[.,]$/, '');
    // Guard against the template being echoed back with the field left blank.
    if (!name || /^\[|^none$/i.test(name)) continue;
    declared.set(name, (declared.get(name) || 0) + 1);
  }

  const best = [...declared.entries()].sort((a, b) => b[1] - a[1])[0];
  // A declared name is only trustworthy if it agrees with whose channel it is;
  // agents also file reports naming *other* agents in the header.
  const fallback = titleCase(slug.replace(/[^a-z0-9']+/gi, ' ').trim());
  const chosen =
    best && best[0].toLowerCase().includes(slug.split(/[^a-z0-9']/i)[0].toLowerCase())
      ? best[0]
      : fallback;

  agentNames.set(file, chosen);
}

// ------------------------------------------------------------------ entries

const entries = [];
let chatter = 0;

for (const m of raw) {
  if (m.author.bot) continue;

  const content = m.content || '';
  const isReport = HEADER.test(content) || content.length >= SUBSTANCE;
  if (!isReport) {
    chatter++;
    continue;
  }

  const dateHit = content.match(IN_WORLD_DATE);
  let inWorld = dateHit ? dateHit[1].trim().replace(/[*_]+$/, '').replace(/[.,]$/, '') : null;
  // A bare real-world date is the filing date restated, which the entry heading
  // already carries; only an in-world calendar adds anything.
  if (inWorld && /^[\d\/\-. ]+$/.test(inWorld)) inWorld = null;

  // Who else was present is part of the record — it is how a patrol reported by
  // one agent can be matched to the same patrol reported by another — so it is
  // lifted into the metadata line rather than dropped.
  const withHit = content.match(/other\s+agents?\s+involved\s*[:\-]*\s*\*{0,2}\s*([^\n*]{0,120})/i);
  const withAgents =
    withHit && !/^\s*(none|n\/a|-|)\s*$/i.test(withHit[1])
      ? withHit[1].trim().replace(/[.,]$/, '')
      : null;

  // The header block is scaffolding — its fields are promoted into the entry's
  // own metadata line, so leaving them in the body prints everything twice.
  const body = content
    .replace(/^\s*\*{0,2}agent'?s?\s*n[ao]me\s*[:\-]*[^\n]*\n?/i, '')
    .replace(/^\s*\*{0,2}date\s+of\s+(?:the\s+)?report\s*[:\-]*[^\n]*\n?/im, '')
    .replace(/^\s*\*{0,2}other\s+agents?\s+involved\s*[:\-]*[^\n]*\n?/im, '')
    .trim();

  // A report filed in a thread belongs to whoever the thread is named for, not
  // to the channel it hangs under: the intake channel carries a thread of real
  // reports, and the channel slug would credit them all to "Create".
  const threadAgent = m._thread
    ? titleCase(m._source.replace(/\s*reports?\s*$/i, '').trim())
    : null;

  entries.push({
    at: new Date(m.timestamp),
    agent: threadAgent || agentNames.get(m._file),
    channel: m._file.replace(/\.json$/, ''),
    thread: m._thread ? m._source : null,
    // Both are lifted straight out of raw content and can carry mention markup,
    // so they go through the same sweep the body does.
    inWorld: redact(inWorld) || null,
    stated: normaliseStated(redact(inWorld) || null),
    derived: derivedDate(new Date(m.timestamp)),
    withAgents: redact(withAgents) || null,
    body: redact(body),
    images: m.attachments.length,
    edited: !!m.edited_timestamp,
  });
}

entries.sort((a, b) => a.at - b.at);

// -------------------------------------------------------------------- render

const day = (d) => d.toISOString().slice(0, 10);
const time = (d) => d.toISOString().slice(11, 16);

const byAgent = new Map();
for (const e of entries) byAgent.set(e.agent, (byAgent.get(e.agent) || 0) + 1);

const first = entries[0].at;
const last = entries[entries.length - 1].at;

const out = [];

out.push('# The Informants\' Reports');
out.push('');
out.push(
  'Every report filed to the Embassy\'s informant channels, redacted and set in the order ' +
    'it was filed. Compiled by `scripts/build-informant-history.mjs` from a dump of the ' +
    '`Informants` category; regenerate rather than edit by hand.',
);
out.push('');
out.push(`**${entries.length} reports** from **${byAgent.size} informants**, ` +
  `${day(first)} to ${day(last)}.`);
out.push('');
out.push('## How to read this');
out.push('');
out.push(
  '- **Attribution is in-character.** Entries are credited to the agent name the report ' +
    'declares, or to the informant whose channel or thread it was filed in. No Discord ' +
    'handle, account id, mention or attachment link appears anywhere in this file, and the ' +
    'build refuses to write if one survives. The mapping back to accounts is not committed. ' +
    'Personal names *written into* the reports are left as the authors wrote them — they ' +
    'are the characters this record is about.',
);
out.push(
  '- **Order is filing order; dating is in-world.** Headings are the date a report was ' +
    'filed. Each entry opens with its in-world date: **bold** where the report states one, ' +
    `and \`≈\` where it does not and the date is derived from the filing time. Deriving it ` +
    'is sound because the two calendars correspond — 131 of the 132 reports that state a ' +
    'date name the month they were filed in, on the standard Tamrielic calendar — and ' +
    `because sessions run into the night, so the clock is wound back ${SESSION_SHIFT_H} ` +
    'hours before the date is read. That offset is calibrated against the reports that ' +
    'date themselves, where it agrees 86% of the time against 72% for no offset. A stated ' +
    'date always overrides a derived one.',
);
out.push(
  `- **Conversation is left out.** ${chatter.toLocaleString()} shorter messages in these ` +
    'channels are back-and-forth around the reports rather than reports themselves. Only ' +
    'messages that declare a report header, or run past ' +
    `${SUBSTANCE} characters, are collected here.`,
);
out.push(
  '- **Images are noted, not included.** Where a report carried attachments the count is ' +
    'marked; the files themselves are not republished.',
);
out.push('');

out.push('## The informants');
out.push('');
out.push('| Informant | Reports | First | Last |');
out.push('|---|---:|---|---|');
for (const [agent] of [...byAgent.entries()].sort((a, b) => b[1] - a[1])) {
  const mine = entries.filter((e) => e.agent === agent);
  out.push(`| ${agent} | ${mine.length} | ${day(mine[0].at)} | ${day(mine[mine.length - 1].at)} |`);
}
out.push('');

out.push('## The record');
out.push('');

let currentDay = null;
for (const e of entries) {
  if (day(e.at) !== currentDay) {
    currentDay = day(e.at);
    out.push(`### ${currentDay}`);
    out.push('');
  }

  // The in-world date leads: it is the axis the chronicle is eventually built
  // on. `≈` marks one the report did not state and the filing time implies.
  const meta = [e.stated ? `**${e.stated}**` : `≈ ${e.derived}`, time(e.at)];
  if (e.stated && e.stated !== e.inWorld) meta.push(`as written: ${e.inWorld}`);
  if (e.withAgents) meta.push(`with ${e.withAgents}`);
  if (e.thread) meta.push(`thread: ${e.thread}`);
  if (e.images) meta.push(`${e.images} image${e.images > 1 ? 's' : ''} withheld`);
  if (e.edited) meta.push('edited');

  out.push(`#### ${e.agent}`);
  out.push('');
  out.push(`<sub>${meta.join(' · ')}</sub>`);
  out.push('');
  out.push(e.body || '*(no text — attachments only)*');
  out.push('');
}

const text = out.join('\n');

// --------------------------------------------------------------- last checks

const lower = text.toLowerCase();

const leaks = [];
for (const s of secrets) {
  const needle = String(s || '');
  if (needle.length < 4) continue;
  if (lower.includes(needle.toLowerCase())) leaks.push(needle);
}
if (/\b\d{17,20}\b/.test(text)) leaks.push('<bare snowflake id>');
if (/https?:\/\//.test(text)) leaks.push('<url>');

if (leaks.length) {
  console.error(`REFUSING TO WRITE — ${leaks.length} identifier(s) survived redaction:`);
  for (const l of leaks.slice(0, 20)) console.error('  ' + l);
  process.exit(1);
}

// Warned, not blocked — see the note where displayNames is built. Whole-word
// only, so the ordinary-English collisions stay quiet and a genuinely unusual
// handle-like name still gets surfaced for a human to look at.
const echoes = [...displayNames].filter((n) => {
  if (!n || n.length < 4) return false;
  const word = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return word.test(text);
});

fs.writeFileSync(OUT, text + '\n');

// ------------------------------------------------------------- working corpus

// The same material with nothing held back for length: every human message,
// reports and the short back-and-forth alike, for the pass that mines events
// out of the record. Events hide in two-line messages — a prisoner escaping, an
// order given — and the published file's length threshold would lose them.
//
// Written to tmp/ because it is a reading aid, not a deliverable: it goes
// through the identical redaction, but it is bulk and it is noisy, and only
// docs/informant-reports.md is meant to be read by anyone but the compiler.
const corpus = ['# Working corpus — every message, redacted', ''];
corpus.push(
  'Not a deliverable. Generated alongside docs/informant-reports.md for the event pass; ' +
    'same redaction, no length filter. `*` marks a message short enough that the ' +
    'published record leaves it out.',
);
corpus.push('');

const everything = raw
  .filter((m) => !m.author.bot)
  .map((m) => {
    const at = new Date(m.timestamp);
    const stated = normaliseStated(redact((m.content || '').match(IN_WORLD_DATE)?.[1] || ''));
    return {
      at,
      agent: m._thread
        ? titleCase(m._source.replace(/\s*reports?\s*$/i, '').trim())
        : agentNames.get(m._file),
      date: stated || `≈ ${derivedDate(at)}`,
      short: (m.content || '').length < SUBSTANCE && !HEADER.test(m.content || ''),
      body: redact(m.content),
    };
  })
  .filter((e) => e.body)
  .sort((a, b) => a.at - b.at);

let corpusDay = null;
for (const e of everything) {
  if (day(e.at) !== corpusDay) {
    corpusDay = day(e.at);
    corpus.push(`## ${corpusDay}`, '');
  }
  corpus.push(`**${e.agent}** · ${e.date} · ${time(e.at)}${e.short ? ' ·*' : ''}`, '');
  corpus.push(e.body, '');
}

const corpusText = corpus.join('\n');
const corpusLeaks = [...secrets].filter(
  (s) => String(s || '').length >= 4 && corpusText.toLowerCase().includes(String(s).toLowerCase()),
);
if (corpusLeaks.length || /\b\d{17,20}\b/.test(corpusText)) {
  console.error('Working corpus failed the same redaction check — not written.');
  process.exit(1);
}
fs.writeFileSync(path.join(IN, '_corpus.md'), corpusText + '\n');

console.log(`${entries.length} reports from ${byAgent.size} informants`);
console.log(`${chatter} conversational messages left out`);
console.log(`${day(first)} -> ${day(last)}`);
console.log(`\nNo handle or account id survived, checked against ${secrets.size} identifiers.`);
if (echoes.length) {
  console.log(
    `${echoes.length} display name(s) also occur as words in the prose, left in as ` +
      `character names: ${echoes.join(', ')}`,
  );
}
console.log(`-> docs/informant-reports.md (${(text.length / 1024).toFixed(0)} KB)`);
