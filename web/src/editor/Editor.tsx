// The Archives Editor — the scriptorium.
//
// DEV ONLY, AND STRUCTURALLY SO. This module is reached through a React.lazy
// import that App.tsx only evaluates when `import.meta.env.DEV` is true, and
// the API it talks to lives in a Vite plugin marked `apply: 'serve'`. Neither
// half can appear in a build: Rollup drops the branch, and Vite never runs the
// plugin. test/bundle.test.ts checks the built output for both, because a
// guarantee nobody checks is a guarantee that quietly stops holding.
//
// WHY IT LOOKS LIKE THE ARCHIVE. An editor that looked like a form builder
// would be a different room in the same building, and the person writing a
// chronicle entry would be looking at a text box rather than at a page. The
// entry is set in the volume's own face at the volume's own measure while it is
// typed, so the writer sees roughly what a reader will.
//
// IT WRITES DATA, NOT MODULES. Every save goes to content/*.json; the emitters
// turn those into the TypeScript the app and the Worker import, and they are
// the ones that refuse a volume that has collapsed. The editor never writes a
// module and never deploys — publishing is `npm run volumes:publish` and then
// a deploy you run.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { D, STAGGER, failsafe, gsap, staged } from '../motion';
import './editor.css';

// ── The shapes the editor knows how to edit ────────────────────────────────
//
// A field table per volume rather than a generic JSON tree. A tree would edit
// anything and help with nothing: it cannot know that `kind` is one of ten
// rungs, that `weight` is either absent or the word "grave", or that `text` is
// the only field worth a large box. The cost is that adding a field to a volume
// means adding a line here, which is the right cost — a field nobody described
// is a field the editor would render as a bare string.

type FieldKind = 'line' | 'prose' | 'choice';

interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  choices?: readonly string[];
  /** Shown under the field, in the editor's own voice. */
  hint?: string;
}

const RUNGS = [
  '', 'execution', 'affray', 'arrest', 'interrogation', 'fine',
  'labour', 'release', 'seizure', 'lesser', 'failed',
] as const;

interface Shape {
  /** Which field to show in the list, and which to search on. */
  headline: string;
  secondary: string;
  fields: Field[];
}

const CHRONICLE_ENTRY: Shape = {
  headline: 'date',
  secondary: 'text',
  fields: [
    { key: 'date', label: 'Date', kind: 'line', hint: 'In-world, as the reports reckon it — "Second Seed 4".' },
    { key: 'weight', label: 'Weight', kind: 'choice', choices: ['', 'grave'], hint: 'Grave marks the handful of days the rest of the chronicle turns on.' },
    { key: 'text', label: 'The entry', kind: 'prose' },
  ],
};

const POWER: Shape = {
  headline: 'name',
  secondary: 'note',
  fields: [
    { key: 'name', label: 'Power', kind: 'line' },
    { key: 'note', label: 'As the reports describe it', kind: 'prose' },
  ],
};

const ENFORCEMENT: Shape = {
  headline: 'subject',
  secondary: 'act',
  fields: [
    { key: 'date', label: 'Date', kind: 'line', hint: 'Sorted on this. An unparseable date sinks to the foot of the register.' },
    { key: 'kind', label: 'Rung', kind: 'choice', choices: RUNGS, hint: 'Affray is a death in a fight, not a sentence — see the module note.' },
    { key: 'subject', label: 'The accused', kind: 'line' },
    { key: 'title', label: 'Rank or standing', kind: 'line' },
    { key: 'agent', label: 'Who acted', kind: 'line' },
    { key: 'hand', label: 'The hand it is filed under', kind: 'line', hint: 'Not always ours — a hold or the Legion can be the hand.' },
    { key: 'act', label: 'What was done', kind: 'line' },
    { key: 'method', label: 'How', kind: 'prose' },
    { key: 'outcome', label: 'How it ended', kind: 'prose' },
  ],
};

