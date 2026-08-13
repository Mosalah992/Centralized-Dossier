// Financial Ledger and Stipends Registry.
//
// Both are hand-kept by the treasury. Figures are shown exactly as written —
// the archive reports the ledger, it does not audit it.

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Mark, Page, Registers, figure } from '../components/Page';

export function LedgerView() {
  const volume = useVolume('ledger');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The ledger could not be read" body={volume.message} />;
  }

  const { tiers, totalActiveTroopsOwed, expenses, summary, commentary } = volume.value.data;
  const wages = tiers.reduce((sum, tier) => sum + tier.total, 0);

  return (
    <Page
      title="Financial Ledger"
      subtitle="Weekly Disbursements & Expenses"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={[
          ...(totalActiveTroopsOwed !== null
            ? [{ label: 'Troops owed', value: figure(totalActiveTroopsOwed) }]
            : []),
          { label: 'Wages due', value: figure(wages) },
          ...summary.map((s) => ({ label: s.label, value: s.value })),
        ]}
      />

      <div className="table-frame">
        <table>
          <caption>Weekly owed pay, by rank</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col" className="num">Payment</th>
              <th scope="col" className="num">Owed</th>
              <th scope="col" className="num">Total</th>
              <th scope="col" className="num">Paid</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.row}>
                <th scope="row">{tier.role}</th>
                <td className="num">{figure(tier.payment)}</td>
                <td className="num">{figure(tier.owed)}</td>
                <td className="num"><strong>{figure(tier.total)}</strong></td>
                {/* A count of those already paid, not a checkbox. */}
                <td className="num">{figure(tier.paidCount)}</td>
                <td className="wrap">{tier.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-frame">
        <table>
          <caption>Expenses & reimbursements</caption>
          <thead>
            <tr>
              <th scope="col">Expense</th>
              <th scope="col" className="num">Amount</th>
              <th scope="col">To</th>
              <th scope="col">Settled</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.row}>
                <th scope="row">{expense.expense}</th>
                <td className="num">{figure(expense.amount)}</td>
                <td>{expense.to || '—'}</td>
                {/* Here Paid *is* a checkbox. Same word, different column. */}
                <td><Mark on={expense.paid} /></td>
                <td className="wrap">{expense.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {commentary && <p className="commentary">{commentary}</p>}
    </Page>
  );
}

export function StipendsView() {
  const volume = useVolume('stipends');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The registry could not be read" body={volume.message} />;
  }

  const { weeks, balanceForWeek } = volume.value.data;

  return (
    <Page
      title="Imperial Mint Stipend Registry"
      subtitle="Receipts & Expenditure"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={[
          { label: 'Balance for the week', value: balanceForWeek || '—' },
          { label: 'Weeks recorded', value: figure(weeks.length) },
        ]}
      />

      <div className="table-frame">
        <table>
          <caption>Stipends received and spent, by week</caption>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col" className="num">Received</th>
              <th scope="col" className="num">Spent</th>
              <th scope="col" className="num">Balance</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.row}>
                <th scope="row" className="wrap">
                  {week.from}
                  <br />
                  {week.to}
                </th>
                {/* The sheet's own formatting is kept — these are transcriptions. */}
                <td className="num">{week.display.received}</td>
                <td className="num">{week.display.spent}</td>
                <td className="num"><strong>{week.display.balance}</strong></td>
                <td className="wrap">{week.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page__source">
        Balances are entered by the treasury and are reproduced here as written.
      </p>
    </Page>
  );
}
