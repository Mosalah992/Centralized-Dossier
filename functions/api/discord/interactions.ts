// POST /api/discord/interactions: Archivist Ancarion's interactions endpoint,
// ported from the Bruma Joint Archives' (signature check, role map, deferred
// answers) and given the Scribe's two commands:
//
//   /archives code   a personal code for the Scribe Table, shown only to the member
//   /report          the wizard: what, who, when, the body, then the filing as it will be posted
//
// Every other interaction (/clockin, /stock and the quartermaster's others) is
// handed on unchanged to the quartermaster Worker (lib/interactions-relay.ts),
// before anything here that the Scribe needs is consulted, so the
// quartermaster keeps working whether or not the Scribe is configured.
//
// Discord signs every request; anything unsigned is refused before it is read.
// Every answer is ephemeral, so a code or a draft never sits in a channel. A
// member's roles arrive with each interaction, so the wizard reads them live;
// the website asks Discord for them again instead (functions/lib/codes.ts).

import { CATEGORY_INFO, checkFiling, incidentNow } from '../../../shared/filing';
import { codeHash, newCode, normalizeCode } from '../../lib/codes';
import { editOriginal, grantFor, verifyDiscord } from '../../lib/discord';
import { forwardInteraction, isScribeInteraction } from '../../lib/interactions-relay';
import {
  EPHEMERAL,
  RESPOND,
  checkSoFar,
  choose,
  modalBody,
  modalHour,
  modalValues,
  modalWho,
  readCustomId,
  readHour,
  retry,
  stepBody,
  stepPreview,
  stepWhat,
  stepWhen,
  working,
} from '../../lib/report-wizard';
import { DRAFT_LIFETIME_MS, publish, record, type Draft } from '../../lib/scribe';
import { codeStore, draftStore, rosterName, scribeDeps, scribeSettings, type ScribeEnv } from '../../lib/scribe-env';

interface User {
  id: string;
  username: string;
  global_name?: string | null;
}

interface Interaction {
  type: number;
  guild_id?: string;
  member?: { roles: string[]; nick?: string | null; user: User };
  token: string;
  data?: {
    name?: string;
    custom_id?: string;
    values?: string[];
    options?: { name: string }[];
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
}

const PING = 1;
const COMMAND = 2;
const COMPONENT = 3;
const MODAL_SUBMIT = 5;

/** Discord refuses `flags` other than SUPPRESS_EMBEDS on an edit, so it is kept only for a new message. */
const unflagged = ({ flags: _flags, ...rest }: Record<string, unknown>) => rest;

const answer = (type: number, data?: Record<string, unknown>) => Response.json(data === undefined ? { type } : { type, data });
const say = (content: string) => answer(RESPOND.message, working(content));
const update = (payload: Record<string, unknown>) => answer(RESPOND.update, unflagged(payload));
const modal = (payload: Record<string, unknown>) => answer(RESPOND.modal, payload);
const edit = (env: ScribeEnv, token: string, payload: Record<string, unknown>) => editOriginal(env, token, unflagged(payload));

const LAPSED = 'This draft has lapsed: drafts keep for an hour. Begin again with /report.';

interface Env extends ScribeEnv {
  /** Where Ancarion's other interactions go: the quartermaster Worker. */
  QUARTERMASTER_INTERACTIONS_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  // Read once, as bytes: the quartermaster is handed exactly what Discord signed.
  const raw = await request.arrayBuffer();
  const body = new TextDecoder().decode(raw);
  const signature = request.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = request.headers.get('X-Signature-Timestamp') ?? '';
  const signed = env.DISCORD_PUBLIC_KEY && (await verifyDiscord(env.DISCORD_PUBLIC_KEY, signature, timestamp, body));
  if (!signed) return new Response('Bad request signature.', { status: 401 });

  const i = JSON.parse(body) as Interaction;
  if (i.type === PING) return answer(PING);
  if (!isScribeInteraction(i)) {
    return forwardInteraction(env.QUARTERMASTER_INTERACTIONS_URL, i.type, {
      raw,
      signature,
      timestamp,
      contentType: request.headers.get('Content-Type') ?? 'application/json',
    });
  }

  if (!env.REPORTS) return say('The Scribe is not yet consecrated. Ask an administrator.');
  if (!i.member || i.guild_id !== env.DISCORD_GUILD_ID) return say('Use the Scribe inside the Embassy’s own server, where your roles can be read.');
  const db = env.REPORTS;
  // The site's own address, as Discord reached it: the posts link to each parchment there.
  const origin = new URL(request.url).origin;
  const user = i.member.user;
  const grant = grantFor(i.member.roles, scribeSettings().roles);
  const member = grant !== null;

  // ── /archives code ──
  if (i.type === COMMAND && i.data?.name === 'archives') {
    if (i.data.options?.[0]?.name !== 'code') return say('The archive does not know that command.');
    if (!env.CODE_PEPPER) return say('The Scribe Table is not yet consecrated. Ask an administrator.');
    if (!grant) {
      return say(
        'None of your roles holds a commission the Scribe files under. Applications and Public Requests need no code: ' +
          'file them with /report, or at the Scribe Table on https://thalmor-archives.com.',
      );
    }
    const pepper = env.CODE_PEPPER;
    // Reading the roster for the member's in-world name can outlast Discord's
    // three seconds: say "thinking" now and give the code when it is made.
    waitUntil(
      (async () => {
        const name = ((await rosterName(origin, user)) ?? i.member!.nick ?? user.global_name ?? user.username).slice(0, 60);
        const code = newCode();
        await codeStore(db).issue(user.id, await codeHash(pepper, normalizeCode(code)), name, new Date().toISOString());
        await edit(
          env,
          i.token,
          working(
            `**Your code for the Scribe Table**\n\`${code}\`\n\nGive it at the Scribe Table on https://thalmor-archives.com. ` +
              `It fills in **${grant.rank}${grant.office ? `, ${grant.office}` : ''}** and the name **${name}**, which you may change on each filing. ` +
              'Keep it to yourself: asking again replaces it, and it stops working if you leave the server or lose the role.',
          ),
        );
      })().catch((error) => console.warn('scribe: code not issued', error)),
    );
    return answer(RESPOND.deferredMessage, { flags: EPHEMERAL });
  }

