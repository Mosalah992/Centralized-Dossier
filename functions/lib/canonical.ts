/** The one public address used in links, metadata, and edge redirects. */
export const CANONICAL_ORIGIN = 'https://thalmor-archives.com';

/**
 * Pages keeps its project hostname for previews and operational access, but it
 * is not a second public site. Redirect only the production Pages hostname;
 * preview branches have names such as `branch.thalmor-archives.pages.dev` and
 * must remain available for the feature-preview gate.
 */
export function canonicalRedirect(request: Request): string | null {
  const url = new URL(request.url);
  if (url.hostname !== 'thalmor-archives.pages.dev') return null;

  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}${url.hash}`;
}
