// History of the Realm — the one volume the Embassy writes rather than reads.
//
// Its account is assembled from the free presses of Skyrim: four papers whose
// surviving issues cover Second Seed 3 to Midyear 15 of 4E 216. The text is
// held here rather than in the roster sheet for the same reason the First
// Emissaries' deeds are — it is settled history, and a grid of cells is the
// wrong shape for it. There is no tab behind this volume and no API call for
// it; it cannot be withdrawn, and it reads the same when the sheet is down.
//
// Where the presses contradict each other, the contradiction is kept and
// marked. An archive that quietly picks a winner is editing, not recording.

import { Page } from '../components/Page';

interface Entry {
  date: string;
  text: string;
  /** Set for the handful of days the rest of the chronicle turns on. */
  weight?: 'grave';
}

const SECOND_SEED: Entry[] = [
  {
    date: 'Rain’s Hand 30',
    text: 'A naked Dunmer demands lordly clothing of Leowynn, royal tailor at Dragonsreach, claiming royalty. He vanishes when pressed for proof, vowing to return.',
  },
  {
    date: 'Before the 3rd',
    text: 'Grommash is executed by the Aedra’s judgement, his soul left unbanished. Elijah, aggressor in an earlier attack on Solitude, is found dead on the riverbank and his soul banished to Oblivion. Wolfgar Stormblade is executed by Jarl Thorgil Thundercaller for raiding Windhelm.',
  },
  {
    date: 'Second Seed 3',
    text: 'The Tamriel Tribune prints its second issue. Lar’ry of the Bannered Mare is executed for skooma dealing.',
  },
  {
    date: 'Second Seed 4',
    text: 'Qa’sidy follows him to the block. The Orsimir gather at Largashbur and raise Drogo as Warchief. Ragnarr Jr. is beheaded in Solitude for breaking his exile three times; Pubert the bard plays him out.',
  },
  {
    date: 'Second Seed 4',
    weight: 'grave',
    text: 'THE SIEGE OF SOLITUDE. The beacon is lit as the rebel Faric of Highrock advances with an army of thirty. The Thalmor reinforce the city gates and hold the frontline while a peasant militia holds the back; Lord Ebonheart directs above five and thirty citizens. The rebels prove ununified and sue for parlay once Thoric has taken losses.',
  },
  {
    date: 'Second Seed 5',
    text: 'The Tribune prints its third issue. Faric is interrogated at Riften by the Thalmor and taken on to Markarth.',
  },
  {
    date: 'Second Seed 14',
    text: 'The Riften Courier opens its run. Werewolf attacks drive a scramble for silver; the Vigilants of Stendarr arm themselves with it and the temple at Solitude gives rings away, which are already being scalped.',
  },
  {
    date: 'Second Seed 15',
    text: 'A rumour spreads that the Thalmor themselves are behind the werewolves. Morthal’s recovery is reported: its former leader Nazir had made the town a sanctuary for exiles, werewolves and vampires among them, until the Sons of Skyrim arrested and executed him without trial. Walks-by-Wind and the Council now govern.',
  },
  {
    date: 'Second Seed 16',
    text: 'Travellers speak of the Wolf of the Rift, a werewolf that defends them rather than hunts them, and which the Vigilants are said to have met in peace.',
  },
  {
    date: 'Second Seed 18',
    text: 'Falkreath’s werewolf pack is broken by the Vigilants, the Dawnguard and the Silver Dawn together; four beasts remain at large. Cultists of Molag Bal work the Hjaalmarch salt marshes in black robes, barefoot, chanting that soon things will change but for now nothing changes.',
  },
  {
    date: 'Second Seed 19',
    text: 'The Vashu’agra are barred from Whiterun on pain of death, after two exiles they had taken in attacked the adventurers’ guild and killed Whiterun nobles. The clan disavows them and asks openly for reconciliation.',
  },
  {
    date: 'Second Seed 20',
    text: 'Lizardo the Wizardo beheads a Molag Bal cultist who had entered Morthal disguised as a blind and mute Argonian, and is named the Dragon of Morthal.',
  },
  {
    date: 'Second Seed 21',
    text: 'The clan marches west when their bloodkin Kit’ra Fernwind is arrested. Housecarl Kobra of Whiterun mediates: Kit’ra is released in exchange for banishment. The Courier calls it a first step towards peace.',
  },
  {
    date: 'Second Seed 21',
    weight: 'grave',
    text: 'THE FALL OF THE BARDS COLLEGE. The bards execute their own leaders after Trisiphine and Niris are exposed as sworn members of the Morag Tong. The college is shuttered and seized by the Imperial Legion for barracks.',
  },
  {
    date: 'Second Seed 23',
    text: 'The college’s dead are buried on the docks outside Solitude. An attendee shouts the Tong’s name into the crowd and the surviving students scatter, swimming east into hiding.',
  },
  {
    date: 'Second Seed 23',
    weight: 'grave',
    text: 'THE SOLITUDE MASSACRE. One hour after that funeral the Orc clan is admitted to the Blue Palace for peace talks, their guard barred outside. Whiterun’s military enters far beyond its jurisdiction, uncontested by Solitude’s, and on Imperial authority the order is given: kill them all. Chieftain Joeburk Largbur falls and the clan’s leadership is annihilated. Survivors are tortured, some made to watch their family executed. Jarl Florian of Haafingar is mortally wounded in his own court.',
  },
  {
    date: 'Second Seed 24',
    text: 'Markarth stands to arms against a reported march of eighty men. It is the clan’s funeral procession. Lord Regent Dar’Mozahr confirms the roads clear.',
  },
  {
    date: 'Second Seed 25',
    text: 'The dead are laid to rest at the Ashen Forge, the Jarl of Riften singing a Skaal song over them. Banditry spikes across the province and a wild troll breaches Riften’s gates.',
  },
  {
    date: 'Second Seed 26',
    weight: 'grave',
    text: 'THUNDERCALLER BIDS FOR HIGH KING. A combined host of Eastmarch and the Rift marches into Haafingar. Before Solitude’s locked gates, backed by Jarl Elsilda Farseer, Jarl Thorgil Thundercaller declares for the High Kingship and invokes the name of Talos to roaring chants. The Legion forms a line; the eastern armies withdraw.',
  },
  {
    date: 'Second Seed 26',
    text: 'Winterhold is liberated when a mage spirit weaponising the weather is appeased by Lord Kobra Longsword and a company of mages. Jarl Florian dies of his wounds.',
  },
  {
    date: 'Second Seed 28',
    text: 'A corrupted False Vigilant serving Meridia is destroyed; Keeper Miran dies healing his comrades and Prior Thorin Frostborn succeeds him. An Aldmeri diplomat begins offering the citizens of Riften safekeeping of their coin for ten gold a month.',
  },
];

