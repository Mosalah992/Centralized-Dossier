// Troops Roster and Roster Statistics.

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Mark, Page, Registers, figure } from '../components/Page';

const statusClass = (status: string) =>
  `status status--${status.toLowerCase().replace(/\s+/g, '-')}`;

const tokenKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blank';

/** Unit is carried by a coloured dot beside the name of the wing, not a pill:
 *  one filled shape per row is enough colour to scan by. */
const unitDotClass = (unit: string) =>
  `roster-unit__dot roster-unit__dot--${tokenKey(unit)}`;

/**
 * Ranks are grouped into seniority tiers rather than coloured individually.
 * The sheet carries 23 distinct ranks; 23 colours is a rainbow, and colouring
 * only the rare senior ones leaves the bulk of the roster undifferentiated
 * grey. Six tiers stay scannable and cover every rank.
 *
 * Matched by substring, longest-specific first, so a rank added to the sheet
 * lands in a sensible tier instead of falling out of the scheme.
 */
const RANK_TIERS: [RegExp, string][] = [
  [/emissary|high justiciar|canonreeve|battlereeve|inquisitor|advisor/i, 'command'],
  [/justiciar/i, 'justiciar'],
  [/ambassador/i, 'diplomatic'],
  [/talon/i, 'talon'],
  [/officer|quartermaster|lead medical|steward/i, 'officer'],
  [/soldier/i, 'soldier'],
  [/staff|supply|medical|assistant/i, 'support'],
  [/recruit|intern/i, 'entry'],
];

const rankTier = (rank: string) =>
  RANK_TIERS.find(([pattern]) => pattern.test(rank))?.[1] ?? 'blank';

const rankClass = (rank: string) =>
  `roster-token roster-token--rank roster-token--tier-${rank ? rankTier(rank) : 'blank'}`;

export function RosterView() {
  const volume = useVolume('roster');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The register could not be read" body={volume.message} />;
  }

  const { members, total, byStatus } = volume.value.data;

  return (
    <Page
      title="Personnel Register"
      subtitle="Embassy of the Province of Skyrim"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={[
          { label: 'Current strength', value: figure(total) },
          ...byStatus.map((s) => ({ label: s.label, value: figure(s.count) })),
        ]}
      />

      {/* Ten columns did not fit the page and did not survive a phone at all.
          Race rides with the name and unit with the rank, which leaves eight
          columns wide enough to read; below 860px the same rows are restyled
          as cards by the data-label attributes. */}
      <div className="table-frame table-frame--roster">
        <table className="roster-table">
          <caption>Muster roll, by unit and rank</caption>
          <thead>
            <tr>
              <th scope="col">Name &amp; race</th>
              <th scope="col">Posting</th>
              <th scope="col">Status</th>
              <th scope="col" className="num">Hours</th>
              <th scope="col">Owed</th>
              <th scope="col">Paid</th>
              <th scope="col">Last active</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={`${member.row}-${member.name}`}>
                <th scope="row" className="roster-name">
                  {member.name}
                  {/* Race is descriptive rather than administrative, so it sits
                      under the name as a subline instead of holding a column. */}
                  <span className="roster-race">{member.race || 'Race unrecorded'}</span>
                </th>
                <td className="roster-posting" data-label="Posting">
                  {/* Titled because a long value is clipped to its column. */}
                  <span className={rankClass(member.rank)} title={member.rank || undefined}>
                    {member.rank || 'Unranked'}
                  </span>
                  <span className="roster-unit" title={member.unit || undefined}>
                    <span className={unitDotClass(member.unit)} />
                    {member.unit || 'Unassigned'}
                  </span>
                </td>
                <td className="roster-status" data-label="Status">
                  {member.status && (
                    <span className={statusClass(member.status)}>{member.status}</span>
                  )}
                </td>
                <td className="num" data-label="Hours">{member.hours.toFixed(2)}</td>
                <td data-label="Owed"><Mark on={member.owed} /></td>
                <td data-label="Paid"><Mark on={member.paid} /></td>
                <td data-label="Last active">{member.lastActive || '-'}</td>
                {/* Notes run to 188 characters. Wrapping them in full made rows
                    three times taller than their neighbours, so they are held
                    to two lines with the whole note on hover. */}
                <td className="roster-notes" data-label="Notes" title={member.notes || undefined}>
                  {/* The clamp lives on a span: -webkit-box on the td itself
                      stops it being a table-cell and skews the whole column. */}
                  <span className="roster-notes__clamp">{member.notes || '-'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page__source">
        Hours, activity and the owed mark are entered by the Embassy clock, not by hand.
      </p>
    </Page>
  );
}

export function StatisticsView() {
  const volume = useVolume('statistics');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The register could not be read" body={volume.message} />;
  }

  const { membership, corps, races, wings } = volume.value.data;

  return (
    <Page
      title="Roster Statistics"
      subtitle="Strength Returns"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={membership.map((m) => ({ label: m.label, value: figure(m.count) }))}
      />

      <div className="table-frame">
        <table>
          <caption>Corps by grade</caption>
          <thead>
            <tr>
              <th scope="col">Corps</th>
              {corps.tiers.map((tier) => (
                <th scope="col" className="num" key={tier}>{tier}</th>
              ))}
              <th scope="col" className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {corps.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {corps.tiers.map((tier) => (
                  // A blank in the sheet means the grade does not apply to this
                  // corps, which is not the same as none serving in it.
                  <td className="num" key={tier}>
                    {row.tiers[tier] === null ? '-' : figure(row.tiers[tier] ?? 0)}
                  </td>
                ))}
                <td className="num"><strong>{figure(row.total)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-frame">
        <table>
          <caption>By wing</caption>
          <tbody>
            {wings.map((wing) => (
              <tr key={wing.label}>
                <th scope="row">{wing.label}</th>
                <td className="num">{figure(wing.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-frame">
        <table>
          <caption>By race</caption>
          <tbody>
            {races.map((race) => (
              <tr key={race.label}>
                <th scope="row">{race.label}</th>
                <td className="num">{figure(race.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page__source">
        These returns are kept by hand and may lag the muster roll.
      </p>
    </Page>
  );
}
