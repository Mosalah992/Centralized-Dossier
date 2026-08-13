# Archive spreadsheet — parser contracts

Source: **Keizaal - Public 2 Server - Thalmor Roster**
(`1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0`), read via the
`ancarion@thalmor.iam.gserviceaccount.com` service account.

Captured **2026-08-13** by [scripts/dump-tabs.mjs](../scripts/dump-tabs.mjs).
Re-run it after any sheet restructure; dumps land in git-ignored `tmp/tabs/`.

The sheet is **authoritative**. The `thalmor-quartermaster` Worker
([Thalmor-HR-](https://github.com/Mosalah992/Thalmor-HR-)) writes Roster columns
G, H, J, K on Discord commands and Monday crons. This site reads; it must never
race those writes.

## Resolve tabs by title, never by gid

Two tabs changed between 2026-07-25 and 2026-08-13:

| Change | Detail |
|---|---|
| `To be paid` (gid 760122) | **deleted** |
| `Calendar` (gid 1078737758) | **replaced** by `Tamrielic Calendar 4E 226` (gid 1849230396) |

gids are not stable here, and the calendar title carries the in-world year, so it
will change again at the turn of 4E 227. Resolve every tab from
`spreadsheets?fields=sheets.properties` by title match, and treat a missing tab
as an empty volume rather than an error.

## The six volumes

The `Index` tab is the in-sheet original of the archive's six-book shelf — the
labels below are its own.

| Volume | Tab title | Match rule |
|---|---|---|
| Troops Roster | `Roster` | exact, also gid 0 |
| Roster Statistics | `Stats` | exact |
| Financial Ledger | `Ledger` | exact |
| Stipends Registry | `Stipends` | exact |
| Hall of Honor | `Hall of Honor` | exact |
| Tamrielic Calendar | `Tamrielic Calendar 4E 226` | prefix `Tamrielic Calendar` |

`Index` and `Draft` are not published.

Every tab ends with a footer row `■ For the glory of the Third Aldmeri Dominion ■`
and opens with a title row in `■ … ■` or `❖ … ❖`. Parsers drop both.

## Roster — `A4:K`, headers row 3

`A Unit | B Rank | C Name | D Race | E Discord | F Status | G Owed ☑ | H Paid ☑ | I Notes | J Last Active | K Total Hours`

101 member rows. Rows without a `C Name` are skipped. `E Discord` may hold
several handles separated by `/`. `F Status` is upper-case
(`ACTIVE`, `INACTIVE`, `ABSENT`, `LOA`, `JUST JOINED`, `ARRESTED`).
`G`/`H` are booleans; `K` is a float reset every Monday.

Bot-owned columns — **display only, never edit from this site in phase 1**: G, H, J, K.

## Stats — `A1:O21`

Not a table: four independent blocks on one grid, read by fixed offsets.

| Block | Cells | Shape |
|---|---|---|
| Membership | `B4:C10` | label → count (`TOTAL MEMBERS` 99, `ACTIVE` 61, `INACTIVE`, `ABSENT`, `LOA`, `JUST JOINED`, `ARRESTED`) |
| Corps by tier | `E4:I18` | row label × columns `JUNIOR/SENIOR/ELITE/LEADER` (header in row 3), blanks = 0 |
| Race | `K4:L16` | race → count |
| Wing | `N4:O7` | `Command`, `Militant Wing`, `Diplomatic Wing`, `Administrative Wing` |

Counts are stale relative to `Roster` (99 vs 101 rows). Render them as the
sheet's own tally; do not recompute or reconcile.

## Ledger — `A1:M32`, hand-maintained

Three blocks. **Pay is computed by live sheet formulas** — `# Actives` cells are
`COUNTIFS` over the Roster `Owed` checkboxes per tier and `Total = Payment ×
# Actives`. Read the computed values; never reimplement the arithmetic.

| Block | Rows | Columns |
|---|---|---|
| Pay tiers | 5–13 | `Role \| Payment \| Owed \| Total \| Paid \| Names` |
| Total active troops owed | 14 | single figure |
| Expenses & reimbursements | 17–26 | `Expense \| Amount \| To \| Paid ☑ \| Description` |
| Summary | ~28 | troops wages, expenses, total weekly expense, estimated balance |

Amounts can be negative (`Promotion Wage adjustment`, −200). The `Names` column
is free text, sometimes an explanation rather than names.

## Stipends — `A2:G`

`Week | Amount Received | Amount Spent | Balance`, data from row 4, four weeks so
far. `F2` labels and `G3` holds the running **Balance for the Week** (45,000).

`Week` is a **two-line in-world date range** with an embedded newline:

```
Mondas, 13th of Sun's Height 4E 226
Sundas, 19th of Sun's Height 4E 226
```

Split on `\n` into `from`/`to`. Numbers are comma-formatted strings — strip
separators before use, and keep the formatted string for display.

**`Balance` is not a reliable computation.** Only the first row carries the
`=C4-D4` formula; every later balance is typed by hand, and as of 2026-08-13 the
most recent week reads `25,000 − 4,000 = 22,000` where the arithmetic gives
21,000 — a 1,000 septim discrepancy. The archive renders what the treasury
wrote and does not reconcile it, so no parser or test may assume
`received − spent === balance`.

## Hall of Honor — `B4:C`

`Name | Citation`. Six entries, honorifics included in the name
(`First Emissary Indumoril Lourinien`). Free text, no dates. Trailing blank rows
to row 22 are padding.

## Tamrielic Calendar — needs grid formatting, not values

**The values are only day numbers. The meaning is in cell background colour and
cell notes**, so this volume must be fetched with
`spreadsheets.get?includeGridData=true` requesting
`rowData(values(formattedValue,note,effectiveFormat(backgroundColor)))` —
`values.get` is insufficient.

Layout: 12 months in a 3 × 4 arrangement. Month title rows 4/14/24, weekday
header rows 5/15/25 (`Sundas … Loredas`), day grids beneath. Months sit in
column groups of 7 separated by one blank column.

365 day cells verified against this legend (rows 35–38, swatch in column B):

| Colour | Meaning | Count |
|---|---|---|
| `#e7cb74` | Audit — every seal verified against the ledger | 4 |
| `#e3ede8` | Tamrielic festival — watch for unlawful observance | 12 |
| `#faf0d6` | Morndas — weekly reconciliation of the ledger | 50 |
| `#eae4d3` | Ordinary day | 299 |

16 cells carry notes, which are the hover text for festivals and audits:

```
Witches' Festival
Frostfall 13, 4E 226
Watch for unlawful observance.
```

Line 1 is the event name, line 2 the in-world date, line 3 optional. Read the
legend swatches at runtime rather than hard-coding the four hex values — the
colours are the sheet's, and re-theming it should not break the parser.
