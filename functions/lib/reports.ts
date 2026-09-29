// Pure Reports gate policy. Keeping the decision points here makes the sealed
// route testable without pulling Cloudflare's Pages types into the browser-test
// TypeScript project.

import {
  REPORTS_SCOPE,
  readWrit,
  secretsMatch,
} from './session';

export interface AttemptStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export const REPORTS_MAX_ATTEMPTS = 8;
export const REPORTS_ATTEMPT_WINDOW_SECONDS = 600;
export const reportsAttemptKey = (ip: string) => `reports:${ip}`;

export async function reportsThrottled(store: AttemptStore | undefined, ip: string): Promise<boolean> {
  if (!store) return false;
  return Number((await store.get(reportsAttemptKey(ip))) ?? '0') >= REPORTS_MAX_ATTEMPTS;
}

export async function recordReportsFailure(store: AttemptStore | undefined, ip: string): Promise<void> {
  if (!store) return;
  const key = reportsAttemptKey(ip);
  const count = Number((await store.get(key)) ?? '0') + 1;
  await store.put(key, String(count), { expirationTtl: REPORTS_ATTEMPT_WINDOW_SECONDS });
}

export const reportsPassphraseMatches = (secret: string, offered: string, expected: string) =>
  secretsMatch(secret, offered, expected);

export const hasReportsWrit = (secret: string, epoch: number, token: string | null) =>
  readWrit(secret, epoch, token, REPORTS_SCOPE);
