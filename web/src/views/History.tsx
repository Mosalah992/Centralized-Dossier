// History of the Realm — the one volume the Embassy writes rather than reads.
//
// Its account is assembled from the free presses of Skyrim: four papers whose
// surviving issues cover Second Seed 1 to Midyear 15 of 4E 216. The text is
// held here rather than in the roster sheet for the same reason the First
// Emissaries' deeds are — it is settled history, and a grid of cells is the
// wrong shape for it. There is no tab behind this volume and no API call for
// it; it cannot be withdrawn, and it reads the same when the sheet is down.
//
// Where the presses contradict each other, the contradiction is kept and
// marked. An archive that quietly picks a winner is editing, not recording.

import { Page } from '../components/Page';
import { Guided, GuidedToggle, useGuidedReading } from '../reading';

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
    date: 'Rain’s Hand 30, by night',
    text: 'Elijah, a Dunmer misanthrope, sets upon the guards of Solitude to overturn his exile. Baron Dar’Mozahr drives his sellswords from the city, and Elijah leaps into the river in full battle regalia and is presumed drowned. His compatriot Grommash is taken and questioned, then released — his part in it circumstantial, their meeting in the crypt beneath the city amicable. The two agree to drink together once the dust has settled.',
  },
  {
    date: 'Second Seed 1',
    text: 'The Tamriel Tribune prints its first issue. It reports the Tight Union, an Orc warband near Whiterun that began as a labour union of Whiterun, Windhelm and Riverwood before its remnants turned on the very workers they formed to protect, and addresses them directly: the revolution must never turn on the common man.',
  },
  {
    date: 'Before the 3rd',
    text: 'Grommash is executed by the Aedra’s judgement, his soul left unbanished. Elijah is found dead on the riverbank and his soul banished to Oblivion. Neither issue explains what changed in two days. Wolfgar Stormblade is executed by Jarl Thorgil Thundercaller for raiding Windhelm.',
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
    text: 'The Tribune prints its third issue. Faric is interrogated at Riften by the Thalmor and taken on to Markarth. The Court of Eastmarch lays a levy on Bronze Water Cave — fifty septims the group and a third of all found — in the name of Lord Regent Thorgil, signed by Steward Saryn Telvanni.',
  },
  {
    date: 'Second Seed 6',
    text: 'The Lord Regent of Windhelm is carried off by a bandit clan. A warband of the Nordic Brotherhood, the Orcs of Vashu-Agra and Mor-Kazgh rides to find him; he has freed himself already. That same day above a hundred gather at the Tower Stone to see the sky alight and hear the voice of Magnus speak to the Vigilants of Stendarr.',
  },
  {
    date: 'Second Seed 7',
    text: 'Bjorg, Baron of Eastmarch and head of the Nordic Brotherhood, is accused by the Lord Regent of arranging his own abduction. Chieftain Joeburk Largbur takes him; he refuses Holmgang. His trial begins in the Palace of Kings before Imperial forces take it from the court and remove him to Castle Dour, where he is tried in private that night and executed in the name of the Empire. At Riften, Ares Ascer is executed for raising an assassins’ guild against the Thalmor, his soul sent to Oblivion.',
  },
  {
    date: 'Second Seed 8',
    text: 'Dawnstar is made a vassal of Windhelm and the occasion kept with a feast, Margrave Pin at its head.',
  },
  {
    date: 'Second Seed 10',
    weight: 'grave',
    text: 'THE ATTACK ON THE EMBASSY. At first light the Sons of Skyrim fall upon the Thalmor Embassy in Haafingar. Kyne’s Host answers within the hour, sending above a dozen troops to defend Solitude and their diplomatic allies, and joins the Embassy’s own defenders in the battle at the top of the hill. Thalmor, Kyne’s Host and the Solitude guard together take the ringleader Snorri, son of Snorri, alive. He is granted Holmgang; the blacksmith Limbulous stands as champion and kills him, both men fighting bravely and with honour, and is named New Champion of Dragon Bridge for it.',
  },
  {
    date: 'Second Seed 12',
    text: 'Markarth is given leave to govern itself under Baron Dar’Mozahr as Administrator, Whiterun having withdrawn from the management of the city once word between them broke down. Elections are promised, and an open court.',
  },
  {
    date: 'Second Seed 13',
    text: 'Hundreds congregate at Winterhold. A voice upon the winds poses a riddle, the sky turns green, and atronachs set upon those gathered. A few who answer correctly are granted magic.',
  },
  {
    date: 'Second Seed 14',
    text: 'The Tribune prints its fifth issue. The Riften Courier opens its run. Werewolf attacks drive a scramble for silver; the Vigilants of Stendarr arm themselves with it and the temple at Solitude gives rings away, which are already being scalped.',
  },
  {
    date: 'Second Seed 15',
    weight: 'grave',
    text: 'THE MARCH ON VOSHU AGRA. Whiterun’s militia, nobility and Adventurers’ Guild march upon the Orc stronghold on a false report. The Bigtooth bandit clan had struck the Whiterun gate claiming the Voshu Agra name, while the clan itself was moving troops to Mor Khazgur. Whiterun summons above a hundred bannermen from every hold, Windhelm among them. A nameless Khajiit provokes the Orcs to a fist fight and insults their honour with Malacath’s own words; they chase his party off, not knowing two of the Jarl’s daughters rode with it. The daughters return to Whiterun saying the Voshu Agra attacked them.',
  },
  {
    date: 'Second Seed 15',
    text: 'A rumour spreads that the Thalmor themselves are behind the werewolves. Morthal’s recovery is reported: its former leader Nazir had made the town a sanctuary for exiles, werewolves and vampires among them, until the Sons of Skyrim arrested and executed him without trial. Walks-by-Wind and the Council now govern.',
  },
  {
    date: 'Second Seed 16',
    text: 'Jarl Zyrik Frostborn tells Whiterun’s open court that what passed at the fort was of improper form, and that he and Jarl Thundercaller of Windhelm went to resolve it. The Orcs, he allows, broke a few laws and will pay the price for it. Travellers speak of the Wolf of the Rift, a werewolf that defends them rather than hunts them, and which the Vigilants are said to have met in peace.',
  },
  {
    date: 'Second Seed 17',
    text: 'The Dunmer of Skyrim gather to honour the Three. Above fifty from every corner of Tamriel meet at Windhelm and walk together to the Shrine of Azura, where Jarl Thorgil Thundercaller beseeches the Twilight Queen to forgive the past transgressions of the Nords and entreats Shor to extend the same grace to the Dunmer, speaking of the brotherhood of Man and Mer. A second pilgrimage goes to the Shrine of Boet-hi-Ah. That night a council returns to Windhelm and founds the Dunmer Embassy upon the docks under Ambassadors Serven, Dral and Baron Xur — a house for all Dunmer, and a bastion for any who meet with prejudice.',
  },
  {
    date: 'Second Seed 18',
    text: 'Falkreath’s werewolf pack is broken by the Vigilants, the Dawnguard and the Silver Dawn together; four beasts remain at large. Cultists of Molag Bal work the Hjaalmarch salt marshes in black robes, barefoot, chanting that soon things will change but for now nothing changes.',
  },
  {
    date: 'Second Seed 19',
    text: 'The Vashu’agra are barred from Whiterun on pain of death, after two exiles they had taken in attacked the adventurers’ guild and killed Whiterun nobles. The clan disavows them and asks openly for reconciliation. The Tribune, printing a day later, names those exiles as men Joeburk had trusted too quickly, dealt with within the clan and their access to the mine revoked — and sets the whole quarrel against Bigtooth, whom Joeburk is now charged by Windhelm to behead.',
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
    span: 'Second Seed 1 – 20',
    staff: 'Editor-in-chief Trisiphine · Lead Reporter Niris Felstar · Financial Columnist Hafthor Harkonsen',
    note: 'Delivering the news wherever you are. Its full run of six issues survives, every one printed before its entire masthead died in the purge at the Bards College. It never reports its own end.',
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
  const [guided, setGuided] = useGuidedReading();

  return (
    <Page
      title="History of the Realm"
      subtitle="As Recorded by the Free Presses of Skyrim"
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
