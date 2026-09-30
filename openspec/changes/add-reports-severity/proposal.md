# Reports severity classification

## Outcome

Reports gain a deterministic severity classification from an explicit
standalone field in the official Discord report templates. Readers can filter by severity and see a restrained
archive-style classification stamp on each filing.

## Scope and boundaries

- Touches the Reports Worker, dedicated Reports D1 database, protected
  `/api/reports` contract, and Reports reader.
- Does not touch Google Sheets, member data, Chronicle access, or public
  browser-bundled report text. The Reports gate remains the sole authorization
  boundary and responses remain private/no-store.
- Valid values are informational, low, medium, high, critical, and unassessed.
  Missing or unrecognised metadata is unassessed; it is never silently low.

## Verification

Unit-test parsing and filtering, query validation, and D1 persistence wiring;
run `npm run verify`; test the feature on a Pages preview; then migrate D1,
deploy the collector, and verify the protected production API and reader.
