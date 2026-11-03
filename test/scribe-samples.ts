// Filings for the parchment's and the bot's tests: one of every importance, a
// Cataclysm, a long body, and both stamps.
// Every name here is invented except Ondolemar's, who is the realm's own.

import type { ParchmentRequest } from '../shared/filing';

const at = (monthIndex: number, day: number, hour: number, minute: number) => ({ year: 226, monthIndex, day, hour, minute });

export const SAMPLES: { label: string; request: ParchmentRequest }[] = [
  {
    label: 'Standard Routine · Military Inspection Report',
    request: {
      serial: 214,
      stamp: null,
      filing: {
        category: 'report',
        wing: 'military',
        kind: 'inspection',
        importance: 'routine',
        section: null,
        rank: 'Captain',
        name: 'Aelindor Saerhal',
        superior: 'Justiciar Ondolemar',
        title: 'Muster of the Markarth Detachment',
        time: at(9, 4, 18, 4),
        body:
          'Forty-two soldiers of the Dominion stood muster at the Understone gate at the sixth bell. Three were absent: two on sanctioned leave, one in the healer’s care with a Reachman’s arrow still in her shoulder.\n\nArms and armour were inspected and found in good order. The new recruits drilled with the halberd until dusk and acquitted themselves without shame.\n\nNo incidents to report.',
      },
    },
  },
  {
    label: 'Nominal · Auxiliary Activity Report',
    request: {
      serial: 215,
      stamp: null,
      filing: {
        category: 'report',
        wing: 'auxiliary',
        kind: 'activity',
        importance: 'nominal',
        section: null,
        rank: 'Agent',
        name: 'Celarwen',
        superior: null,
        title: 'The Whiterun road, dawn to noon',
        time: at(9, 5, 6, 30),
        body:
          'Walked the road from the Honningbrew meadery to the Western Watchtower and back. A caravan of Khajiit traders made camp by the stables, with papers in order. A farmer complained of wolves. Nothing else of note.',
      },
    },
  },
  {
    label: 'Notable · Intelligence Investigation Report (long)',
    request: {
      serial: 216,
      stamp: null,
      filing: {
        category: 'report',
        wing: 'intelligence',
        kind: 'investigation',
        importance: 'notable',
        section: null,
        rank: 'Inquisitor',
        name: 'Faralda Venarion',
        superior: 'First Emissary',
        title: 'Talos shrine found beneath the Silver-Blood Inn: the keeper, his visitors, and the carving',
        time: at(9, 6, 22, 15),
        body: [
          'Acting on the word of an informant in the Warrens, I entered the cellar of the Silver-Blood Inn after the last bell with two soldiers of the Markarth detachment. Behind a false wall of barrels we found a small shrine to the Ninth Divine: a carved figure of Talos in the old Imperial manner, a dozen candles still warm, and offerings of bread and a septim or two.',
          'The keeper, a Nord named Brolf, swears he knew nothing of it. His cook says otherwise, and says that men come down on Fredas after the inn is shut. She named three of them; their names are with the Bureau and are not set down here.',
          'Over the altar is carved a line I copied faithfully: “The dragon did not die. He waits.” The same words were found on the Karthwasten mine wall in Last Seed, which suggests the same hand, or the same circle.',
          'I have left the shrine as we found it and set a watch on the inn for the next three Fredas nights. If the men return, they will be taken quietly at the stair rather than in the street, so that the circle does not learn the shrine is known. I ask for two more soldiers for the watch, and leave to question the cook again under the Bureau’s seal.',
          'The informant has been paid from the Bureau’s purse and has asked that her name never be written. I have honoured that.',
        ].join('\n\n'),
      },
    },
  },
  {
    label: 'Strategic · Embassy Incident Report',
    request: {
      serial: 217,
      stamp: null,
      filing: {
        category: 'report',
        wing: 'diplomatic',
        kind: 'incident',
        importance: 'strategic',
        section: null,
        rank: 'Justiciar',
        name: 'Ithelia Sarathil',
        superior: 'First Emissary',
        title: 'The Jarl of Falkreath refuses the Concordat inspection',
        time: at(9, 7, 11, 0),
        body:
          'The Jarl of Falkreath has refused our inspectors entry to his hold, citing an Imperial writ that predates the White-Gold Concordat. The writ is genuine; its standing under the Concordat is not.\n\nThis is the first open refusal by a sitting Jarl. If it stands, others will follow. I ask that all Justiciars and the heads of every department meet at the Embassy before the next market day, so that the Dominion answers with one voice.',
      },
    },
  },
  {
    label: 'Cataclysm · Military Operation Report',
    request: {
      serial: 218,
      stamp: null,
      filing: {
        category: 'report',
        wing: 'military',
        kind: 'operation',
        importance: 'cataclysm',
        section: null,
        rank: 'Commander',
        name: 'Valdorian Aethelis',
        superior: null,
        title: 'The Embassy road is under attack',
        time: at(9, 8, 2, 40),
        body:
          'Stormcloak irregulars, sixty at least, have fallen on the Embassy road below the Statue of Talos. The outer patrol is pinned at the bridge. They have fire and they have bows.\n\nEvery soldier able to hold a blade is to make for the Embassy gate now. Mages to the wall. Do not wait for further word.',
      },
    },
  },
  {
    label: 'Application · Approved',
    request: {
      serial: 219,
      stamp: { mark: 'approved', at: at(9, 10, 15, 0) },
      filing: {
        category: 'application',
        wing: null,
        kind: null,
        importance: 'routine',
        section: null,
        rank: '',
        name: 'Taraneth of Alinor',
        superior: null,
        title: 'Application to serve the Thalmor',
        time: at(9, 9, 10, 0),
        body:
          'I am an Altmer of Alinor, twenty years in Skyrim as a scribe for the court of Solitude. I read and write Ta’agra, Old Nordic and the Aldmeris, and I have served the Dominion’s interests quietly for longer than I can say on paper.\n\nI ask to be admitted to the Embassy’s service in whatever office the Justiciars think fit.',
      },
    },
  },
  {
    label: 'Public Request · Denied',
    request: {
      serial: 220,
      stamp: { mark: 'denied', at: at(9, 11, 9, 30) },
      filing: {
        category: 'public-request',
        wing: null,
        kind: null,
        importance: 'nominal',
        section: null,
        rank: 'Smith',
        name: 'Hrongar Ice-Hand',
        superior: null,
        title: 'Leave to sell arms at the Embassy gate',
        time: at(9, 10, 13, 0),
        body: 'I ask leave to set up my forge by the Embassy gate on market days and sell blades and arrowheads to the Embassy’s soldiers at a fair price.',
      },
    },
  },
];
