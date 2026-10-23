// History of the Realm — the one volume the Embassy writes rather than reads,
// bound as a book like every volume on the shelf (2026-10-23; BoundBook).
//
// Its account is assembled from two sources, and they are kept apart in the
// book because they are not the same kind of evidence. The first is the free
// presses of Skyrim: four papers whose surviving issues cover Second Seed 1 to
// Midyear 15 of 4E 216. The second is the Embassy's own posted notices of
// Heartfire 4E 226, ten years on — transcribed from the boards they were nailed
// to, and therefore testimony rather than reportage. A notice is the Embassy
// speaking about itself; the volume says so where it prints one. The text is
// held here rather than in the roster sheet: it is settled history, and a grid
// of cells is the wrong shape for it. There is no tab behind this volume and no
// API call for it; it cannot be withdrawn, and it reads the same when the
// sheet is down.
//
// Where the presses contradict each other, the contradiction is kept and
// marked. An archive that quietly picks a winner is editing, not recording.

import { useCallback } from 'react';

import sealUrl from '../assets/gate-seal.webp';
import { bindBlocks, type BookBlock } from '../books/bind';
import { BoundBook } from '../books/BoundBook';
import { TitlePage, type Leaf } from '../books/leaves';
import { mark, prose } from '../reading';
import { type Entry, MIDYEAR, PAPERS, RECALL, RECALL_NOTICE, SECOND_SEED } from './history-data';

const entries = (list: Entry[]): BookBlock[] =>
  list.map((entry) => ({ kind: 'entry', label: entry.date, text: entry.text, grave: entry.weight === 'grave' }));