const HISTORY_ENTRY: Shape = {
  headline: 'date',
  secondary: 'text',
  fields: [
    { key: 'date', label: 'Date', kind: 'line' },
    { key: 'weight', label: 'Weight', kind: 'choice', choices: ['', 'grave'] },
    { key: 'text', label: 'The entry', kind: 'prose' },
  ],
};

const PAPER: Shape = {
  headline: 'name',
  secondary: 'note',
  fields: [
    { key: 'name', label: 'Paper', kind: 'line' },
    { key: 'span', label: 'Surviving issues', kind: 'line' },
    { key: 'staff', label: 'Masthead', kind: 'line' },
    { key: 'note', label: 'Note', kind: 'prose' },
  ],
};

/** A section is one editable list inside a volume. */
interface Section {
  id: string;
  label: string;
  shape: Shape;
  /** Read the list out of the volume's data. */
  get: (data: any) => any[];
  /** Put an edited list back. Returns the new data — never mutates. */
  set: (data: any, rows: any[]) => any;
}

function volumeSections(slug: string, data: any): Section[] {
  if (slug === 'informants') {
    const months: Section[] = (data.months ?? []).map((m: any, i: number) => ({
      id: `month-${i}`,
      label: m.name,
      shape: CHRONICLE_ENTRY,
      get: (d: any) => d.months[i].entries,
      set: (d: any, rows: any[]) => ({
        ...d,
        months: d.months.map((mm: any, j: number) => (j === i ? { ...mm, entries: rows } : mm)),
      }),
    }));
    return [
      ...months,
      {
        id: 'powers',
        label: 'The Powers Arrayed',
        shape: POWER,
        get: (d: any) => d.powers,
        set: (d: any, rows: any[]) => ({ ...d, powers: rows }),
      },
    ];
  }

  if (slug === 'enforcement') {
    return [{
      id: 'records',
      label: 'The register',
      shape: ENFORCEMENT,
      get: (d: any) => d,
      set: (_d: any, rows: any[]) => rows,
    }];
  }

  return [
    { id: 'secondSeed', label: 'Second Seed', shape: HISTORY_ENTRY, get: (d) => d.secondSeed, set: (d, r) => ({ ...d, secondSeed: r }) },
    { id: 'midyear', label: 'Midyear', shape: HISTORY_ENTRY, get: (d) => d.midyear, set: (d, r) => ({ ...d, midyear: r }) },
    { id: 'recall', label: 'The Recall', shape: HISTORY_ENTRY, get: (d) => d.recall, set: (d, r) => ({ ...d, recall: r }) },
    { id: 'papers', label: 'The Presses', shape: PAPER, get: (d) => d.papers, set: (d, r) => ({ ...d, papers: r }) },
  ];
}

// ── The API ────────────────────────────────────────────────────────────────

