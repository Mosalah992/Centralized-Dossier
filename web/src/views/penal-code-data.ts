// The Criminal Code of the Aldmeri Dominion, transcribed from the Embassy's own
// Code document. Kept here as data rather than prose in the view, so the table
// of contents, the article numbering and the charge badges all come from one
// source. Wording is as the Code records it.

export interface Article {
  code: string;
  title: string;
  /** As written, e.g. "Class II Felony". */
  charge: string;
  text: string[];
}

export interface Chapter {
  code: string;
  title: string;
  articles: Article[];
}

export interface Part {
  id: string;
  numeral: string;
  title: string;
  chapters: Chapter[];
}

export const PREAMBLE = [
  'The following document constitutes the official Penal Code of the Aldmeri Dominion, containing the complete and binding body of law governing conduct within the State.',
  'All citizens, officials, and persons within the jurisdiction of the Dominion are required to adhere strictly to the provisions set forth herein. Any act, behaviour, or expression which undermines, contradicts, or impairs the authority of this Code, or the State it represents, shall result in immediate investigation, detainment, or arrest by the appropriate authorities.',
  'The enforcement of this Code shall be carried out under the authority of the Dominion, and all proceedings shall be conducted in accordance with established judicial and administrative directives.',
];

export const PROVISIONS = [
  'This Code shall apply to all matters of legal enforcement, adjudication, and administrative procedure within the jurisdiction of the Dominion, including all actions undertaken to preserve public order, state security, and Thalmor governance.',
  'This document shall be made accessible exclusively to authorised legal personnel, court officials, and designated representatives of the State. Any individual or body granted jurisdiction may require the disclosure or presentation of this Code for the purposes of enforcement or review.',
];

export const AMENDMENT =
  'The Ministry of Justice of the Aldmeri Dominion and Thalmor Council retains full and exclusive authority to amend, revise, or update this Penal Code. Any unauthorised attempt to alter, reproduce, or misrepresent the contents of this document shall constitute a criminal offence against the Dominion and be prosecuted accordingly.';

export const DISCLAIMER =
  'This is not to be entirely by the book. If the Thalmor Council deem it fit to have a different penalisation, punishment or result in consequence to a crime committed, then it will be done through Tribunals. You automatically agree to all these terms and conditions as a citizen of the Aldmeri Dominion & member of the Thalmor.';

export const PUNISHMENTS: { charge: string; penalties: string[] }[] = [
  { charge: 'Class I Felony', penalties: ['Death Penalty'] },
  {
    charge: 'Class II Felony',
    penalties: [
      'Dishonorable Discharge',
      'Life Imprisonment',
      'Transfer to Labour Correction Facility',
      'Heavy Demotion',
      'Up to 10,000 G fine',
      'Up to 10–25 Years in prison',
    ],
  },
  {
    charge: 'Class III Felony',
    penalties: [
      'Promotion Suspension up to 2 Months',
      'Heavy Demotion',
      'Up to 50 Years in prison',
      'Up to a 5,000 G fine',
    ],
  },
  {
    charge: 'Class I Misdemeanor',
    penalties: [
      'Up to 25 Years in prison',
      '8–5 Rank Demotion or less',
      'Promotion Suspension up to 2 Weeks',
      'Up to 2,500 G fine',
    ],
  },
  {
    charge: 'Class II Misdemeanor',
    penalties: [
      'Suspension up to 1 Week',
      'Promotion Suspension up to 3 Days',
      'Up to 1,000 G fine',
      'Up to 12 years in prison',
      '1–2 Rank demotion',
    ],
  },
  {
    charge: 'Class III Misdemeanor',
    penalties: [
      'Mandatory evaluation',
      'Suspension up to 1 Day',
      '1–2 Rank demotion',
      'Mandatory Retraining',
      'Administrative Duty',
      'Up to 500 G fine',
      '5 years in prison',
    ],
  },
];

export const CLASSIFICATION = [
  'Each crime will have attached a “Charge” classification, with each on a scale from One to Three and a tag of either Felony or Misdemeanor.',
  'Class I = most severe. Class III = least severe. Sentences shall be determined in accordance with State guidelines.',
  'If fines cannot be paid, an alternative punishment may be issued.',
];

/** Modifiers that can increase a charge, each by one class. */
export const MODIFIERS = [
  'Attempt',
  'Accessory',
  'Government Official / Institution',
  'Conspiracy',
  'Solicitation',
  'During Official Event / Ceremony',
];

