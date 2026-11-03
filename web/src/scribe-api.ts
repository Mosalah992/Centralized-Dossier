// The Scribe Table's calls to /api/scribe/*. Every answer is the server's own
// words (in-world), so an error is shown as it came; only a failure to reach
// the server at all is worded here.

import type { FiledAnswer, Filing, FilingField, ScribeHolder } from '../../shared/filing';

export type Refusal = { ok: false; error: string; field?: FilingField; status?: number };

const UNREACHABLE = 'The Scribe cannot be reached just now. Try again shortly.';

async function call(path: string, method: string, body?: unknown): Promise<Response | null> {
  try {
    return await fetch(path, {
      method,
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

async function refusal(res: Response | null): Promise<Refusal> {
  if (!res) return { ok: false, error: UNREACHABLE };
  try {
    const body = (await res.json()) as { error?: string; field?: FilingField };
    return { ok: false, error: body.error ?? UNREACHABLE, field: body.field, status: res.status };
  } catch {
    return { ok: false, error: UNREACHABLE, status: res.status };
  }
}

/** Who the seal names now, or null; `absent` when the Scribe Table is not consecrated. */
export async function sealHolder(): Promise<{ holder: ScribeHolder | null; error?: string } | 'absent'> {
  const res = await call('/api/scribe/seal', 'GET');
  if (!res || res.status === 404 || res.status === 503) return 'absent';
  try {
    return (await res.json()) as { holder: ScribeHolder | null; error?: string };
  } catch {
    return 'absent';
  }
}

export async function giveCode(code: string): Promise<{ ok: true; holder: ScribeHolder } | Refusal> {
  const res = await call('/api/scribe/seal', 'POST', { code });
  if (!res?.ok) return refusal(res);
  return { ok: true, holder: ((await res.json()) as { holder: ScribeHolder }).holder };
}

export async function returnSeal(): Promise<void> {
  await call('/api/scribe/seal', 'DELETE');
}

export async function fileFiling(filing: Filing): Promise<{ ok: true; filed: FiledAnswer } | Refusal> {
  const res = await call('/api/scribe/file', 'POST', { filing });
  if (!res?.ok) return refusal(res);
  return { ok: true, filed: (await res.json()) as FiledAnswer };
}
