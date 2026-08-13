// Troops Roster and Roster Statistics.

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Mark, Page, Registers, figure } from '../components/Page';

const statusClass = (status: string) =>
  `status status--${status.toLowerCase().replace(/\s+/g, '-')}`;

const tokenKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blank';

const tokenClass = (kind: 'unit' | 'rank' | 'race', value: string) =>
  `roster-token roster-token--${kind} roster-token--${kind}-${tokenKey(value)}`;

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

      <div className="table-frame">
        <table className="roster-table">
          <caption>Muster roll, by unit and rank</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Unit</th>
              <th scope="col">Rank</th>
              <th scope="col">Race</th>
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
                <th scope="row" className="roster-name">{member.name}</th>
                <td>
                  {/* Titled because a long value is clipped to its column. */}
                  <span className={tokenClass('unit', member.unit)} title={member.unit || undefined}>
                    {member.unit || '-'}
                  </span>
                </td>
                <td>
                  <span className={rankClass(member.rank)} title={member.rank || undefined}>
                    {member.rank || '-'}
                  </span>
                </td>
                {/* Race is descriptive rather than administrative, so it reads
                    as plain text — one less pill, and the table fits. */}
                <td className="roster-race">{member.race || '-'}</td>
                <td>
                  {member.status && (
                    <span className={statusClass(member.status)}>{member.status}</span>
                  )}
                </td>
                <td className="num">{member.hours.toFixed(2)}</td>
                <td><Mark on={member.owed} /></td>
                <td><Mark on={member.paid} /></td>
                <td>{member.lastActive || '-'}</td>
                {/* Notes run to 188 characters. Wrapping them made rows three
                    times taller than their neighbours, so they are clipped to
                    one line with the full text on hover. */}
                <td className="roster-notes" title={member.notes || undefined}>
                  {member.notes || '-'}
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
