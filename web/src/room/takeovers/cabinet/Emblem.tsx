// The wings' emblems, struck into each letter's wax: the eye of Intelligence,
// the crossed blades of the Military, the key of Logistics, the laurel of the
// Chancery, the scales of the Legal office, and Scholarship's eight-pointed
// star. Drawn on a 24-unit square in the wax's light ink.

import type { Emblem as EmblemName } from '../../../../../shared/wings';

const PATHS: Record<EmblemName, string[]> = {
  eye: ['M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  blades: ['M4 4l13 13', 'M20 4 7 17', 'M15 19l4-4M5 15l4 4', 'M3 21l2.5-2.5M21 21l-2.5-2.5'],
  key: ['M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M11 10.5 20 19.5', 'M16 15.5l2-2M18.5 18l2-2'],
  laurel: ['M12 21C7 18 5 13 6 7', 'M12 21c5-3 7-8 6-14', 'M6.5 10C4.5 9.5 3.5 8 3.5 6.5 5.5 7 6.5 8.3 6.5 10Z', 'M7 14c-2 0-3.3-1.2-3.8-2.8 2-.1 3.3.9 3.8 2.8Z', 'M17.5 10c2-.5 3-2 3-3.5-2 .5-3 1.8-3 3.5Z', 'M17 14c2 0 3.3-1.2 3.8-2.8-2-.1-3.3.9-3.8 2.8Z'],
  scales: ['M12 3v17', 'M8 20h8', 'M5 7h14', 'M5 7l-2.5 6h5Z', 'M19 7l-2.5 6h5Z'],
  star: ['M12 2l1.8 5.2L19 5l-2.2 5.2L22 12l-5.2 1.8L19 19l-5.2-2.2L12 22l-1.8-5.2L5 19l2.2-5.2L2 12l5.2-1.8L5 5l5.2 2.2Z'],
};

export function Emblem({ name, size = 18 }: { name: EmblemName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
