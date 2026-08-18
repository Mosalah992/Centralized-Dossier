// The archive's boundary, in one place and on its own.
//
// Every /api/* route not named here requires a writ — see api/_middleware.ts,
// which is the only thing that reads this. It lives in its own module rather
// than in the middleware because the middleware is full of Workers types and
// this is a set of strings: keeping them apart is what lets the test suite
// assert the boundary without dragging the Cloudflare runtime into the browser
// TypeScript project.
//
// A line added here publishes a route to the whole internet. There is a test
// that fails when this list changes, on purpose — see test/middleware.test.ts.

export const PUBLIC_PATHS = new Set([
  // The gate itself: how a reader with no writ offers the word.
  "/api/gate",

  // The second door. `login` only mints a nonce and redirects to Discord;
  // `callback` refuses anyone Discord does not place in the Embassy's guild.
  // Neither reads a volume or touches the spreadsheet.
  "/api/auth/login",
  "/api/auth/callback",
]);