const api = {
  async volumes() {
    return (await fetch('/__editor/volumes')).json();
  },
  async read(slug: string) {
    const res = await fetch(`/__editor/volume/${slug}`);
    if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
    return res.json();
  },
  async save(slug: string, data: unknown, etag: string) {
    const res = await fetch(`/__editor/volume/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, etag }),
    });
    const body = await res.json();
    if (!res.ok) throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status });
    return body;
  },
  async versions(slug: string) {
    return (await fetch(`/__editor/history/${slug}`)).json();
  },
  async version(slug: string, name: string) {
    return (await fetch(`/__editor/history/${slug}/${name}`)).json();
  },
};

// ── The view ───────────────────────────────────────────────────────────────

interface VolumeCard {
  slug: string;
  title: string;
  file: string;
  sealed: boolean;
  present: boolean;
  bytes: number;
  versions: number;
}

export function EditorView() {
  const [shelf, setShelf] = useState<VolumeCard[] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [etag, setEtag] = useState('');
  const [dirty, setDirty] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [versions, setVersions] = useState<{ name: string; takenAt: string; bytes: number }[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { void api.volumes().then((r) => setShelf(r.volumes)); }, []);

  /*
   * A save that has not happened is worth a browser's own warning. The editor
   * writes to disk and nothing else does; a closed tab with unsaved work in it
   * is the one way this tool loses something.
   */
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sections = useMemo(
    () => (slug && data ? volumeSections(slug, data) : []),
    [slug, data],
  );
  const section = sections.find((s) => s.id === sectionId) ?? sections[0] ?? null;
  const rows: any[] = section ? section.get(data) ?? [] : [];

  const shown = useMemo(() => {
    if (!term.trim()) return rows.map((r, i) => ({ r, i }));
    const needle = term.toLowerCase();
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => Object.values(r).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
      ));
  }, [rows, term]);

  const open = useCallback(async (s: string) => {
    try {
      const got = await api.read(s);
      setSlug(s);
      setData(got.data);
      setEtag(got.etag);
      setSectionId(null);
      setSelected(null);
      setTerm('');
      setDirty(false);
      setNote(null);
      setVersions((await api.versions(s)).versions ?? []);
    } catch (err) {
      setNote({ kind: 'bad', text: (err as Error).message });
    }
  }, []);

  const mutate = useCallback((rowsNext: any[]) => {
    if (!section) return;
    setData((d: any) => section.set(d, rowsNext));
    setDirty(true);
  }, [section]);

  const save = useCallback(async () => {
    if (!slug || !data) return;
    try {
      const res = await api.save(slug, data, etag);
      setEtag(res.etag);
      setDirty(false);
      setVersions((await api.versions(slug)).versions ?? []);
      setNote({ kind: 'ok', text: `Sealed. ${res.bytes.toLocaleString()} bytes written.` });
    } catch (err) {
      const e = err as Error & { status?: number };
      setNote({
        kind: 'bad',
        text: e.status === 409
          ? 'The file changed on disk since you opened it. Reopen the volume before saving, or your edit will bury someone else’s.'
          : e.message,
      });
    }
  }, [slug, data, etag]);

  /* The shelf deals itself out, in the archive's own hand. */
  useGSAP(() => staged(({ moving }) => {
    if (!moving || !shelf) return;
    const cards = gsap.utils.toArray<HTMLElement>('.ed-card');
    if (!cards.length) return;
    const tl = gsap.fromTo(cards,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: D.page, ease: 'draw', stagger: STAGGER.roll, clearProps: 'opacity,transform' });
    const rescue = failsafe(tl);
    return () => { rescue(); tl.kill(); gsap.set(cards, { clearProps: 'opacity,transform' }); };
  }), { dependencies: [shelf], scope: root });

  /* A chosen record is set down rather than swapped in. */
  useGSAP(() => staged(({ moving }) => {
    if (!moving || selected === null) return;
    const form = root.current?.querySelector('.ed-form');
    if (!form) return;
    const tl = gsap.fromTo(form,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: D.hand, ease: 'draw', clearProps: 'opacity,transform' });
    const rescue = failsafe(tl);
    return () => { rescue(); tl.kill(); gsap.set(form, { clearProps: 'opacity,transform' }); };
  }), { dependencies: [selected, sectionId], scope: root });

  if (!shelf) {
    return <div className="ed" ref={root}><p className="ed-waiting">Unlocking the scriptorium…</p></div>;
  }

  // ── The shelf ────────────────────────────────────────────────────────────
  if (!slug || !data) {
    return (
      <div className="ed" ref={root}>
        <Masthead />
        <div className="ed-shelf">
          {shelf.map((v) => (
            <button
              type="button"
              className={`ed-card${v.present ? '' : ' is-missing'}`}
              key={v.slug}
              disabled={!v.present}
              onClick={() => void open(v.slug)}
            >
              <span className="ed-card__title">{v.title}</span>
              <span className="ed-card__file">{v.file}</span>
              <span className="ed-card__meta">
                {v.present ? `${(v.bytes / 1024).toFixed(0)} kB` : 'not on disk'}
                {v.versions > 0 && ` · ${v.versions} saved version${v.versions === 1 ? '' : 's'}`}
              </span>
              {v.sealed && <span className="ed-card__seal">Sealed — never committed</span>}
            </button>
          ))}
        </div>
        <p className="ed-foot">
          Edits are written to <code>content/</code>. Publishing is
          {' '}<code>npm run volumes:publish</code> and a deploy you run — nothing
          here reaches a reader on its own.
        </p>
      </div>
    );
  }

  const volume = shelf.find((v) => v.slug === slug)!;

  return (
    <div className="ed" ref={root}>
      <Masthead />

      <div className="ed-bar">
        <button className="ed-btn" type="button" onClick={() => {
          if (dirty && !window.confirm('This volume has unsaved changes. Leave them?')) return;
          setSlug(null); setData(null); setDirty(false);
        }}>
          ‹ The shelf
        </button>
        <span className="ed-bar__title">{volume.title}</span>
        {dirty && <span className="ed-bar__dirty">unsealed changes</span>}
        <button className="ed-btn" type="button" onClick={() => setShowVersions((v) => !v)}>
          {versions.length} version{versions.length === 1 ? '' : 's'}
        </button>
        <button className="ed-btn ed-btn--seal" type="button" onClick={() => void save()} disabled={!dirty}>
          Seal the volume
        </button>
      </div>

      {note && (
        <p className={`ed-note ed-note--${note.kind}`} role="status">{note.text}</p>
      )}

      {showVersions && (
        <div className="ed-versions">
          <h3>Earlier states</h3>
          {versions.length === 0 && <p className="ed-dim">No saves yet. The first one snapshots what is on disk now.</p>}
          <ul>
            {versions.map((v) => (
              <li key={v.name}>
                <span>{v.takenAt.replace('T', ' ').replace(/\..*/, '')}</span>
                <span className="ed-dim">{(v.bytes / 1024).toFixed(0)} kB</span>
                <button className="ed-btn ed-btn--small" type="button" onClick={async () => {
                  if (!window.confirm('Load this version into the editor? Nothing is written until you seal it.')) return;
                  const got = await api.version(slug, v.name);
                  setData(got.data);
                  setSelected(null);
                  setDirty(true);
                  setNote({ kind: 'ok', text: `Loaded ${v.name}. Nothing written yet — seal it to keep it.` });
                }}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ed-tabs">
        {sections.map((s) => (
          <button
            type="button"
            key={s.id}
            className={`ed-tab${s.id === section?.id ? ' is-on' : ''}`}
            onClick={() => { setSectionId(s.id); setSelected(null); }}
          >
            {s.label}
            <span className="ed-tab__count">{s.get(data)?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="ed-body">
        <div className="ed-list">
          <input
            className="ed-search"
            placeholder="Search this section…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <ol>
            {shown.map(({ r, i }) => (
              <li key={i}>
                <button
                  type="button"
                  className={`ed-row${i === selected ? ' is-on' : ''}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="ed-row__head">{r[section!.shape.headline] || '—'}</span>
                  <span className="ed-row__sub">
                    {String(r[section!.shape.secondary] ?? '').slice(0, 90)}
                  </span>
                  {r.weight === 'grave' && <span className="ed-row__grave" title="grave" />}
                </button>
              </li>
            ))}
          </ol>
          {shown.length === 0 && <p className="ed-dim">Nothing here answers to that.</p>}

          <button className="ed-btn ed-btn--add" type="button" onClick={() => {
            const blank: any = {};
            for (const f of section!.shape.fields) blank[f.key] = '';
            mutate([...rows, blank]);
            setSelected(rows.length);
            setTerm('');
          }}>
            + Add an entry
          </button>
        </div>

        <div className="ed-pane">
          {selected === null || !rows[selected] ? (
            <p className="ed-dim ed-pane__empty">Choose a record, or add one.</p>
          ) : (
            <form className="ed-form" onSubmit={(e) => e.preventDefault()}>
              {section!.shape.fields.map((f) => (
                <label className="ed-field" key={f.key}>
                  <span className="ed-field__label">{f.label}</span>
                  {f.kind === 'choice' ? (
                    <select
                      className="ed-input"
                      value={rows[selected][f.key] ?? ''}
                      onChange={(e) => {
                        const next = rows.map((r, i) => (i === selected
                          ? (() => {
                            const copy = { ...r };
                            // An empty choice removes the key rather than
                            // writing "" — `weight: ''` is not the same shape
                            // as no weight, and the emitter would print it.
                            if (e.target.value) copy[f.key] = e.target.value;
                            else delete copy[f.key];
                            return copy;
                          })()
                          : r));
                        mutate(next);
                      }}
                    >
                      {(f.choices ?? []).map((c) => (
                        <option key={c} value={c}>{c || '— none —'}</option>
                      ))}
                    </select>
                  ) : f.kind === 'prose' ? (
                    <textarea
                      className="ed-input ed-input--prose"
                      rows={10}
                      value={rows[selected][f.key] ?? ''}
                      onChange={(e) => mutate(rows.map((r, i) => (i === selected ? { ...r, [f.key]: e.target.value } : r)))}
                    />
                  ) : (
                    <input
                      className="ed-input"
                      value={rows[selected][f.key] ?? ''}
                      onChange={(e) => mutate(rows.map((r, i) => (i === selected ? { ...r, [f.key]: e.target.value } : r)))}
                    />
                  )}
                  {f.hint && <span className="ed-field__hint">{f.hint}</span>}
                </label>
              ))}

              <Warnings row={rows[selected]} />

              <div className="ed-form__acts">
                <button className="ed-btn" type="button" disabled={selected === 0} onClick={() => {
                  const next = [...rows];
                  [next[selected - 1], next[selected]] = [next[selected], next[selected - 1]];
                  mutate(next); setSelected(selected - 1);
                }}>Move up</button>
                <button className="ed-btn" type="button" disabled={selected >= rows.length - 1} onClick={() => {
                  const next = [...rows];
                  [next[selected], next[selected + 1]] = [next[selected + 1], next[selected]];
                  mutate(next); setSelected(selected + 1);
                }}>Move down</button>
                <button className="ed-btn ed-btn--strike" type="button" onClick={() => {
                  if (!window.confirm('Strike this record from the volume? It survives in the saved versions.')) return;
                  mutate(rows.filter((_, i) => i !== selected));
                  setSelected(null);
                }}>Strike out</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * What the emitters would object to, said before the save rather than after.
 *
 * These are warnings and not blocks: the emitter is the boundary that actually
 * enforces them, and an editor that refuses to hold text you are midway through
 * pasting is an editor you fight. Saying it here means the writer sees it while
 * the entry is in front of them.
 */
function Warnings({ row }: { row: any }) {
  const problems: string[] = [];
  const all = Object.values(row).filter((v) => typeof v === 'string').join('\n');

  if (/[[\]]/.test(all)) problems.push('Square brackets — the volumes render as plain text, so these show as themselves.');
  if (/\*/.test(all)) problems.push('An asterisk. Same reason.');
  if (/```/.test(all)) problems.push('A code fence, carried over from Discord.');
  if (/\b\d{17,20}\b/.test(all)) problems.push('A Discord id. This must not reach a reader.');
  if (/https?:\/\//.test(all)) problems.push('A link. Signed Discord URLs encode channel and attachment ids.');
  if (/<@!?\d+>|<#\d+>/.test(all)) problems.push('Mention markup, carried over from Discord.');

  if (!problems.length) return null;
  return (
    <ul className="ed-warn">
      {problems.map((p) => <li key={p}>{p}</li>)}
    </ul>
  );
}

function Masthead() {
  return (
    <header className="ed-mast">
      <p className="ed-mast__over">Third Aldmeri Dominion</p>
      <h1 className="ed-mast__title">The Archives Editor</h1>
      <p className="ed-mast__sub">Scriptorium of the Thalmor Embassy · local, and not deployed</p>
    </header>
  );
}