  const drafts = draftStore(db);
  const now = new Date();
  const keep = (draft: Draft) =>
    drafts.put(draft, user.id, new Date(now.getTime() + DRAFT_LIFETIME_MS).toISOString(), now.toISOString());

  // ── /report ──
  if (i.type === COMMAND && i.data?.name === 'report') {
    const name = (await codeStore(db).nameFor(user.id)) ?? i.member.nick ?? user.global_name ?? user.username;
    const draft: Draft = { id: crypto.randomUUID(), rank: grant?.rank ?? '', name: name.slice(0, 60), section: null };
    await keep(draft);
    return answer(RESPOND.message, stepWhat(draft, member));
  }

  if (i.type !== COMPONENT && i.type !== MODAL_SUBMIT) return say('The archive does not know that command.');
  const id = readCustomId(i.data?.custom_id ?? '');
  if (!id) return say('The archive does not know that command.');
  const found = await drafts.get(id.draftId, user.id, now.toISOString());
  if (!found) return update(working(LAPSED));
  let draft: Draft = found;

  // ── The modals' answers ──
  if (i.type === MODAL_SUBMIT) {
    const values = modalValues(i.data);
    if (id.step === 'who') {
      draft = { ...draft, rank: values.rank ?? '', name: values.name ?? '', superior: values.superior || null, title: values.title ?? '' };
      const checked = checkSoFar(draft, ['rank', 'name', 'superior', 'title']);
      if (!checked.ok) return update(retry(draft, checked.error, 'who'));
      const { rank, name, superior, title } = checked.filing;
      draft = { ...draft, rank, name, superior, title };
      await keep(draft);
      return update(stepWhen(draft, incidentNow(now.getTime())));
    }
    if (id.step === 'hour') {
      const time = readHour(values, incidentNow(now.getTime()));
      if ('error' in time) return update(retry(draft, time.error, 'hour'));
      draft = { ...draft, time };
      await keep(draft);
      return update(stepBody(draft));
    }
    if (id.step === 'body') {
      draft = { ...draft, body: values.body ?? '' };
      const checked = checkFiling(draft);
      if (!checked.ok) {
        await keep(draft);
        return checked.field === 'body' ? update(retry(draft, checked.error, 'body')) : update(stepWhat(draft, member, checked.error));
      }
      draft = { ...draft, ...checked.value };
      await keep(draft);
      return update(stepPreview(draft, checked.value));
    }
    return update(working(LAPSED));
  }

  // ── The buttons and selects ──
  switch (id.step) {
    case 'cat':
    case 'lvl':
    case 'sec':
      draft = choose(draft, id.step, i.data?.values?.[0], member);
      await keep(draft);
      return update(stepWhat(draft, member));
    case 'edit':
      return update(stepWhat(draft, member));
    case 'next':
    case 'rewho':
      return modal(modalWho(draft));
    case 'now':
      draft = { ...draft, time: incidentNow(now.getTime()) };
      await keep(draft);
      return modal(modalBody(draft));
    case 'hour':
    case 'rehour':
      return modal(modalHour(draft, incidentNow(now.getTime())));
    case 'write':
    case 'rebody':
      return modal(modalBody(draft));
    case 'cancel':
      await drafts.remove(draft.id);
      return update(working('Set aside. Nothing was filed.'));
    case 'file': {
      const checked = checkFiling(draft);
      if (!checked.ok) return update(stepWhat(draft, member, checked.error));
      const filing = checked.value;
      if (!CATEGORY_INFO[filing.category].open && !member) {
        return update(stepWhat(draft, member, 'Only a member of the Embassy may file that. Applications and Public Requests are open to all.'));
      }
      let entry = 0;
      waitUntil(
        (async () => {
          const deps = scribeDeps({ ...env, REPORTS: db }, origin);
          entry = await record(deps, filing, 'discord', user.id);
          await drafts.remove(draft.id);
          const posted = await publish(deps, entry);
          const channel = deps.config.channels[filing.category];
          await edit(
            env,
            i.token,
            working(
              posted && channel
                ? `Filed as **Entry No. ${entry}**, and posted to <#${channel}>.`
                : `Filed as **Entry No. ${entry}**. It is entered in the archive; the bot could not post it to Discord.`,
            ),
          );
        })().catch(async (error) => {
          console.warn('scribe: filing failed', error);
          // Recorded but not announced is still filed; only an unrecorded draft is offered again.
          await edit(
            env,
            i.token,
            entry
              ? working(`Filed as **Entry No. ${entry}**. It is entered in the archive; the bot could not post it to Discord.`)
              : stepWhat(draft, member, 'The Scribe could not file it just now. Try again.'),
          );
        }),
      );
      return answer(RESPOND.deferredUpdate);
    }
    default:
      return update(working(LAPSED));
  }
};