const MIDYEAR: Entry[] = [
  {
    date: 'Midyear 2',
    text: 'The Courier reopens in Morthal’s salt marsh. Winterhold holds its first Winterwake after five and twenty years as a ghost of itself, and the spectral guardians of the College descend to walk among the revellers before withdrawing.',
  },
  {
    date: 'Midyear 3',
    text: 'Rogue orc bandits raid Morthal, single out the guard Lizardo, and carry him off with his cape. Two of them kill one another in the skirmish. They claimed allegiance to Largashbur, which the Courier cannot explain.',
  },
  {
    date: 'Midyear 4',
    weight: 'grave',
    text: 'A PROVINCE DIVIDED. Riften is found emptied, its court dissolved by Imperial order and its guard stood down. The Legion marches east and storms the Palace of the Kings, with second and third forces from Whiterun and Dawnstar. Windhelm defeats and captures them.',
  },
  {
    date: 'Midyear 7',
    text: 'The Reachmen are profiled and distinguished from the Forsworn by their shaman Tar-Xil. The Green Veil keep the roads from an abandoned Stormcloak camp. The reporter Monty announces a walk through every hold against the coming war.',
  },
  {
    date: 'Midyear 15',
    text: 'The Lady of the Lake takes Lake Honrich, calling travellers by name; the bard-detective Jorg Ingot falls under her thrall and is gaoled for his own protection. Word spreads of a lawless sanctuary opening its doors to the province’s most unwanted.',
  },
];

interface Paper {
  name: string;
  span: string;
  staff: string;
  note: string;
}

const PAPERS: Paper[] = [
  {
    name: 'The Tamriel Tribune',
    span: 'Second Seed 3 – 5',
    staff: 'Editor-in-chief Trisiphine · Lead Reporter Niris Felstar',
    note: 'Delivering the news wherever you are. Both surviving issues were printed before its entire masthead died in the purge at the Bards College.',
  },
  {
    name: 'The Riften Courier',
    span: 'Second Seed 14 – 28',
    staff: 'Founded by Farewell-in-Spring-Rain & Sydra Novere',
    note: 'News from the Ratway to the Blue Palace. The fullest account of the massacre and its aftermath, and the only paper to run Chort’s Advice Corner.',
  },
  {
    name: 'The Haafingar Gazette',
    span: 'Second Seed 23, 26',
    staff: 'Editor in Chief Naril Laretheus · dedicated to Niris Hlaalu',
    note: 'Skyrim’s go-to printing and publishing company. A Solitude paper, and the angriest of the four on the subject of Whiterun.',
  },
  {
    name: 'The Morthal Courier',
    span: 'Midyear 2 – 15',
    staff: 'Farewell-in-Spring-Rain & Sydra Novere',
    note: 'Your guide through the mist. The Riften Courier under a new name, having traded the Rift for the salt marsh.',
  },
];

export function HistoryView() {
  return (
    <Page
      title="History of the Realm"
      subtitle="As Recorded by the Free Presses of Skyrim"
    >
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