const BLOCKS: BookBlock[] = [
  { kind: 'chapter', text: 'Before the Chronicle' },
  {
    kind: 'para',
    text:
      'Five and twenty years have passed since the Stormcloaks first rose. They took Solitude once and held it briefly: the killing of Vittoria Vici and of Emperor Titus Mede II ended the Elder Council’s restraint, and a fully equipped veteran Legion was committed to Skyrim. Against a true Legion, Ulfric’s armies were crushed.',
  },
  {
    kind: 'para',
    text:
      'The Empire dismantled the rebellion, occupied the holds, and imposed a martial reconstruction that has run for decades. Then its priorities moved on. With the province secure and a standing army so far from Cyrodiil proving expensive, the Council withdrew its elites and left a cheaper occupation behind them — a patchwork auxiliary legion of local recruits, mercenaries, and a handful of Imperial officers.',
  },
  {
    kind: 'para',
    text:
      'The Stormcloak spirit did not die with the rebellion. What survived reorganised into an insurgency of small cells, hidden camps and fighters scattered through the mountains, and after years of quiet it has begun striking again with coordinated precision. The auxiliary legion, undertrained and politically hamstrung, is struggling to hold what the Empire believed was settled.',
  },
  {
    kind: 'para',
    aside: true,
    text:
      'The presses count those years themselves. The Riften Courier opens its account of Thundercaller’s bid with the words “exactly twenty-five years after civil war tore our lands apart.”',
  },

  { kind: 'chapter', text: 'The Chronicle, 4E 216' },
  { kind: 'heading', text: 'Second Seed' },
  ...entries(SECOND_SEED),
  { kind: 'heading', text: 'Midyear' },
  ...entries(MIDYEAR),

  { kind: 'chapter', text: 'The Road to War' },
  {
    kind: 'para',
    text:
      'Read together, the four presses tell one story, and it is not the werewolves that fill their front pages. An insurgency testing a weak occupation is a slow problem. A hold’s military slaughtering an allied clan under a peace banner, with an Imperial order behind it, is a cause.',
  },
  {
    kind: 'list',
    ordered: true,
    items: [
      'The Vashu’agra are barred from Whiterun and Solitude over crimes they insist were the work of impostors and of two exiles they had taken in and since disavowed. They ask repeatedly for reconciliation.',
      'Their bloodkin Kit’ra Fernwind is arrested. The clan mobilises; Housecarl Kobra brokers her release for banishment.',
      'On the three and twentieth they are invited to Solitude for formal peace talks. Their leaders are admitted; their guard is barred outside.',
      'Whiterun’s guards surround them and the order is given. The Chieftain is killed, the leadership annihilated, and the guards are reported to begin removing helmets and calling for the death of any Orsimir present, whatever their affiliation.',
      'Windhelm and Riften, the clan’s long allies, are outraged. Within three days their combined host stands at Solitude’s gates and Thundercaller declares for High King in the name of Talos.',
      'By Midyear the Empire has dissolved Riften’s court and the Legion has assaulted the Palace of the Kings on three fronts — and lost.',
    ],
  },
  {
    kind: 'para',
    aside: true,
    text:
      'The Courier’s own judgement: unlike the conflict of five and twenty years prior, this would be a brutal, geographic affair between the polar ends of the province.',
  },

  { kind: 'chapter', text: 'The Dominion in the Public Eye' },
  {
    kind: 'para',
    text:
      'The Embassy records these as they were printed, favourable and otherwise. A register that kept only the flattering half would be worth nothing to whoever reads it next.',
  },
  {
    kind: 'field',
    label: 'As defenders',
    text:
      'At the Siege of Solitude the Tribune credits the Thalmor with reinforcing the city gates and holding the frontline, and with taking Faric of Highrock for questioning afterwards.',
  },
  {
    kind: 'field',
    label: 'As the attacked',
    text:
      'On the tenth of Second Seed the Sons of Skyrim fell upon the Embassy itself at first light. Kyne’s Host rode within the hour to defend the city and their diplomatic allies both, and stood with the Embassy’s own on the hill; their ringleader was taken alive and answered for it in Holmgang. Three days before, a farmer at Riften had gone to the block for raising an assassins’ guild against the Dominion. Whatever else the presses say of us, they record a month in which we were hunted, and in which Nords died at our side.',
  },
  {
    kind: 'field',
    label: 'As suspects',
    text:
      'The Riften Courier reports a rumour, championed by a premier monster-hunting guild, that the Thalmor orchestrate the werewolf surge. The paper is openly sceptical of it, while noting that anti-Dominion groups are turning rural grief into recruitment.',
  },
  {
    kind: 'field',
    label: 'As creditors',
    text:
      'An Aldmeri diplomat offers any citizen of the Dominion safekeeping of their coin for ten gold a month, with a Thalmor escort for purchases above two hundred septims. The Courier records that Riften’s citizens are rightfully sceptical.',
  },
  {
    kind: 'field',
    label: 'As peacekeepers',
    text:
      'The Haafingar Gazette places the Second Emissary and his entourage at the Khajiit Pilgrimage of the Moons in the Reach, keeping the peace, on the night the sealed temple opened to them.',
  },

  { kind: 'chapter', text: 'The Recall, 4E 226' },
  {
    kind: 'para',
    text:
      'Ten years on, the war the presses saw coming has been fought and settled against the Empire: the Legion is expelled, Skyrim is united and independent, and the Embassy stands in a province that no longer has an Imperial reason to tolerate it. Through those weeks Alinor did not answer. Then, within seven days, it answered entirely — with a recall, a dissolution and a reformation.',
  },
  {
    kind: 'para',
    text:
      'What follows is not the presses. These are the Embassy’s own notices, posted on its own boards and signed by the officers who gave them, transcribed here as they were written. They are testimony, not reportage, and they are kept apart from the chronicle above for that reason. A notice records what the Embassy declared on a given day. Whether the declaration held is a question the record cannot answer about itself.',
  },
  ...entries(RECALL),

  // Alinor's answer, set as a document rather than as an entry: it is the only
  // thing in this volume that was sent TO the Embassy.
  { kind: 'chapter', text: 'The Notice of Recall' },
  {
    kind: 'custom',
    weight: RECALL_NOTICE.join(' ').length + 220,
    items: [{ label: 'Notice of Recall', text: RECALL_NOTICE.join(' ') }],
    render: (term, guided) => (
      <figure className="chron-writ">
        <figcaption className="chron-writ__head">
          <span className="chron-writ__kind">Notice of Recall</span>
          <span className="chron-writ__from">From Alinor, to the former personnel of the Embassy</span>
        </figcaption>
        {RECALL_NOTICE.map((para, i) => (
          <p className={i === 0 ? 'chron-writ__p chron-writ__p--salutation' : 'chron-writ__p'} key={para.slice(0, 32)}>
            {prose(para, term, guided)}
          </p>
        ))}
        <p className="chron-writ__sign">
          Signed,
          <br />
          <strong>High Emmissary Oriwyneth</strong>
        </p>
      </figure>
    ),
  },
  {
    kind: 'para',
    aside: true,
    text:
      'The notice is transcribed as it was written, errors and all — antithecal, Condordat, Emmissary, and a sentence in the fifth paragraph that stops at “before .” with the name never entered. A transcription that quietly corrects a document stops being evidence of it. The Embassy holds no date for its arrival; it names its readers former personnel and Skyrim a rebel province, so it cannot predate the province’s independence.',
  },
  {
    kind: 'para',
    aside: true,
    text:
      'One reading is worth setting down and not asserting. The notice condemns the raising of Khajiit and Bosmer to stations above Altmer; the Restructure of the five and twentieth removed them from every command position. Whether the Embassy was answering this letter or anticipating it, the record does not say.',
  },
  {
    kind: 'para',
    aside: true,
    text:
      'Two of these notices are answered by a later one, and the archive keeps both rather than choosing. On the one and twentieth the Embassy filed a recovery order against the estate of House Velrith; on the five and twentieth House Velrith was declared not to exist within the Dominion. The claim and the house it was made against were dissolved in the same week. And the office of First Emissary, abolished on the five and twentieth and never to be filled again, is the office in whose name the Hall of Honor is still kept.',
  },

  { kind: 'chapter', text: 'The Presses' },
  ...PAPERS.map(
    (paper): BookBlock => ({
      kind: 'custom',
      weight: paper.note.length + paper.staff.length + 160,
      items: [{ label: paper.name, text: `${paper.span}. ${paper.staff}. ${paper.note}` }],
      render: (term, guided) => (
        <div className="chron-press">
          <h3 className="chron-h3">{mark(paper.name, term)}</h3>
          <p className="chron-press__span">{mark(paper.span, term)}</p>
          <p className="chron-press__staff">{mark(paper.staff, term)}</p>
          <p className="chron-p">{prose(paper.note, term, guided)}</p>
        </div>
      ),
    }),
  ),
];

