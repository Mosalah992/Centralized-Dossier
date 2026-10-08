// test/swr.test.ts imports functions/lib/swr.ts, which pulls it into the
// browser-typed tsconfig.json as well. There `caches.default` — a Workers-only
// addition — does not exist. This declares just that field for the test
// project; tsconfig.functions.json still checks swr.ts against the real
// Workers types.
interface CacheStorage {
  readonly default: Cache;
}
