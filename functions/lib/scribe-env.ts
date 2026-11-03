// The Scribe's bindings, and the policy's dependencies built from them. The
// only module that names Cloudflare's types; the policy (scribe.ts, codes.ts,
// report-wizard.ts) sees interfaces and is tested in Node.

import { buildFilerIndex, resolveFiler } from '../../shared/reports';
import { grantFor, memberRoles, postMessage, scribeConfig, type DiscordEnv, type ScribeConfig } from './discord';
import { admitHolder, codeHash, normalizeCode, type Admission } from './codes';
import type { AttemptStore } from './reports';
import type { ScribeDeps } from './scribe';
import { d1CodeStore, d1DraftStore, d1FilingStore } from './scribe-d1';

export interface ScribeEnv extends DiscordEnv {
  /** thalmor-reports: codes, filings, drafts, and the Cabinet's reports. */
  REPORTS?: D1Database;
  /** Secret pepper for code hashes, and (derived) the seal's signing key. */
  CODE_PEPPER?: string;
  /** The gates' attempts KV, for the Scribe's throttles. */
  GATE_ATTEMPTS?: AttemptStore;
}

let config: ScribeConfig | null = null;
export const scribeSettings = (): ScribeConfig => (config ??= scribeConfig());

/** The filing policy's dependencies. `origin` is the site's own address, as the request reached it. */
export function scribeDeps(env: ScribeEnv & { REPORTS: D1Database }, origin: string): ScribeDeps {
  return {
    filings: d1FilingStore(env.REPORTS),
    config: scribeSettings(),
    origin,
    post: (channel, payload) => postMessage(env, channel, payload),
  };
}

export const codeStore = (db: D1Database) => d1CodeStore(db);
export const draftStore = (db: D1Database) => d1DraftStore(db);

/** A code's holder, admitted (or not) by Discord now. */
export async function admitCode(env: ScribeEnv & { REPORTS: D1Database; CODE_PEPPER: string }, offered: string): Promise<Admission> {
  const store = codeStore(env.REPORTS);
  const holder = await store.byHash(await codeHash(env.CODE_PEPPER, normalizeCode(offered)));
  return admitHolder(holder, store, (id) => memberRoles(env, id), (roles) => grantFor(roles, scribeSettings().roles));
}

/** The holder named by a seal, admitted again. */
export async function admitCodeId(env: ScribeEnv & { REPORTS: D1Database }, codeId: number): Promise<Admission> {
  const store = codeStore(env.REPORTS);
  return admitHolder(await store.byId(codeId), store, (id) => memberRoles(env, id), (roles) => grantFor(roles, scribeSettings().roles));
}

/**
 * A member's in-world name, as the reporter resolves a filer's: their Discord
 * handles looked up in the archive's own public roster. Null when the roster
 * cannot be read in time or does not know them.
 */
export async function rosterName(origin: string, user: { username?: string; global_name?: string | null }): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/volumes/roster`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { members?: { name: string; discord: string[] }[] } };
    const members = body.data?.members;
    return Array.isArray(members) ? resolveFiler(user, buildFilerIndex(members)) : null;
  } catch {
    return null;
  }
}
