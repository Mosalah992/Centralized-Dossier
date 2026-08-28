// History of the Realm — the one volume the Embassy writes rather than reads.
//
// Its account is assembled from two sources, and they are kept apart on the
// page because they are not the same kind of evidence. The first is the free
// presses of Skyrim: four papers whose surviving issues cover Second Seed 1 to
// Midyear 15 of 4E 216. The second is the Embassy's own posted notices of
// Heartfire 4E 226, ten years on — transcribed from the boards they were nailed
// to, and therefore testimony rather than reportage. A notice is the Embassy
// speaking about itself; the volume says so where it prints one. The text is
// held here rather than in the roster sheet for the same reason the First
// Emissaries' deeds are — it is settled history, and a grid of cells is the
// wrong shape for it. There is no tab behind this volume and no API call for
// it; it cannot be withdrawn, and it reads the same when the sheet is down.
//
// Where the presses contradict each other, the contradiction is kept and
// marked. An archive that quietly picks a winner is editing, not recording.

import { useGSAP } from '@gsap/react';

import { D, STAGGER, gsap, revealOnEnter, staged } from '../motion';
import { Page } from '../components/Page';
import { Guided, GuidedToggle, useGuidedReading } from '../reading';

import {
  type Entry,
  type Paper,
  MIDYEAR,
  PAPERS,
  RECALL,
  RECALL_NOTICE,
  SECOND_SEED,
} from './history-data';