function buildLeaves(term: string, guided: boolean): Leaf[] {
  return [
    {
      head: '',
      body: (
        <TitlePage
          kicker="Thalmor Embassy"
          name="Realm History"
          by="As recorded by the free presses of Skyrim, and by the Embassy’s own hand."
          span="Second Seed, 4E 216 — Heartfire, 4E 226"
        />
      ),
    },
    ...bindBlocks(BLOCKS, term, guided),
    {
      head: 'Colophon',
      body: (
        <div className="chron-colophon">
          <h2 className="chron-h">Colophon</h2>
          <p className="chron-p">
            Written by the editors and reporters of the free presses of Skyrim — <strong>Trisiphine</strong>,{' '}
            <strong>Niris Felstar</strong>, <strong>Naril Laretheus</strong>, <strong>Farewell-in-Spring-Rain</strong>,{' '}
            <strong>Sydra Novere</strong>, <strong>Monty</strong>, <strong>Jephrey Pringle</strong> and{' '}
            <strong>Chort</strong>.
          </p>
          <p className="chron-p">
            <em>Golden Herald</em>, played for this volume by <strong>Vaerion Meanor</strong> the bard.
          </p>
          <p className="chron-p chron-p--sig">
            <em>For the Glory of the Third Aldmeri Dominion.</em>
          </p>
        </div>
      ),
    },
  ];
}

export function HistoryView() {
  const build = useCallback(buildLeaves, []);
  return (
    <BoundBook
      build={build}
      seal={sealUrl}
      scryLabel="Search the history"
      placeholder="a name, a hold, a day…"
      navLabel="History navigation"
    />
  );
}
