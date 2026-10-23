// The realm map, taken up from the war table and spread out: Skyrim with the
// County Bruma chart laid at its southern edge (scripts/prepare-solar-map.mjs).
//
// It pans and zooms by hand, without a library: drag to move it, the wheel or
// a pinch to zoom about the pointer, or the arrow keys, + and − and 0 from the
// keyboard. Pieces are set down from the tray (a Dominion pawn, or a point of
// interest), dragged to move them (or nudged with Shift and the arrows), and
// opened in the ledger at the side to rename, annotate or take up. Every
// change is shared with the rest of the Solar (usePins).
//
// Pieces stand at fractions of the map, so they keep their place at any zoom,
// and are drawn at one size whatever the zoom, as pieces on a table are. The
// map is laid out at its zoomed size rather than scaled, so nothing on it is
// ever an enlarged picture of itself.

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';

import mapUrl from '../../assets/solar/realm-map.webp';
import { PIN_INFO, PIN_KINDS, PIN_LIMITS, type PinKind, type SolarPin } from '../../../../shared/solar';
import { PinMark } from './art';
import type { Pins } from './usePins';

/** The combined map's own proportions (1448 x 1086; scripts/prepare-solar-map.mjs). */
export const MAP_ASPECT = 1448 / 1086;
const MIN_ZOOM = 1;
/** As deep as the map holds up: its image is three times the source's size (scripts/prepare-solar-map.mjs). */
const MAX_ZOOM = 4;
/** Pointer travel, in pixels, before a press becomes a drag. */
const SLOP = 4;
/** A Shift+arrow nudge, as a fraction of the map. */
const NUDGE = 0.003;

interface View {
  s: number;
  tx: number;
  ty: number;
}

interface Props {
  pins: Pins;
  /** A piece to open the map on, centred and close. */
  focus?: string | null;
  onClose: () => void;
}

