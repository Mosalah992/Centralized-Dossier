// An element's place on the pixel stage, as CSS variables in art pixels
// (room.css, .px-at, turns them into position and size).

import type { CSSProperties } from 'react';

import type { Place } from './layout';

export const at = ({ x, y, w, h }: Place): CSSProperties => ({ '--x': x, '--y': y, '--w': w, '--h': h }) as CSSProperties;
