// GET /api/solar/pins: the war table's pieces. POST: set one down.
// Behind the Solar writ (functions/lib/solar-pins.ts).

import { d1PinStore } from '../../../lib/solar-d1';
import { handlePins } from '../../../lib/solar-pins';
import type { SolarEnv } from '../../../lib/solar';

interface Env extends SolarEnv {
  REPORTS?: D1Database;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) =>
  handlePins(request, env, env.REPORTS ? d1PinStore(env.REPORTS) : null);