export function HistoryView() {
  const [guided, setGuided] = useGuidedReading();

  /*
   * Entries arrive as the reader comes down the page.
   *
   * VERY RESTRAINED, and deliberately more so than the Ledger's. This is a
   * hundred-odd dated entries transcribed from the province's own newspapers,
   * and it is the volume the archive is proudest of being a record rather than
   * a presentation. A large entrance would make a chronicle read like a
   * marketing page: a sixth of a second and six pixels is enough to say the
   * page is alive, and not enough to editorialise.
   *
   * Only what is below the fold when the volume opens is ever touched — see
   * revealOnEnter, which also carries the failsafe that un-blanks everything
   * if the browser turns out not to be computing intersections at all.
   */
  useGSAP(() => staged(({ moving }) => {
    if (!moving) return;

    const fold = window.innerHeight;
    const entries = gsap.utils
      .toArray<HTMLElement>('.chronicle__entry')
      .filter((el) => el.getBoundingClientRect().top >= fold);

    return revealOnEnter(entries, (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        // A grave entry takes its time. The chronicle marks the ones that
        // carry a death, and the record should not hurry past them.
        duration: (i, el: HTMLElement) =>
          (el.classList.contains('chronicle__entry--grave') ? D.page : D.leaf),
        ease: 'draw',
        stagger: STAGGER.roll,
        clearProps: 'opacity,transform',
        overwrite: true,
      }),
      // Six pixels, not ten. A line of prose is lighter than a docket entry.
      { opacity: 0, y: 6 });
  }), []);

  return (
    <Page
      title="History of the Realm"
      subtitle="As Recorded by the Free Presses of Skyrim, and by the Embassy’s Own Hand"
    >
      {/* This volume keeps its account as written prose rather than as data, so
          the guide walks the rendered tree instead of being threaded through a
          builder. Everything below is read; the dates and the running heads are
          stepped over by class inside <Guided>. */}
      <div className="reading-aid">
        <GuidedToggle on={guided} onChange={() => setGuided((was) => !was)} />
      </div>

      <Guided on={guided}>
      <section aria-label="Before the chronicle">
        <h2 className="page__heading">Before the Chronicle</h2>
        <div className="chronicle__preamble">
          <p>
            Five and twenty years have passed since the Stormcloaks first rose.
            They took Solitude once and held it briefly: the killing of Vittoria
            Vici and of Emperor Titus Mede II ended the Elder Council’s restraint,
            and a fully equipped veteran Legion was committed to Skyrim. Against a
            true Legion, Ulfric’s armies were crushed.
          </p>
          <p>
            The Empire dismantled the rebellion, occupied the holds, and imposed a
            martial reconstruction that has run for decades. Then its priorities
            moved on. With the province secure and a standing army so far from
            Cyrodiil proving expensive, the Council withdrew its elites and left a
            cheaper occupation behind them — a patchwork auxiliary legion of local
            recruits, mercenaries, and a handful of Imperial officers.
          </p>
          <p>
            The Stormcloak spirit did not die with the rebellion. What survived
            reorganised into an insurgency of small cells, hidden camps and
            fighters scattered through the mountains, and after years of quiet it
            has begun striking again with coordinated precision. The auxiliary
            legion, undertrained and politically hamstrung, is struggling to hold
            what the Empire believed was settled.
          </p>
          <p className="chronicle__aside">
            The presses count those years themselves. The Riften Courier opens its
            account of Thundercaller’s bid with the words <em>“exactly twenty-five
            years after civil war tore our lands apart.”</em>
          </p>
        </div>
      </section>

      <section aria-label="The chronicle">
        <h2 className="page__heading">The Chronicle, 4E 216</h2>

        <h3 className="chronicle__month">Second Seed</h3>
        <ol className="chronicle">
          {SECOND_SEED.map((entry) => (
            <li
              className={`chronicle__entry${entry.weight ? ` chronicle__entry--${entry.weight}` : ''}`}
              key={`${entry.date}-${entry.text.slice(0, 24)}`}
            >
              <span className="chronicle__date">{entry.date}</span>
              <span className="chronicle__text">{entry.text}</span>
            </li>
          ))}
        </ol>

        <h3 className="chronicle__month">Midyear</h3>
        <ol className="chronicle">
          {MIDYEAR.map((entry) => (
            <li
              className={`chronicle__entry${entry.weight ? ` chronicle__entry--${entry.weight}` : ''}`}
              key={`${entry.date}-${entry.text.slice(0, 24)}`}
            >
              <span className="chronicle__date">{entry.date}</span>
              <span className="chronicle__text">{entry.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="The road to war">
        <h2 className="page__heading">The Road to War</h2>
        <div className="chronicle__preamble">
          <p>
            Read together, the four presses tell one story, and it is not the
            werewolves that fill their front pages. An insurgency testing a weak
            occupation is a slow problem. A hold’s military slaughtering an allied
            clan under a peace banner, with an Imperial order behind it, is a
            cause.
          </p>
          <ol className="chronicle__steps">
            <li>
              The Vashu’agra are barred from Whiterun and Solitude over crimes
              they insist were the work of impostors and of two exiles they had
              taken in and since disavowed. They ask repeatedly for reconciliation.
            </li>
            <li>
              Their bloodkin Kit’ra Fernwind is arrested. The clan mobilises;
              Housecarl Kobra brokers her release for banishment.
            </li>
            <li>
              On the three and twentieth they are invited to Solitude for formal
              peace talks. Their leaders are admitted; their guard is barred
              outside.
            </li>
            <li>
              Whiterun’s guards surround them and the order is given. The Chieftain
              is killed, the leadership annihilated, and the guards are reported to
              begin removing helmets and calling for the death of any Orsimir
              present, whatever their affiliation.
            </li>
            <li>
              Windhelm and Riften, the clan’s long allies, are outraged. Within
              three days their combined host stands at Solitude’s gates and
              Thundercaller declares for High King in the name of Talos.
            </li>
            <li>
              By Midyear the Empire has dissolved Riften’s court and the Legion has
              assaulted the Palace of the Kings on three fronts — and lost.
            </li>
          </ol>
          <p className="chronicle__aside">
            The Courier’s own judgement: unlike the conflict of five and twenty
            years prior, this would be a brutal, geographic affair between the
            polar ends of the province.
          </p>
        </div>
      </section>

      <section aria-label="The Dominion in the public eye">
        <h2 className="page__heading">The Dominion in the Public Eye</h2>
        <div className="chronicle__preamble">
          <p>
            The Embassy records these as they were printed, favourable and
            otherwise. A register that kept only the flattering half would be
            worth nothing to whoever reads it next.
          </p>
          <dl className="chronicle__reckoning">
            <dt>As defenders</dt>
            <dd>
              At the Siege of Solitude the Tribune credits the Thalmor with
              reinforcing the city gates and holding the frontline, and with
              taking Faric of Highrock for questioning afterwards.
            </dd>

            <dt>As the attacked</dt>
            <dd>
              On the tenth of Second Seed the Sons of Skyrim fell upon the
              Embassy itself at first light. Kyne’s Host rode within the hour to
              defend the city and their diplomatic allies both, and stood with
              the Embassy’s own on the hill; their ringleader was taken alive and
              answered for it in Holmgang. Three days before, a farmer at Riften
              had gone to the block for raising an assassins’ guild against the
              Dominion. Whatever else the presses say of us, they record a month
              in which we were hunted, and in which Nords died at our side.
            </dd>

            <dt>As suspects</dt>
            <dd>
              The Riften Courier reports a rumour, championed by a premier
              monster-hunting guild, that the Thalmor orchestrate the werewolf
              surge. The paper is openly sceptical of it, while noting that
              anti-Dominion groups are turning rural grief into recruitment.
            </dd>

            <dt>As creditors</dt>
            <dd>
              An Aldmeri diplomat offers any citizen of the Dominion safekeeping
              of their coin for ten gold a month, with a Thalmor escort for
              purchases above two hundred septims. The Courier records that
              Riften’s citizens are rightfully sceptical.
            </dd>

            <dt>As peacekeepers</dt>
            <dd>
              The Haafingar Gazette places the Second Emissary and his entourage
              at the Khajiit Pilgrimage of the Moons in the Reach, keeping the
              peace, on the night the sealed temple opened to them.
            </dd>
          </dl>
        </div>
      </section>

      <section aria-label="The recall">
        <h2 className="page__heading">The Recall, 4E 226</h2>
        <div className="chronicle__preamble">
          <p>
            Ten years on, the war the presses saw coming has been fought and
            settled against the Empire: the Legion is expelled, Skyrim is united
            and independent, and the Embassy stands in a province that no longer
            has an Imperial reason to tolerate it. Through those weeks Alinor did
            not answer. Then, within seven days, it answered entirely — with a
            recall, a dissolution and a reformation.
          </p>
          <p>
            What follows is <em>not</em> the presses. These are the Embassy&rsquo;s
            own notices, posted on its own boards and signed by the officers who
            gave them, transcribed here as they were written. They are testimony,
            not reportage, and they are kept apart from the chronicle above for
            that reason. A notice records what the Embassy declared on a given
            day. Whether the declaration held is a question the record cannot
            answer about itself.
          </p>
        </div>
        <ol className="chronicle">
          {RECALL.map((entry) => (
            <li
              className={`chronicle__entry${entry.weight ? ` chronicle__entry--${entry.weight}` : ''}`}
              key={`${entry.date}-${entry.text.slice(0, 24)}`}
            >
              <span className="chronicle__date">{entry.date}</span>
              <span className="chronicle__text">{entry.text}</span>
            </li>
          ))}
        </ol>
        {/* Alinor's answer, set as a document rather than as an entry: it is
            the only thing in this volume that was sent TO the Embassy. */}
        <figure className="writ">
          <figcaption className="writ__head">
            <span className="writ__kind">Notice of Recall</span>
            <span className="writ__from">From Alinor, to the former personnel of the Embassy</span>
          </figcaption>
          <div className="writ__body">
            {RECALL_NOTICE.map((para, i) => (
              <p className={i === 0 ? 'writ__p writ__p--salutation' : 'writ__p'} key={para.slice(0, 32)}>
                {para}
              </p>
            ))}
          </div>
          <p className="writ__sign">
            Signed,<br />
            <strong>High Emmissary Oriwyneth</strong>
          </p>
        </figure>

        <div className="chronicle__preamble">
          <p className="chronicle__aside">
            The notice is transcribed as it was written, errors and all
            &mdash; <em>antithecal</em>, <em>Condordat</em>, <em>Emmissary</em>,
            and a sentence in the fifth paragraph that stops at
            &ldquo;before&nbsp;.&rdquo; with the name never entered. A
            transcription that quietly corrects a document stops being evidence
            of it. The Embassy holds no date for its arrival; it names its
            readers <em>former</em> personnel and Skyrim a <em>rebel province</em>,
            so it cannot predate the province&rsquo;s independence.
          </p>
          <p className="chronicle__aside">
            One reading is worth setting down and not asserting. The notice
            condemns the raising of Khajiit and Bosmer to stations above Altmer;
            the Restructure of the five and twentieth removed them from every
            command position. Whether the Embassy was answering this letter or
            anticipating it, the record does not say.
          </p>
          <p className="chronicle__aside">
            Two of these notices are answered by a later one, and the archive
            keeps both rather than choosing. On the one and twentieth the Embassy
            filed a recovery order against the estate of House Velrith; on the
            five and twentieth House Velrith was declared not to exist within the
            Dominion. The claim and the house it was made against were dissolved
            in the same week. And the office of First Emissary, abolished on the
            five and twentieth and never to be filled again, is the office in
            whose name the Hall of Honor is still kept.
          </p>
        </div>
      </section>

      <section aria-label="The presses">
        <h2 className="page__heading">The Presses</h2>
        <div className="presses">
          {PAPERS.map((paper) => (
            <div className="press" key={paper.name}>
              <h3 className="press__name">{paper.name}</h3>
              <p className="press__span">{paper.span}</p>
              <p className="press__staff">{paper.staff}</p>
              <p className="press__note">{paper.note}</p>
            </div>
          ))}
        </div>
      </section>
      </Guided>

      <footer className="page__credits">
        <p>
          Written by the editors and reporters of the free presses of Skyrim —
          <strong> Trisiphine</strong>, <strong>Niris Felstar</strong>,{' '}
          <strong>Naril Laretheus</strong>,{' '}
          <strong>Farewell-in-Spring-Rain</strong>, <strong>Sydra Novere</strong>,{' '}
          <strong>Monty</strong>, <strong>Jephrey Pringle</strong> and{' '}
          <strong>Chort</strong>.
        </p>
        <p>
          <em>Golden Herald</em>, played for this volume by{' '}
          <strong>Vaerion Meanor</strong> the bard.
        </p>
      </footer>
    </Page>
  );
}
