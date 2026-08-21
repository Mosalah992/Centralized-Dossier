// Troops Roster. The statistics that used to share this file became the Order
// of Precedence and moved to views/Precedence.tsx.
//
// The roll runs to about a hundred names, and until now the only way to find one
// was to scroll. It can now be searched, narrowed by wing, seniority and status,
// and ordered by any column that has an order — see roster-filter.ts, which
// holds all of that as plain functions so this file stays concerned with ink.

import { useMemo, useState } from 'react';
import { Tooltip } from '@fluentui/react-components';

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Mark, Page, Registers, figure } from '../components/Page';
import { Sieve } from '../fluent/Sieve';
import { SortHeader } from '../fluent/SortHeader';
import {
  NO_SIEVE,
  TIER_LABELS,
  rankTier,
  siftRoster,
  statusesOf,
  tiersOf,
  unitsOf,
} from './roster-filter';
import type { Sort } from './roster-filter';

const statusClass = (status: string) =>
  `status status--${status.toLowerCase().replace(/\s+/g, '-')}`;

const tokenKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blank';

/** Unit is carried by a coloured dot beside the name of the wing, not a pill:
 *  one filled shape per row is enough colour to scan by. */
const unitDotClass = (unit: string) =>
  `roster-unit__dot roster-unit__dot--${tokenKey(unit)}`;

const rankClass = (rank: string) =>
  `roster-token roster-token--rank roster-token--tier-${rank ? rankTier(rank) : 'blank'}`;

export function RosterView() {
  const volume = useVolume('roster');
  const [sieve, setSieve] = useState(NO_SIEVE);

  /**
   * Null is the register's own order — by wing, then by rank, as the Embassy
   * keeps it. That is the state the page opens in and the state a third click
   * on a column returns to.
   */
  const [sort, setSort] = useState<Sort | null>(null);

  const members = volume.state === 'ready' ? volume.value.data.members : [];

  // Options are read off the roll rather than listed here, so a wing or a
  // status added to the sheet appears in the controls without a deploy.
  const units = useMemo(() => unitsOf(members), [members]);
  const statuses = useMemo(() => statusesOf(members), [members]);
  const tiers = useMemo(() => tiersOf(members), [members]);
  const shown = useMemo(() => siftRoster(members, sieve, sort), [members, sieve, sort]);

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The register could not be read" body={volume.message} />;
  }

  const { total, byStatus } = volume.value.data;

  return (
    <Page
      title="Personnel Register"
      subtitle="Embassy of the Province of Skyrim"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      {/* The register's own figures, and they stay the register's: these are
          what the Embassy counts, not what the reader has narrowed to. The
          sieve reports its own tally separately. */}
      <Registers
        items={[
          { label: 'Current strength', value: figure(total) },
          ...byStatus.map((s) => ({ label: s.label, value: figure(s.count) })),
        ]}
      />

      <Sieve
        searchLabel="Search the roll"
        placeholder="a name, a rank, a wing…"
        query={sieve.query}
        onQuery={(query) => setSieve((s) => ({ ...s, query }))}
        shown={shown.length}
        total={members.length}
        noun="names"
        filters={[
          {
            id: 'unit',
            label: 'Wing',
            all: 'All wings',
            value: sieve.unit,
            onChange: (unit) => setSieve((s) => ({ ...s, unit })),
            options: units.map((unit) => ({ value: unit, label: unit })),
          },
          {
            id: 'tier',
            label: 'Seniority',
            all: 'All ranks',
            value: sieve.tier,
            onChange: (tier) => setSieve((s) => ({ ...s, tier })),
            options: tiers.map((tier) => ({ value: tier, label: TIER_LABELS[tier] ?? tier })),
          },
          {
            id: 'status',
            label: 'Standing',
            all: 'Any standing',
            value: sieve.status,
            onChange: (status) => setSieve((s) => ({ ...s, status })),
            options: statuses.map((status) => ({ value: status, label: status })),
          },
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
              {/* Owed, Paid and Notes are not ordered by. The first two hold two
                  values and sorting them only groups a column of marks; the
                  third is prose, and alphabetising a note says nothing. */}
              <SortHeader column="name" label="Name & race" sort={sort} onSort={setSort} />
              <SortHeader column="posting" label="Posting" sort={sort} onSort={setSort} />
              <SortHeader column="status" label="Status" sort={sort} onSort={setSort} />
              <SortHeader
                column="hours"
                label="Hours"
                sort={sort}
                onSort={setSort}
                className="num"
              />
              <th scope="col">Owed</th>
              <th scope="col">Paid</th>
              <SortHeader column="lastActive" label="Last active" sort={sort} onSort={setSort} />
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {/* A sieve that catches nothing must say so. Without this the table
                collapses to a header row, which reads as the register having
                failed to load rather than as the reader having narrowed it too
                far. */}
            {shown.length === 0 && (
              <tr>
                {/* Styled inline rather than given a class: it is one rule for
                    one element, and ledger.css is not touched by this pass. */}
                <td colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                  No name on the roll answers to that.
                </td>
              </tr>
            )}
            {shown.map((member) => (
              <tr key={`${member.row}-${member.name}`}>
                <th scope="row" className="roster-name">
                  {member.name}
                  {/* Race is descriptive rather than administrative, so it sits
                      under the name as a subline instead of holding a column. */}
                  <span className="roster-race">{member.race || 'Race unrecorded'}</span>
                </th>
                <td className="roster-posting" data-label="Posting">
                  {/*
                    These three tooltips replace `title` attributes. The values
                    are clipped by CSS, not truncated in the markup, so the full
                    text has always been in the DOM and a screen reader has
                    always had it — what was missing was a way for a sighted
                    reader to see it in something better than the browser's
                    own grey box, half a second late and unthemed.

                    None of the triggers is given a tabIndex, and that is a
                    decision rather than an omission: three focusable spans on a
                    hundred rows is three hundred tab stops between the top of
                    the table and the bottom of it, which is a worse keyboard
                    experience than the one being fixed. Reaching clipped text
                    by keyboard needs an affordance per row, not a stop per cell.
                  */}
                  <Tooltip content={member.rank || 'Unranked'} relationship="label" withArrow>
                    <span className={rankClass(member.rank)}>
                      {member.rank || 'Unranked'}
                    </span>
                  </Tooltip>
                  <Tooltip content={member.unit || 'Unassigned'} relationship="label" withArrow>
                    <span className="roster-unit">
                      <span className={unitDotClass(member.unit)} />
                      {member.unit || 'Unassigned'}
                    </span>
                  </Tooltip>
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
                <td className="roster-notes" data-label="Notes">
                  {/* The clamp lives on a span: -webkit-box on the td itself
                      stops it being a table-cell and skews the whole column. */}
                  {member.notes ? (
                    // Described rather than labelled: unlike the rank and the
                    // wing, the visible clamp is a real fragment of the note
                    // and should not be replaced by it.
                    <Tooltip content={member.notes} relationship="description" withArrow>
                      <span className="roster-notes__clamp">{member.notes}</span>
                    </Tooltip>
                  ) : (
                    <span className="roster-notes__clamp">-</span>
                  )}
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
