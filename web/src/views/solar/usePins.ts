// The war table's pieces, as everyone in the Solar sees them: read from
// /api/solar/pins, read again every thirty seconds and whenever the window is
// returned to (so another member's move appears), and changed optimistically:
// a piece moves at once and goes back if the archive refuses.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PinDraft, SolarPin } from '../../../../shared/solar';

export type PinsStatus = 'loading' | 'ready' | 'error' | 'sealed';

const POLL_MS = 30_000;

async function send(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetch(path, {
    method,
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

const refusal = (data: Record<string, unknown>, fallback: string) => (typeof data.error === 'string' ? data.error : fallback);

export interface Pins {
  pins: SolarPin[];
  status: PinsStatus;
  /** The last refusal, for the reader. Cleared by the next success. */
  notice: string;
  dismiss(): void;
  create(draft: PinDraft): Promise<SolarPin | null>;
  update(id: string, patch: Partial<PinDraft>): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}

export function usePins(): Pins {
  const [pins, setPins] = useState<SolarPin[]>([]);
  const [status, setStatus] = useState<PinsStatus>('loading');
  const [notice, setNotice] = useState('');
  // Changes in flight: a poll that lands mid-change would put a moved piece back.
  const inFlight = useRef(0);
  const live = useRef(true);

  const refresh = useCallback(async () => {
    if (inFlight.current > 0) return;
    try {
      const { ok, status: code, data } = await send('/api/solar/pins', 'GET');
      if (!live.current || inFlight.current > 0) return;
      if (code === 401) return setStatus('sealed');
      if (!ok || !Array.isArray(data.pins)) return setStatus((was) => (was === 'ready' ? was : 'error'));
      setPins(data.pins as SolarPin[]);
      setStatus('ready');
    } catch {
      if (live.current) setStatus((was) => (was === 'ready' ? was : 'error'));
    }
  }, []);

  useEffect(() => {
    live.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      live.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const change = useCallback(async <T,>(optimistic: () => void, rollback: () => void, run: () => Promise<T | null>): Promise<T | null> => {
    inFlight.current += 1;
    optimistic();
    try {
      const result = await run();
      if (result === null) rollback();
      else setNotice('');
      return result;
    } catch {
      rollback();
      setNotice('The war table could not be reached. Try again.');
      return null;
    } finally {
      inFlight.current -= 1;
    }
  }, []);

  const create = useCallback(
    async (draft: PinDraft) => {
      const temp: SolarPin = { id: `pending-${Date.now()}`, ...draft, createdAt: '', updatedAt: '' };
      return change(
        () => setPins((all) => [...all, temp]),
        () => setPins((all) => all.filter((p) => p.id !== temp.id)),
        async () => {
          const { ok, status: code, data } = await send('/api/solar/pins', 'POST', draft);
          if (code === 401) setStatus('sealed');
          if (!ok) {
            setNotice(refusal(data, 'The piece could not be set down.'));
            return null;
          }
          const pin = data.pin as SolarPin;
          setPins((all) => all.map((p) => (p.id === temp.id ? pin : p)));
          return pin;
        },
      );
    },
    [change],
  );

  const update = useCallback(
    async (id: string, patch: Partial<PinDraft>) => {
      let before: SolarPin | undefined;
      const done = await change(
        () =>
          setPins((all) =>
            all.map((p) => {
              if (p.id !== id) return p;
              before = p;
              return { ...p, ...patch };
            }),
          ),
        () => setPins((all) => all.map((p) => (p.id === id && before ? before : p))),
        async () => {
          const { ok, status: code, data } = await send(`/api/solar/pins/${id}`, 'PATCH', patch);
          if (code === 401) setStatus('sealed');
          if (!ok) {
            setNotice(refusal(data, 'The piece could not be changed.'));
            return null;
          }
          const pin = data.pin as SolarPin;
          setPins((all) => all.map((p) => (p.id === id ? pin : p)));
          return true;
        },
      );
      return done === true;
    },
    [change],
  );

  const remove = useCallback(
    async (id: string) => {
      let taken: { pin: SolarPin; at: number } | undefined;
      const done = await change(
        () =>
          setPins((all) => {
            const at = all.findIndex((p) => p.id === id);
            if (at >= 0) taken = { pin: all[at]!, at };
            return all.filter((p) => p.id !== id);
          }),
        () =>
          setPins((all) => {
            if (!taken) return all;
            const next = [...all];
            next.splice(taken.at, 0, taken.pin);
            return next;
          }),
        async () => {
          const { ok, status: code, data } = await send(`/api/solar/pins/${id}`, 'DELETE');
          if (code === 401) setStatus('sealed');
          if (!ok && code !== 404) {
            setNotice(refusal(data, 'The piece could not be taken up.'));
            return null;
          }
          return true;
        },
      );
      return done === true;
    },
    [change],
  );

  return { pins, status, notice, dismiss: () => setNotice(''), create, update, remove };
}
