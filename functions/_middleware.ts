// Canonical-host middleware for the entire Pages application, including static
// assets. A permanent redirect here avoids maintaining a second public origin
// while leaving preview hostnames available for feature validation.

import { canonicalRedirect } from './lib/canonical';

export const onRequest: PagesFunction = async (context) => {
  const destination = canonicalRedirect(context.request);
  if (destination) return Response.redirect(destination, 308);
  return context.next();
};
