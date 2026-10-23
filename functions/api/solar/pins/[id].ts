// PATCH /api/solar/pins/:id moves or renames a piece; DELETE takes it up.
// Behind the Solar writ (functions/lib/solar-pins.ts).

import { d1PinStore } from '../../../lib/solar-d1';
import { handlePin } from '../../../lib/solar-pins';
import type { SolarEnv } from '../../../lib/solar';

interface Env extends SolarEnv {
  REPORTS?: D1Database;
}

export const onRequest: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handlePin(request, env, env.REPORTS ? d1PinStore(env.REPORTS) : null, String(params.id ?? ''));
