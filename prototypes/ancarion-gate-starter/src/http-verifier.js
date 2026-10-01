/** Same-origin adapter; no credentials or passphrases are persisted client-side. */
export function createHttpVerifier(endpoint = '/api/gate/unlock') {
  const url = new URL(endpoint, window.location.href);
  if (url.origin !== window.location.origin) throw new Error('Use a same-origin gate endpoint.');
  return async (phrase, {signal} = {}) => {
    const response = await fetch(url, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
      headers: {'Content-Type':'application/json'}, body: JSON.stringify({phrase})
    });
    if (response.status === 429) {
      const raw = response.headers.get('Retry-After');
      const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : Math.ceil((Date.parse(raw || '')-Date.now())/1000);
      return {ok:false, retryAfterSeconds:Number.isFinite(seconds) ? Math.max(1, seconds) : 30};
    }
    if (response.status === 401 || response.status === 403) return {ok:false};
    if (!response.ok) throw new Error('Gate service unavailable');
    const body = await response.json();
    if (typeof body?.ok !== 'boolean') throw new Error('Invalid gate response');
    return {ok:body.ok};
  };
}
