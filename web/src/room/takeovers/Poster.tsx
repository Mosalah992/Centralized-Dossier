// A wanted poster: the portrait, then the particulars. Ported from the Bruma
// Joint Archives. The portrait is the filer's own sketch (bounty.portrait) if
// they gave one; otherwise the race's pencil sketch from public/art/portraits/
// (the Bruma set, cut by its scripts/prepare-portraits.mjs); otherwise a
// charcoal silhouette, which is all a female bounty gets until those sketches
// are drawn.

import { useState } from 'react';

import { RACE_NAMES, type Bounty } from '../../../../shared/room';

/** The race sketches that exist. The female set has not been drawn yet. */
const SKETCHED = new Set(['male']);

/** Charcoal head-and-shoulders, with a hint of the race where a silhouette can show one. */
function Silhouette({ race, gender }: Pick<Bounty, 'race' | 'gender'>) {
  const ears = race === 'altmer' || race === 'bosmer' || race === 'dunmer';
  const snout = race === 'argonian';
  const catEars = race === 'khajiit';
  const tusks = race === 'orsimer';
  const long = gender === 'female';
  return (
    <svg viewBox="0 0 100 110" aria-hidden="true">
      <rect width="100" height="110" fill="#d9c79f" />
      <g fill="#3a2c1c">
        <path d="M14 110c2-22 16-32 36-32s34 10 36 32Z" />
        {long && <path d="M28 46c-2 18 2 30 8 36h28c6-6 10-18 8-36Z" />}
        {snout ? <path d="M36 34c4-12 24-12 28 0l12 16c-4 8-14 12-26 12-12 0-20-6-22-14Z" /> : <ellipse cx="50" cy="46" rx="18" ry="22" />}
        {ears && <path d="M33 44 20 30l15 8ZM67 44 80 30l-15 8Z" />}
        {catEars && <path d="M34 30l2-14 10 10ZM66 30l-2-14-10 10Z" />}
        <rect x="44" y="64" width="12" height="14" />
      </g>
      {tusks && <path d="M44 58l-2-6M56 58l2-6" stroke="#e9dcbc" strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  );
}

export function PortraitImage({ bounty }: { bounty: Pick<Bounty, 'race' | 'gender' | 'portrait'> }) {
  const [own, setOwn] = useState(!!bounty.portrait);
  const [sketch, setSketch] = useState(SKETCHED.has(bounty.gender));
  if (bounty.portrait && own) {
    return <img className="slot__img poster__own" src={bounty.portrait} alt="" draggable={false} onError={() => setOwn(false)} />;
  }
  if (sketch) {
    return (
      <img
        className="slot__img"
        src={`/art/portraits/${bounty.race}-${bounty.gender}.webp`}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        onError={() => setSketch(false)}
      />
    );
  }
  return <Silhouette race={bounty.race} gender={bounty.gender} />;
}

export function Poster({ bounty, compact = false }: { bounty: Bounty; compact?: boolean }) {
  return (
    <div className={`poster${compact ? ' poster--compact' : ''}`}>
      <p className="poster__head">Wanted</p>
      <span className="poster__portrait">
        <PortraitImage bounty={bounty} />
      </span>
      <p className="poster__name">{bounty.name}</p>
      {bounty.aliases && <p className="poster__aliases">also called {bounty.aliases}</p>}
      <p className="poster__race">
        {RACE_NAMES[bounty.race]} · {bounty.gender}
      </p>
      {!compact && (
        <>
          <p className="poster__crimes">{bounty.crimes}</p>
          {bounty.lastSeen && <p className="poster__seen">Last seen: {bounty.lastSeen}</p>}
        </>
      )}
      <p className="poster__reward">Reward · {bounty.reward}</p>
    </div>
  );
}
