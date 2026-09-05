// The data of History of the Realm.
//
// SPLIT OUT OF History.tsx so the Archives Editor can own it. The view keeps
// its prose — the preamble, the Road to War, the transcribed Notice of Recall
// — because those are JSX carrying real markup, and a data file cannot hold an
// <em> without inventing a markup language to put it back. What lives here is
// what is genuinely a record: the dated entries, and the papers they came from.
//
// GENERATED from content/history.json by scripts/emit-history.mjs.
// Edit the JSON — or use the Archives Editor — not this file.

export interface Entry {
  date: string;
  text: string;
  /** Set for the handful of days the rest of the chronicle turns on. */
  weight?: 'grave';
}

export const SECOND_SEED: Entry[] = [
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

export const MIDYEAR: Entry[] = [
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

/*
 * THE RECALL, 4E 226 — the Embassy's own notices, not the presses'.
 *
 * Ten years after the chronicle above, and a different kind of record: these
 * were posted on the Embassy's boards by the officers who signed them, so they
 * are the Embassy's account of the Embassy. Where the press entries are edited
 * down from four papers that could contradict one another, these can only
 * contradict THEMSELVES — and over seven days they do, twice, plainly enough
 * that the aside beneath them does nothing but set the dates side by side.
 *
 * Transcribed from the notices as posted. The dates are the realm's, reckoned
 * from the hour each was signed; the ranks and names are the roster's.
 */
export const RECALL: Entry[] = [
  {
    date: 'Heartfire 21, by night',
    text: 'Battlereeve Annatar confines all personnel to Embassy grounds until further notice, the Imperial forces having been expelled from a united Skyrim. No patrols, escorts, investigations or operations beyond the walls, under any circumstances. He thanks the Embassy’s people for what they have given through difficult months, and states plainly that neither the length of the restriction nor the next course of action is known.',
  },
  {
    date: 'Heartfire 22',
    text: 'Grand Ambassador Valynwe Velrith reports the High King’s personal promise that no court, hold or guard will attack or arrest a Thalmor for being one — and that the Embassy is nonetheless the only ground that can be guaranteed. Agents may defend themselves from the rabble by the High King’s own leave, but may not instigate and may not pursue. Any who leave off duty are to wear no colours of the Thalmor and do so at their own risk. Dominion representatives are to meet the High King on Middas.',
  },
  {
    date: 'Heartfire 25',
    weight: 'grave',
    text: 'THE RESTRUCTURE. High Inquisitor Ariniel dissolves the Thalmor of Skyrim into the Dominion Delegation and Embassy, answerable directly to Alinor’s Council. The office of First Emissary is abolished and is not to be filled again; the Thalmor Council is reinstated in full, with every department seated on it. All houses, clans and noble styles within the Embassy are purged as a threat to the State, and House Velrith is named as neither existing within the Dominion nor representing it. Khajiit and Bosmer are removed from every command position and confined to the Dominion Staff, capped at Assistant, and to a reformed Auxiliary. Resignation is abolished — those who left in recent days are given three days to return or be held guilty of crimes against the State, and Altmer permitted to go are to be shipped to Alinor for the rest of their lives. Talos worship is to go unhunted for want of the means to pursue it, a suspension the notice twice calls temporary; records may still be kept and investigations continue.',
  },
  {
    date: 'Heartfire 26',
    text: 'Canonreeve Ancarion closes his chapter in Skyrim and returns to Alinor, placing his authority and his responsibilities in the hands of his assistant, Mihir Vas Vihaan. He writes that he has kept the Embassy’s records, balanced its ledgers, built its systems and watched its people grow within them, and that little more can be added by his remaining. He intends a library on the shores of Auridon, and within it an account of the Embassy’s time in Skyrim — not the victories and the failures alone, but the names, the reports, the arguments, the friendships and the foolishness that would otherwise disappear when they leave. Beside it, a small garden of flowers gathered from Skyrim: not to remember it fondly, nor to forget it, but because they were here.',
  },
  {
    date: 'Heartfire 27',
    text: 'Further reforms are posted. The Black Talons pass under Internal Affairs, the duties of the two being held to be the same work. A Chancellor is created with a seat on the Council, charged with development, the reform of law and the drafting of legislation, and Vaerion Meanor is appointed to it; the former Advisor’s style is renamed Grand Envoy. The Diplomatic wing is capped at four or five Ambassadors, the military ranks are to be renamed, the application process reformed and the penal code rewritten. All Bosmer and Khajiit are ordered to report to the Embassy. Ka’Taravi is made Captain of the Auxiliary and Jo’Khazan its Officer; Arendor Raelendis is raised Inquisitor, Mihir Vas Vihaan confirmed Canonreeve, and Iwelien Loraenthal made High Justiciar.',
  },
];

/*
 * THE NOTICE OF RECALL — Alinor's answer, and the only document in this volume
 * that was sent TO the Embassy rather than posted by it.
 *
 * Transcribed from the sealed original. Everything else in the section above is
 * the Embassy talking about itself; this is the Dominion talking about the
 * Embassy, and it is set apart on the page for that reason.
 *
 * ITS OWN SPELLING IS KEPT. "antithecal", "Condordat", "Emmissary", and a
 * sentence in the fifth paragraph that stops at "before ." with the name never
 * written. A transcription that quietly corrects a document is no longer
 * evidence of it — the same rule docs/skyrim-press-history.md keeps with the
 * newspapers, and the errors are the reader's to weigh, not mine to tidy.
 */
export const RECALL_NOTICE: string[] = [
  'To the former personnel of the Thalmor Embassy of Skyrim,',
  'Your actions of late in Skyrim have brought disrepute upon the Aldmeri Dominion and upon our very race. You have failed or outright abandoned the duties to which you are oathsworn, fled from lesser races in a time of war and brought shame upon the very principles on which we have built our Dominion.',
  'Word has reached our ears of the Embassy’s fall from grace in recent months. The penetration of lesser beast-folk into the ranks of the Thalmor, even raised to higher stations than fellow Altmer, is antithecal to our very way of life. I write this with the utmost disgrace as I hold reports of senior members of the Embassy even forming romantic relationships with these lesser beings — a most heinous crime against both the Dominion and the Altmeri race.',
  'You were sent to the northern province to enforce the White-Gold Condordat — not to integrate with the barbarism of its people. Your actions bring disgrace to Alinor and must be answered for.',
  'You are hereby commanded to depart Skyrim immediately and surrender yourselves to the Dominion Embassy in the Imperial City. From there, you will be arrested and taken under escort to the Summerset Isles to answer for your crimes before .',
  'These terms are not to be negotiated. Neither the so-called nobles of Northkeep nor self-proclaimed High King of Skyrim can protect you from this summons. There remains one courtesy afforded to you: return willingly as servants who have failed in their duty, or refuse and find yourself condemned in absentia.',
  'Should any member of the former Skyrim mission remain within the rebel province after receipt of this order, no further summons shall be issued. You need not be reminded of the consequences.',
];

export interface Paper {
  name: string;
  span: string;
  staff: string;
  note: string;
}

export const PAPERS: Paper[] = [
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