export function MapViewer({ pins, focus = null, onClose }: Props) {
  const titleId = useId();
  const helpId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [placing, setPlacing] = useState<PinKind | null>(null);
  const [draft, setDraft] = useState<{ kind: PinKind; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(focus);
  const [held, setHeld] = useState<{ id: string; x: number; y: number } | null>(null);

  // The map at zoom 1: the whole of it, fitted to the stage.
  const base = useMemo(() => {
    if (!box.w || !box.h) return { w: 0, h: 0 };
    return box.w / box.h > MAP_ASPECT ? { w: box.h * MAP_ASPECT, h: box.h } : { w: box.w, h: box.w / MAP_ASPECT };
  }, [box]);

  // Read by the handlers, which must not be rebuilt on every frame of a drag.
  const live = useRef({ box, base, view });
  live.current = { box, base, view };

  /** Keep the map on the stage: centred while it is smaller, edge to edge when larger. */
  const settle = useCallback((v: View): View => {
    const { box: b, base: m } = live.current;
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s));
    const mw = m.w * s;
    const mh = m.h * s;
    const tx = mw <= b.w ? (b.w - mw) / 2 : Math.min(0, Math.max(b.w - mw, v.tx));
    const ty = mh <= b.h ? (b.h - mh) / 2 : Math.min(0, Math.max(b.h - mh, v.ty));
    return { s, tx, ty };
  }, []);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) =>
      setView((v) => {
        const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s * factor));
        const k = s / v.s;
        return settle({ s, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k });
      }),
    [settle],
  );

  const centreOn = useCallback(
    (x: number, y: number, s: number) => {
      const { box: b, base: m } = live.current;
      setView(settle({ s, tx: b.w / 2 - x * m.w * s, ty: b.h / 2 - y * m.h * s }));
    },
    [settle],
  );

  // The stage's size, and the map refitted whenever it changes.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const opened = useRef(false);
  useEffect(() => {
    if (!base.w) return;
    const target = focus ? pins.pins.find((p) => p.id === focus) : undefined;
    if (!opened.current && target) centreOn(target.x, target.y, 3);
    else setView((v) => settle(v));
    opened.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.w, base.h]);

  // The stage has the reader's attention as the map opens.
  useEffect(() => {
    stage.current?.focus({ preventScroll: true });
  }, []);

  /** A point on the stage as a fraction of the map. */
  const toMap = (px: number, py: number) => {
    const { base: m, view: v } = live.current;
    return {
      x: Math.min(1, Math.max(0, (px - v.tx) / (m.w * v.s))),
      y: Math.min(1, Math.max(0, (py - v.ty) / (m.h * v.s))),
    };
  };
  const local = (event: { clientX: number; clientY: number }) => {
    const rect = stage.current!.getBoundingClientRect();
    return { px: event.clientX - rect.left, py: event.clientY - rect.top };
  };

  const setDown = (x: number, y: number) => {
    if (!placing) return;
    setDraft({ kind: placing, x, y });
    setSelected(null);
    setPlacing(null);
  };

  // ── Moving the map: drag, pinch, wheel ──────────────────────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; spread: number } | null>(null);

  const onStageDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { px, py } = local(event);
    pointers.current.set(event.pointerId, { x: px, y: py });
    const all = [...pointers.current.values()];
    gesture.current = {
      moved: gesture.current?.moved ?? false,
      startX: px,
      startY: py,
      spread: all.length === 2 ? Math.hypot(all[0]!.x - all[1]!.x, all[0]!.y - all[1]!.y) : 0,
    };
  };

  const onStageMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    const g = gesture.current;
    if (!last || !g) return;
    const { px, py } = local(event);
    pointers.current.set(event.pointerId, { x: px, y: py });
    const all = [...pointers.current.values()];
    if (all.length === 2) {
      const [a, b] = all as [{ x: number; y: number }, { x: number; y: number }];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.spread > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, spread / g.spread);
      g.spread = spread;
      g.moved = true;
      return;
    }
    if (!g.moved && Math.hypot(px - g.startX, py - g.startY) < SLOP) return;
    g.moved = true;
    setView((v) => settle({ ...v, tx: v.tx + (px - last.x), ty: v.ty + (py - last.y) }));
  };

  const onStageUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g || g.moved) return;
    const { px, py } = local(event);
    if (placing) {
      const { x, y } = toMap(px, py);
      setDown(x, y);
    } else {
      setSelected(null);
    }
  };

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const lines = event.deltaMode === 1 ? 32 : 1;
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * lines * 0.0016));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const zoomCentre = (factor: number) => zoomAt(live.current.box.w / 2, live.current.box.h / 2, factor);
  const reset = () => setView(settle({ s: 1, tx: 0, ty: 0 }));

  const onStageKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const step = 70;
    const pan = (dx: number, dy: number) => setView((v) => settle({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
    switch (event.key) {
      case 'ArrowLeft': pan(step, 0); break;
      case 'ArrowRight': pan(-step, 0); break;
      case 'ArrowUp': pan(0, step); break;
      case 'ArrowDown': pan(0, -step); break;
      case '+': case '=': zoomCentre(1.3); break;
      case '-': case '_': zoomCentre(1 / 1.3); break;
      case '0': reset(); break;
      case 'Enter': case ' ': {
        if (!placing) return;
        const { x, y } = toMap(live.current.box.w / 2, live.current.box.h / 2);
        setDown(x, y);
        break;
      }
      default: return;
    }
    event.preventDefault();
  };

  // ── Moving a piece: drag it, or Shift and the arrows ────────────────────
  // Where on the piece it was taken hold of, so it does not jump to the pointer.
  const pieceDrag = useRef<{ id: string; startX: number; startY: number; dx: number; dy: number; moved: boolean } | null>(null);
  const nudgeTimer = useRef(0);

  const heldAt = (event: { clientX: number; clientY: number }, d: { dx: number; dy: number }) => {
    const { px, py } = local(event);
    const at = toMap(px, py);
    return { x: Math.min(1, Math.max(0, at.x + d.dx)), y: Math.min(1, Math.max(0, at.y + d.dy)) };
  };

  const onPieceDown = (event: ReactPointerEvent<HTMLButtonElement>, pin: SolarPin) => {
    event.stopPropagation();
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { px, py } = local(event);
    const at = toMap(px, py);
    pieceDrag.current = { id: pin.id, startX: event.clientX, startY: event.clientY, dx: pin.x - at.x, dy: pin.y - at.y, moved: false };
  };
  const onPieceMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = pieceDrag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < SLOP) return;
    d.moved = true;
    setHeld({ id: d.id, ...heldAt(event, d) });
  };
  const onPieceUp = (event: ReactPointerEvent<HTMLButtonElement>, pin: SolarPin) => {
    event.stopPropagation();
    const d = pieceDrag.current;
    pieceDrag.current = null;
    if (!d) return;
    if (d.moved) {
      const to = heldAt(event, d);
      setHeld(null);
      void pins.update(pin.id, to);
    } else {
      setDraft(null);
      setSelected((was) => (was === pin.id ? null : pin.id));
    }
  };
  const onPieceKey = (event: React.KeyboardEvent<HTMLButtonElement>, pin: SolarPin) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-NUDGE, 0], ArrowRight: [NUDGE, 0], ArrowUp: [0, -NUDGE], ArrowDown: [0, NUDGE] };
    const move = step[event.key];
    if (!move || !event.shiftKey) return;
    event.preventDefault();
    const from = held?.id === pin.id ? held : pin;
    const next = { id: pin.id, x: Math.min(1, Math.max(0, from.x + move[0])), y: Math.min(1, Math.max(0, from.y + move[1])) };
    setHeld(next);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      setHeld(null);
      void pins.update(pin.id, { x: next.x, y: next.y });
    }, 600);
  };
  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  // Escape steps back one thing at a time, and only then closes the map.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (draft) setDraft(null);
      else if (placing) setPlacing(null);
      else if (selected) setSelected(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, placing, selected, onClose]);

  const chosen = selected ? pins.pins.find((p) => p.id === selected) ?? null : null;
  // The map is laid out at its zoomed size, not stretched by a transform: the
  // browser then draws it from the full image at every zoom, and the pieces
  // and their names are drawn afresh at their own size instead of being blown
  // up with it.
  const layer = { width: base.w * view.s, height: base.h * view.s, transform: `translate(${view.tx}px, ${view.ty}px)` };

  return (
    <div className="map-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="map-viewer__bar">
        <h2 id={titleId} className="map-viewer__title">
          The Realm <span>Skyrim and County Bruma</span>
        </h2>
        <div className="map-tray" role="group" aria-label="Set down a piece">
          {PIN_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="map-tray__piece"
              aria-pressed={placing === kind}
              onClick={() => {
                setDraft(null);
                setSelected(null);
                setPlacing((was) => (was === kind ? null : kind));
                stage.current?.focus({ preventScroll: true });
              }}
            >
              <PinMark kind={kind} size={22} />
              {PIN_INFO[kind].name}
            </button>
          ))}
        </div>
        <div className="map-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomCentre(1 / 1.4)} aria-label="Zoom out" disabled={view.s <= MIN_ZOOM}>
            −
          </button>
          <button type="button" onClick={reset} aria-label="Show the whole map">
            ⤢
          </button>
          <button type="button" onClick={() => zoomCentre(1.4)} aria-label="Zoom in" disabled={view.s >= MAX_ZOOM}>
            +
          </button>
        </div>
        <button type="button" className="map-viewer__close" onClick={onClose} aria-label="Lay the map back on the table">
          ×
        </button>
      </header>

      <div className="map-viewer__body">
        <div
          ref={stage}
          className="map-stage"
          tabIndex={0}
          data-placing={placing ?? undefined}
          data-zoomed={view.s > 1.01 || undefined}
          aria-describedby={helpId}
          onPointerDown={onStageDown}
          onPointerMove={onStageMove}
          onPointerUp={onStageUp}
          onPointerCancel={onStageUp}
          onKeyDown={onStageKey}
        >
          <p id={helpId} className="sr-only">
            Drag or use the arrow keys to move the map; scroll, pinch, or press plus and minus to zoom. Choose a piece from
            the tray, then press the map, or Enter, to set it down at that place. Shift and the arrow keys move a piece.
          </p>
          <div className="map-layer" style={layer}>
            <img className="map-layer__img" src={mapUrl} alt="" draggable={false} decoding="async" />
            {pins.pins.map((pin) => {
              const at = held?.id === pin.id ? held : pin;
              return (
                <button
                  key={pin.id}
                  type="button"
                  className="map-pin"
                  data-kind={pin.kind}
                  data-selected={selected === pin.id || undefined}
                  data-held={held?.id === pin.id || undefined}
                  style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                  aria-label={`${PIN_INFO[pin.kind].name}: ${pin.label}`}
                  aria-pressed={selected === pin.id}
                  onPointerDown={(event) => onPieceDown(event, pin)}
                  onPointerMove={onPieceMove}
                  onPointerUp={(event) => onPieceUp(event, pin)}
                  onKeyDown={(event) => onPieceKey(event, pin)}
                  onClick={(event) => {
                    // A keyboard press; a pointer press is handled on pointerup.
                    if (event.detail !== 0) return;
                    setDraft(null);
                    setSelected((was) => (was === pin.id ? null : pin.id));
                  }}
                >
                  <PinMark kind={pin.kind} />
                  <span className="map-pin__label">{pin.label}</span>
                </button>
              );
            })}
            {draft && (
              <span className="map-pin map-pin--draft" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, transform: 'translate(-50%, -100%)' }} aria-hidden="true">
                <PinMark kind={draft.kind} />
              </span>
            )}
          </div>
          {placing && <p className="map-stage__hint" aria-hidden="true">Press the map where the {PIN_INFO[placing].name.toLowerCase()} stands</p>}
        </div>

        {draft && (
          <DraftCard
            key={`${draft.x}-${draft.y}`}
            kind={draft.kind}
            onCancel={() => setDraft(null)}
            onSave={async (label, note) => {
              const pin = await pins.create({ kind: draft.kind, x: draft.x, y: draft.y, label, note });
              setDraft(null);
              if (pin) setSelected(pin.id);
            }}
          />
        )}
        {!draft && chosen && (
          <PieceCard
            key={chosen.id}
            pin={chosen}
            onClose={() => setSelected(null)}
            onSave={(label, note) => pins.update(chosen.id, { label, note })}
            onRemove={async () => {
              if (await pins.remove(chosen.id)) setSelected(null);
            }}
          />
        )}
      </div>

      {pins.notice && (
        <p className="map-viewer__notice" role="alert">
          {pins.notice}
          <button type="button" onClick={pins.dismiss}>
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}

function PieceFields({ label, note, onLabel, onNote }: { label: string; note: string; onLabel: (v: string) => void; onNote: (v: string) => void }) {
  const labelId = useId();
  const noteId = useId();
  return (
    <>
      <label className="map-card__label" htmlFor={labelId}>
        Name
      </label>
      <input
        id={labelId}
        className="map-card__input"
        value={label}
        maxLength={PIN_LIMITS.label}
        required
        autoFocus
        onChange={(event) => onLabel(event.target.value)}
      />
      <label className="map-card__label" htmlFor={noteId}>
        Note <span>(optional)</span>
      </label>
      <textarea
        id={noteId}
        className="map-card__input map-card__input--note"
        value={note}
        maxLength={PIN_LIMITS.note}
        rows={4}
        onChange={(event) => onNote(event.target.value)}
      />
    </>
  );
}

function DraftCard({ kind, onSave, onCancel }: { kind: PinKind; onSave: (label: string, note: string) => Promise<void>; onCancel: () => void }) {
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    await onSave(label.trim(), note.trim());
  };
  return (
    <aside className="map-card parchment" aria-label={`New ${PIN_INFO[kind].name.toLowerCase()}`}>
      <form onSubmit={submit} className="map-card__form">
        <p className="map-card__kind">
          <PinMark kind={kind} size={22} /> {PIN_INFO[kind].name}
        </p>
        <PieceFields label={label} note={note} onLabel={setLabel} onNote={setNote} />
        <div className="map-card__actions">
          <button type="submit" className="btn" disabled={!label.trim() || busy}>
            Set it down
          </button>
          <button type="button" className="btn btn--quiet" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </aside>
  );
}

