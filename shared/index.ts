// Public surface of the shared layer: pure parsing and the volume registry.
// No I/O lives here, so every export is unit-testable from Node and reusable by
// both the Worker and the web app.

export * from './types';
export * from './text';
export * from './volumes';

export { parseRoster, summarize, handleParts, ROSTER_START_ROW } from './parsers/roster';
export { parseStats } from './parsers/stats';
export { parseLedger } from './parsers/ledger';
export { parseStipends } from './parsers/stipends';
export { parseHonor } from './parsers/honor';
export { parseCalendar, eventsOf, WEEKDAYS, MONTHS } from './parsers/calendar';
