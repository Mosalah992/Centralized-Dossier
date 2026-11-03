import type { CSSProperties } from 'react';

import sheet from '../../assets/pixel/icons/sheet.png';
import { ICON_NAMES, ICON_SIZE, SHEET_COLUMNS, type IconName } from './manifest';

type PixelIconProps = {
  name: IconName;
  /**
   * Screen pixels per icon pixel. Only whole numbers keep every pixel the
   * same size, so anything else is rounded down (never below 1). 'px' draws
   * it at the page's art pixel (--px, web/src/pixel/scale.ts), which is a
   * whole number of device pixels, so the icon matches the art around it.
   */
  scale?: number | 'px';
  /** What the icon says, for a screen reader. Without one it is decorative. */
  label?: string;
  className?: string;
};

// One sheet for the whole set, so a board of icons is a single request. The
// browser scales it with nearest-neighbour (image-rendering applies to
// background images too), and because the size and offsets are whole
// multiples of the icon grid no neighbouring icon can bleed in at the edges.
export function PixelIcon({ name, scale = 1, label, className }: PixelIconProps) {
  const index = ICON_NAMES.indexOf(name);
  const [col, row] = [index % SHEET_COLUMNS, Math.floor(index / SHEET_COLUMNS)];
  const factor = scale === 'px' ? 0 : Math.max(1, Math.floor(scale));
  const unit = (n: number) => (scale === 'px' ? `calc(${n} * var(--px))` : `${n * factor}px`);
  const style: CSSProperties = {
    display: 'inline-block',
    flex: 'none',
    width: unit(ICON_SIZE),
    height: unit(ICON_SIZE),
    backgroundImage: `url(${sheet})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${unit(SHEET_COLUMNS * ICON_SIZE)} auto`,
    backgroundPosition: `${unit(-col * ICON_SIZE)} ${unit(-row * ICON_SIZE)}`,
    imageRendering: 'pixelated',
  };
  return label ? (
    <span role="img" aria-label={label} className={className} style={style} />
  ) : (
    <span aria-hidden="true" className={className} style={style} />
  );
}
