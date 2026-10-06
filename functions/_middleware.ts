// Canonical-host middleware for the entire Pages application, including static
// assets. A permanent redirect here avoids maintaining a second public origin
// while leaving preview hostnames available for feature validation.

import { guardAssetFallback } from './lib/assets';
import { canonicalRedirect } from './lib/canonical';
import { withSecurityHeaders } from './lib/security';

export const onRequest: PagesFunction = async (context) => {
  const destination = canonicalRedirect(context.request);
  const response = destination
    ? Response.redirect(destination, 308)
    : guardAssetFallback(context.request, await context.next());
  return withSecurityHeaders(response);
};
