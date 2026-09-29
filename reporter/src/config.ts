// Discord collection policy is configuration, not branching logic. IDs may
// name a category (whose children become subcategories), a text channel, or a
// forum; the collector resolves the actual shape from the guild channel list.

export const REPORT_CATEGORIES = [
  { name: 'Logistics', id: '1526756172407898153' },
  { name: 'Administration', id: '1532759696409100358' },
  { name: 'Mining', id: '1525961226302263316' },
  { name: 'Supply', id: '1499127049665642589' },
  { name: 'Military', id: '1553839347839799366' },
  { name: 'Informants', id: '1552101337674817726' },
] as const;

export const SCHEDULE = '17 */6 * * *';