function PieceCard({ pin, onSave, onRemove, onClose }: { pin: SolarPin; onSave: (label: string, note: string) => Promise<boolean>; onRemove: () => Promise<void>; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [label, setLabel] = useState(pin.label);
  const [note, setNote] = useState(pin.note);
  const pending = pin.id.startsWith('pending-');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    if (await onSave(label.trim(), note.trim())) setEditing(false);
  };

  return (
    <aside className="map-card parchment" aria-label={`${PIN_INFO[pin.kind].name}: ${pin.label}`}>
      <p className="map-card__kind">
        <PinMark kind={pin.kind} size={22} /> {PIN_INFO[pin.kind].name}
      </p>
      {editing ? (
        <form onSubmit={submit} className="map-card__form">
          <PieceFields label={label} note={note} onLabel={setLabel} onNote={setNote} />
          <div className="map-card__actions">
            <button type="submit" className="btn" disabled={!label.trim()}>
              Save
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <h3 className="map-card__name">{pin.label}</h3>
          {pin.note ? <p className="map-card__note">{pin.note}</p> : <p className="map-card__note map-card__note--none">No note.</p>}
          {confirming ? (
            <div className="map-card__actions" role="group" aria-label="Take this piece up?">
              <span className="map-card__ask">Take it up for everyone?</span>
              <button type="button" className="btn" onClick={() => void onRemove()}>
                Take it up
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <div className="map-card__actions">
              <button type="button" className="btn" onClick={() => setEditing(true)} disabled={pending}>
                Edit
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setConfirming(true)} disabled={pending}>
                Take up
              </button>
              <button type="button" className="btn btn--quiet" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
