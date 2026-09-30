// Discord collection policy is configuration, not branching logic. IDs may
// name a category (whose children become subcategories), a text channel, or a
// forum; the collector resolves the actual shape from the guild channel list.

export const REPORT_CATEGORIES = [
  { name: 'Logistics', id: '1526756172407898153', childChannels: 'reports-only' },
  { name: 'Administration', id: '1532759696409100358', childChannels: 'reports-only' },
  { name: 'Mining', id: '1525961226302263316', childChannels: 'reports-only' },
  { name: 'Supply', id: '1499127049665642589', childChannels: 'reports-only' },
  // These categories file reports under in-world names rather than channel
  // names ending in "report". Their category boundary is the allowlist.
  { name: 'Military', id: '1553839347839799366', childChannels: 'all' },
  { name: 'Informants', id: '1552101337674817726', childChannels: 'all' },
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number];

export const SCHEDULE = '17 */6 * * *';
