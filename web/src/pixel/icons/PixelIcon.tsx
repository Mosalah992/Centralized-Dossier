import type { CSSProperties } from 'react';

import sheet from '../../assets/pixel/icons/sheet.png';
import { ICON_NAMES, ICON_SIZE, SHEET_COLUMNS, type IconName } from './manifest';

type PixelIconProps = {
  name: IconName;
  /**
   * Screen pixels per icon pixel. Only whole numbers keep every pixel the
   * same size, so anything else is rounded down (never below 1).
   */
  scale?: number;
  /** What the icon says, for a screen reader. Without one it is decorative. */
  label?: string;
  className?: string;
};

// One sheet for the whole set, so a board of icons is a single request. The
// browser scales it with nearest-neighbour (image-rendering applies to
// background images too), and because the size and offsets are whole
// multiples of the icon grid no neighbouring icon can bleed in at the edges.
export function PixelIcon({ name, scale = 1, label, className }: PixelIconProps) {
  const factor = Math.max(1, Math.floor(scale));
  const size = ICON_SIZE * factor;
  const index = ICON_NAMES.indexOf(name);
  const style: CSSProperties = {
    display: 'inline-block',
    flex: 'none',
    width: size,
    height: size,
    backgroundImage: `url(${sheet})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${SHEET_COLUMNS * size}px auto`,
    backgroundPosition: `${-(index % SHEET_COLUMNS) * size}px ${-Math.floor(index / SHEET_COLUMNS) * size}px`,
    imageRendering: 'pixelated',
  };
  return label ? (
    <span role="img" aria-label={label} className={className} style={style} />
  ) : (
    <span aria-hidden="true" className={className} style={style} />
  );
}