const a = (code: string, title: string, charge: string, ...text: string[]): Article =>
  ({ code, title, charge, text });

export const PARTS: Part[] = [
  {
    id: 'physical-harm',
    numeral: 'I',
    title: 'Crimes Involving Physical Harm',
    chapters: [
      {
        code: '1.1',
        title: 'Homicide',
        articles: [
          a('1.1.1', 'Murder (First Degree)', 'Class I Felony',
            'Defined as the intentional and premeditated killing of another person.',
            'Such acts shall be considered a grave offence against both the individual and the Dominion, warranting the highest level of punishment.'),
          a('1.1.2', 'Murder (Second Degree)', 'Class I Felony',
            'Defined as the intentional killing of another person without prior planning or premeditation.',
            'This includes acts carried out in the moment but with clear intent to cause death.'),
          a('1.1.3', 'Voluntary Manslaughter', 'Class II Felony',
            'Defined as the killing of another individual committed under conditions of extreme emotional disturbance or provocation, without prior intent to kill.'),
          a('1.1.4', 'Involuntary Manslaughter', 'Class II Felony',
            'Defined as the unintentional killing of another individual resulting from negligent, reckless, or unlawful behaviour.'),
        ],
      },
      {
        code: '1.2',
        title: 'Assault and Battery',
        articles: [
          a('1.2.1', 'Assault', 'Class III Felony',
            'Defined as the intentional threat or attempt to cause harm to another individual, creating reasonable fear of imminent injury.'),
          a('1.2.2', 'Aggravated Assault', 'Class II Felony',
            'Defined as assault committed with the use of a weapon, dangerous instrument, or under circumstances likely to result in serious bodily harm.'),
          a('1.2.3', 'Simple Battery', 'Class II Misdemeanor',
            'Defined as minor, non-injurious physical contact made without consent, including striking or physical interference.'),
          a('1.2.4', 'Battery', 'Class III Felony',
            'Defined as the intentional infliction of bodily harm upon another individual through physical force.'),
          a('1.2.5', 'Aggravated Battery', 'Class II Felony',
            'Defined as the infliction of serious or permanent injury, or harm resulting from the use of a weapon or excessive force.'),
        ],
      },
      {
        code: '1.3',
        title: 'Non-Conventional Assault',
        articles: [
          a('1.3.1', 'Kidnapping', 'Class I Felony',
            'Defined as the unlawful seizure, transport, or confinement of an individual against their will, including any act of forced relocation or detention.',
            'Such acts shall be considered a direct threat to public order and state security.'),
          a('1.3.2', 'False Imprisonment', 'Class II Felony',
            'Defined as the unlawful detention or restriction of an individual’s freedom of movement without legal authority or justification.'),
        ],
      },
    ],
  },
  {
    id: 'economic',
    numeral: 'II',
    title: 'Economic Crimes',
    chapters: [
      {
        code: '2.1',
        title: 'Theft and Financial Offences',
        articles: [
          a('2.1.1', 'Grand Larceny', 'Class II Felony',
            'Defined as the unlawful taking, appropriation, or conversion of currency, goods, or state property with a value equal to or exceeding 1,000 Gold (G).',
            'Such acts shall be considered a serious offence against Dominion property and economic stability.'),
          a('2.1.2', 'Petty Larceny', 'Class II Misdemeanor',
            'Defined as the unlawful taking of property or currency valued below 999 Gold (G).',
            'Offenders may be subject to fines, labour assignment, or short-term detention.'),
          a('2.1.3', 'Aggravated Robbery', 'Class II Felony',
            'Defined as the unlawful taking of property from another individual or entity through the use or threat of force involving a weapon or dangerous instrument.',
            'This offence shall be treated as a direct threat to public safety and order.'),
          a('2.1.4', 'Robbery', 'Class III Felony',
            'Defined as the taking of property through force, intimidation, or fear without the use of a weapon.',
            'Any act involving coercion against a citizen shall be prosecuted accordingly.'),
          a('2.1.5', 'Fraud', 'Class III Felony',
            'Defined as the intentional deception of an individual, institution, or state body for the purpose of obtaining financial or material gain.',
            'Includes falsification, misrepresentation, or concealment of relevant information.'),
          a('2.1.6', 'Identity Theft', 'Class III Felony',
            'Defined as the unauthorised use or assumption of another individual’s identity, credentials, or official documentation for personal, financial, or political gain.'),
          a('2.1.7', 'Abuse of Dominion Position', 'Class II Felony',
            'Defined as the misuse of one’s official position, authority, or role within a state or public institution for personal benefit or to the detriment of Dominion order.',
            'This includes preferential treatment, corruption, or deviation from assigned duties.'),
          a('2.1.8', 'Illegal Private Enterprise (Anti-Dominion Activity)', 'Class II Felony',
            'Defined as the establishment, operation, or participation in unauthorised private commercial activity conducted outside the framework of state control.',
            'Such acts shall be considered contrary to Aldmeri economic principles.'),
          a('2.1.9', 'Breach of Contract', 'Class II Misdemeanor',
            'Defined as the failure to fulfil the terms of a legally binding agreement, including delays, refusal of service, or actions resulting in financial or operational harm.'),
          a('2.1.10', 'Bribery', 'Class II Felony',
            'Defined as the offering, giving, receiving, or soliciting of any item of value in order to influence the actions of an official or individual in a position of authority.'),
          a('2.1.11', 'Failure to Pay', 'Class II Felony',
            'Defined as the intentional or negligent refusal to pay legally required fines, taxes, debts, or state-imposed financial obligations.'),
          a('2.1.12', 'Embezzlement', 'Class II Felony',
            'Defined as the misappropriation or theft of funds or property entrusted to an individual by virtue of their employment, position, or authority.'),
        ],
      },
      {
        code: '2.2',
        title: 'Organised Criminal Activity',
        articles: [
          a('2.2.1', 'Organized Crime', 'Class I Felony',
            'Defined as the coordinated involvement of multiple individuals in sustained criminal activity aimed at financial gain, subversion of the State, or disruption of public order.'),
          a('2.2.2', 'Gang Affiliation', 'Class II Felony',
            'Defined as the active participation, support, or membership in any group engaged in criminal conduct or activities contrary to state authority.'),
          a('2.2.3', 'Extortion', 'Class II Felony',
            'Defined as the act of obtaining property, services, or compliance through threats, coercion, or abuse of power.'),
          a('2.2.4', 'Racketeering', 'Class II Felony',
            'Defined as the systematic operation of illegal schemes or enterprises involving fraud, coercion, or exploitation for profit.'),
          a('2.2.5', 'Incitement to Violence', 'Class III Felony',
            'Defined as the encouragement, organisation, or promotion of violent acts against individuals, groups, or state institutions.'),
          a('2.2.6', 'Misprision of Felony', 'Class III Felony',
            'Defined as the knowing concealment or failure to report a serious criminal offence to the appropriate authorities.'),
        ],
      },
    ],
  },
  {
    id: 'controlled-items',
    numeral: 'III',
    title: 'Religious and Controlled Items',
    chapters: [
      {
        code: '3.1',
        title: 'Weapons Offences',
        articles: [
          a('3.1.1', 'Possession of Daedric and Talos Artifacts', 'Class I Felony',
            'Defined as the possession, concealment, or acquisition of any weapon, device, or artifact originating from or associated with Daedric or Talos entities without explicit authorisation from the State.',
            'Such acts shall be considered a direct threat to state security and Dominion order.'),
          a('3.1.2', 'Illegal Distribution of Religious Artifacts', 'Class I and II Felony',
            'Defined as the manufacture, transfer, sale, or provision of amulets, artifacts, or weapon components of prohibited Religions without proper state approval or licensing.',
            'This includes the supplying of artifacts to unauthorised individuals or groups.'),
          a('3.1.3', 'Illegal Discharge of a Device', 'Class III Felony',
            'Defined as the unauthorised or negligent use of a device in any public or private setting not sanctioned by the State.',
            'Where such discharge results in injury, damage, or public endangerment, enhanced penalties shall apply.'),
        ],
      },
      {
        code: '3.2',
        title: 'Controlled Substances and Restricted Items',
        articles: [
          a('3.2.1', 'Possession of Contraband', 'Class II Felony',
            'Defined as the possession of any item, substance, or material deemed prohibited or restricted by the State, including but not limited to illicit substances, unauthorised publications, foreign-controlled materials, or restricted equipment.',
            'All such items shall be subject to immediate confiscation.'),
          a('3.2.2', 'Distribution of Contraband', 'Class II Felony',
            'Defined as the production, transport, dissemination, or sale of any prohibited or restricted item or substance.',
            'This includes the circulation of materials intended to undermine state authority, public order, or Aldmeri ideology.'),
        ],
      },
    ],
  },
  {
    id: 'property-and-state',
    numeral: 'IV',
    title: 'Property Crimes and Crimes Against the State',
    chapters: [
      {
        code: '4.1',
        title: 'Property Offences',
        articles: [
          a('4.1.1', 'Trespassing', 'Class II Misdemeanor',
            'Defined as the unauthorised entry into, or remaining upon, property, land, or facilities owned or controlled by the State, public institutions, or private citizens without permission or lawful justification.'),
          a('4.1.2', 'Public Disorderliness', 'Class III Misdemeanor',
            'Defined as any conduct which disrupts public order, peace, or discipline within public spaces, including disturbances, obstruction, indecent exposure, or behaviour deemed incompatible with Dominion civic standards.'),
          a('4.1.3', 'Breach of Security', 'Class II Felony',
            'Defined as the unauthorised access to, interference with, or compromise of restricted areas, state facilities, or secured information systems.',
            'Such acts shall be considered a threat to state integrity and operational security.'),
          a('4.1.4', 'Criminal Mischief (Second Degree)', 'Class II Misdemeanor',
            'Defined as the intentional damage, defacement, or misuse of property resulting in minor loss or disruption.'),
          a('4.1.5', 'Criminal Mischief (First Degree)', 'Class III Felony',
            'Defined as the intentional destruction or significant damage to property belonging to the State, public institutions, or individuals, resulting in substantial loss.'),
          a('4.1.6', 'Felonious Criminal Mischief', 'Class II Felony',
            'Defined as large-scale or deliberate destruction of property, particularly where such acts disrupt public services, state operations, or infrastructure.'),
          a('4.1.7', 'Unlawful Search and/or Seizure', 'Class II Felony',
            'Defined as the unauthorised inspection, confiscation, or interference with property, documents, or personal effects without proper legal authority or state mandate.'),
        ],
      },
      {
        code: '4.2',
        title: 'Crimes Against the State',
        articles: [
          a('4.2.1', 'Espionage', 'Class I Felony',
            'Defined as the gathering, transmission, or attempted acquisition of information intended to be used by foreign or hostile entities to the detriment of the State.'),
          a('4.2.2', 'Treason', 'Class I Felony',
            'Defined as any act of betrayal against the State, including assistance to hostile forces, sabotage, or actions intended to weaken state authority.'),
          a('4.2.3', 'High Treason', 'Class I Felony',
            'Defined as acts intended to overthrow, destabilise, or fundamentally undermine the structure, leadership, or sovereignty of the State.'),
          a('4.2.4', 'Revolutionary Activity', 'Class I Felony',
            'Defined as the organisation, promotion, or participation in movements or actions aimed at altering or dismantling the established Dominion order of the State.'),
          a('4.2.5', 'Desertion', 'Class I Felony',
            'Defined as the abandonment of military or state-assigned duties without authorisation, particularly during times of heightened state necessity.'),
          a('4.2.6', 'Anti-State Propaganda', 'Class II Felony',
            'Defined as the creation, distribution, or promotion of materials, statements, or messages intended to undermine public confidence in the State, its leadership, or Aldmeri ideology.'),
          a('4.2.7', 'Failure to Report Subversive Activity', 'Class II Felony',
            'Defined as the knowing omission or refusal to report acts, intentions, or individuals engaged in behaviour contrary to state authority or public order.'),
          a('4.2.8', 'Attempted Defection (Flight av the Dominion)', 'Class I Felony',
            'Defined as any attempt to unlawfully exit the territory of the State without proper authorisation.',
            'Such acts shall be considered a direct offence against state sovereignty and security.'),
          a('4.2.9', 'Withholding Information from Authorities', 'Class II Felony',
            'Defined as the intentional concealment of information relevant to criminal investigations, state security, or public order when requested by authorised personnel.'),
          a('4.2.10', 'Obstruction of State Security Operations', 'Class II Felony',
            'Defined as any action which interferes with, delays, or prevents the lawful operations of state security forces or enforcement agencies.'),
          a('4.2.11', 'Possession of Unauthorized Enemy Media', 'Class II Felony',
            'Defined as the possession, distribution, or consumption of foreign media, publications, or materials not approved by the State, particularly those originating from hostile nations, where such materials may undermine Dominion order or public stability.'),
        ],
      },
    ],
  },
  {
    id: 'political',
    numeral: 'V',
    title: 'Political Crimes',
    chapters: [
      {
        code: '5.1',
        title: 'Crimes Against Governance and State Authority',
        articles: [
          a('5.1.1', 'Sedition', 'Class I Felony',
            'Defined as the encouragement, organisation, or participation in actions, speech, or activities intended to incite resistance, unrest, or opposition against the authority of the State or its governing bodies.'),
          a('5.1.2', 'Evidence Tampering', 'Class II Felony',
            'Defined as the alteration, concealment, destruction, or interference with evidence relevant to any investigation or judicial proceeding conducted by the State.'),
          a('5.1.3', 'Witness Tampering', 'Class II Felony',
            'Defined as the intimidation, coercion, or influence of any individual involved in a legal proceeding in order to affect testimony, cooperation, or the outcome of an investigation.'),
          a('5.1.4', 'Fabrication of Evidence', 'Class II Felony',
            'Defined as the creation or presentation of false or misleading evidence with the intent to deceive state authorities or judicial bodies.'),
          a('5.1.5', 'Perjury', 'Class II Felony',
            'Defined as the deliberate provision of false testimony or statements under oath during any official investigation or judicial proceeding.'),
          a('5.1.6', 'Subversion of Justice', 'Class I Felony',
            'Defined as any act intended to undermine, obstruct, or corrupt the lawful processes of the State’s judicial or enforcement systems.'),
          a('5.1.7', 'Subversion of War Effort', 'Class I Felony',
            'Defined as any act, statement, or omission which weakens, obstructs, or undermines the operational effectiveness or readiness of the State’s military or defence apparatus.'),
        ],
      },
      {
        code: '5.2',
        title: 'Conduct Against State Officials and Authority',
        articles: [
          a('5.2.1', 'Contempt Toward Officials', 'Class III Felony',
            'Defined as any act of disrespect, insult, or defiance directed toward a state official acting in their official capacity, where such conduct undermines authority or public order.'),
          a('5.2.2', 'Censorship Subversion', 'Class II Felony',
            'Defined as the unauthorised distribution, creation, or dissemination of materials intended to bypass, undermine, or violate state censorship regulations.'),
          a('5.2.3', 'Undermining Aldmeri Order', 'Class I Felony',
            'Defined as any conduct, speech, or activity which challenges, weakens, or destabilises the ideological, political, or social foundations of the Aldmeri State.'),
          a('5.2.4', 'Obstructing Official Duties', 'Class II Felony',
            'Defined as any act which interferes with, delays, or prevents a state official from carrying out their lawful responsibilities.'),
          a('5.2.5', 'Deprivation of Rights', 'Class II Felony',
            'Defined as the unlawful restriction or denial of rights granted to individuals under State authority, when conducted outside the bounds of authorised action.'),
        ],
      },
    ],
  },
  {
    id: 'law-enforcement',
    numeral: 'VI',
    title: 'Law Enforcement and Judicial Authority',
    chapters: [
      {
        code: '6.1',
        title: 'Offences Against Law Enforcement',
        articles: [
          a('6.1.1', 'Resisting Arrest', 'Class II Felony',
            'Defined as the intentional obstruction, resistance, or opposition to a lawful arrest or detainment conducted by authorised state personnel.',
            'This includes physical resistance, refusal to comply with lawful orders, or interference with enforcement procedures.'),
          a('6.1.2', 'Evading Arrest', 'Class II Felony',
            'Defined as any attempt to flee, avoid, or otherwise escape lawful apprehension by state authorities.',
            'Such acts shall be considered a direct challenge to state authority and enforcement operations.'),
          a('6.1.3', 'Escape from Custody', 'Class I Felony',
            'Defined as the unlawful departure or attempted departure from detention, imprisonment, or any form of authorised state custody.',
            'This includes assistance provided to others in escaping custody.'),
        ],
      },
      {
        code: '6.2',
        title: 'Judicial Conduct and Court Authority',
        articles: [
          a('6.2.1', 'Minor Contempt of Court', 'Class II Misdemeanor',
            'Defined as behaviour which disrupts court proceedings, shows disregard for judicial authority, or fails to comply with court directives in a non-severe manner.'),
          a('6.2.2', 'Criminal Contempt of Court', 'Class II Felony',
            'Defined as deliberate and serious acts of defiance, obstruction, or disrespect toward judicial authority, including refusal to comply with lawful orders or interference with proceedings.'),
          a('6.2.3', 'Failure to Testify', 'Class II Felony',
            'Defined as the refusal or failure to provide testimony, statements, or cooperation when lawfully required by a court or authorised investigative body.'),
        ],
      },
      {
        code: '6.3',
        title: 'Offences Against State Authority and Security',
        articles: [
          a('6.3.1', 'Impersonation of State Official', 'Class II Felony',
            'Defined as the unauthorised assumption of identity, authority, or role of a state official, including the use of uniforms, insignia, or credentials, for the purpose of deception or personal gain.'),
          a('6.3.2', 'Subversion of State Security', 'Class I Felony',
            'Defined as any act intended to undermine, disrupt, or interfere with the operations, authority, or effectiveness of state security forces or institutions.',
            'This includes assistance to hostile entities, interference with investigations, or actions compromising national security.'),
        ],
      },
    ],
  },
  {
    id: 'civic',
    numeral: 'VII',
    title: 'Additional Offences and Civic Conduct',
    chapters: [
      {
        code: '7.1',
        title: 'Violations of Civic Duty',
        articles: [
          a('7.1.1', 'Excessive Alcohol Consumption in Uniform', 'Class III Misdemeanor',
            'Defined as the consumption of alcohol excessively while in official uniform or during the execution of assigned duties, where such conduct undermines discipline, order, or the reputation of the State.'),
          a('7.1.2', 'Gross Incompetence', 'Class II Felony',
            'Defined as the repeated or severe failure to perform assigned duties to the standard required by the State, resulting in disruption, inefficiency, or harm to public or institutional operations.'),
          a('7.1.3', 'Insubordination', 'Class II Felony',
            'Defined as the refusal to comply with lawful orders, directives, or instructions issued by a superior or authorised state official.'),
          a('7.1.4', 'Falsification of Government Documents', 'Class II Felony',
            'Defined as the creation, alteration, or misuse of official documents, records, or identification issued by the State, with intent to deceive or mislead.'),
          a('7.1.5', 'Retaliation', 'Class II Felony',
            'Defined as any act of reprisal against an individual for cooperating with state authorities, participating in investigations, or fulfilling civic obligations.'),
          a('7.1.6', 'Failure to Identify', 'Class II Misdemeanor',
            'Defined as the refusal or failure to provide valid identification or required personal information when lawfully requested by authorised personnel.'),
        ],
      },
      {
        code: '7.2',
        title: 'Miscellaneous Ordinances',
        articles: [
          a('7.2.1', 'Criminal Negligence / Endangerment', 'Class II Felony',
            'Defined as conduct which, through negligence or disregard, places individuals, property, or public safety at risk of harm.'),
          a('7.2.2', 'Littering', 'Class III Misdemeanor',
            'Defined as the improper disposal of waste or materials in public or restricted areas, contributing to disorder or degradation of public spaces.'),
          a('7.2.3', 'Malingering', 'Class II Felony',
            'Defined as the intentional avoidance of assigned duties through deception, feigned illness, or deliberate non-compliance.'),
          a('7.2.4', 'Wearing Unauthorized Uniform Items', 'Class II Misdemeanor',
            'Defined as the use, display, or possession of uniforms, insignia, or decorations not issued or authorised by the State.'),
          a('7.2.5', 'Conduct Contrary to Aldmeri Order', 'Class II Felony',
            'Defined as any behaviour, action, or expression which disrupts public discipline, undermines social cohesion, or conflicts with the principles and expectations of Aldmeri society.'),
          a('7.2.6', 'Violation of District Bylaws', 'Class III Misdemeanor',
            'Defined as the failure to comply with local regulations, administrative directives, or district-level rules established under State authority.'),
          a('7.2.7', 'Defamation Against the State or Party', 'Class II Felony',
            'Defined as the dissemination of false, misleading, or harmful statements directed toward the State, its institutions, or its leadership, where such actions undermine public confidence or authority.'),
        ],
      },
    ],
  },
];

export const SIGNATORIES = [
  { name: 'Justiciar Lakkon Lourinien', office: 'High Justiciar of the Thalmor', signature: 'lourinien' },
  { name: 'Advisor Ariniel Aedbinder', office: 'Advisor of the Thalmor', signature: 'aedbinder' },
  { name: 'Emissary Ganaril Athiath', office: 'First Emissary of the Thalmor', signature: 'ganaril' },
] as const;
