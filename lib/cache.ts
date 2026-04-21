/**
 * Lightweight TTL-based in-memory cache.
 *
 * Screens use this to avoid re-fetching expensive analytics on every tab focus.
 * Mutations (create / update / delete expense) must call invalidateCache() so
 * the next focus gets fresh data.
 *
 * Default TTL: 5 minutes.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/** Returns cached value if it exists and has not expired, otherwise null. */
export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/** Stores a value in the cache with the current timestamp. */
export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

/**
 * Removes specific keys from the cache.
 * Call with no arguments to clear the entire cache.
 */
export function invalidateCache(...keys: string[]): void {
  if (keys.length === 0) {
    store.clear();
  } else {
    for (const key of keys) {
      store.delete(key);
    }
  }
}

/**
 * Removes all keys that start with the given prefix.
 * Use after mutations that affect multiple months/categories.
 *
 * Common prefixes:
 *   'dashboard:'         — home screen
 *   'expenses:'          — expenses tab
 *   'monthly-summary:'   — monthly summary screen
 *   'overspending-alerts:' — alerts screen
 *   'category-analysis:' — category detail screen
 *   'expense-detail:'    — individual expense screen
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// User preferences cache
// Persisted for 24 h so currency / locale stay consistent across screens that
// do not load the user themselves.
// ---------------------------------------------------------------------------

export type UserPrefs = {
  /** ISO 4217 currency code, e.g. 'GBP'. */
  currency: string;
  /** BCP-47 locale, e.g. 'en-GB'. */
  locale: string;
};

const USER_PREFS_KEY = '__userPrefs';
const USER_PREFS_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_PREFS: UserPrefs = { currency: 'GBP', locale: 'en-GB' };

/** Returns cached user prefs, falling back to GBP/en-GB defaults. */
export function getCachedUserPrefs(): UserPrefs {
  return getCached<UserPrefs>(USER_PREFS_KEY, USER_PREFS_TTL) ?? DEFAULT_PREFS;
}

/** Call this after loading the user so all screens share the same prefs. */
export function setCachedUserPrefs(prefs: UserPrefs): void {
  setCached(USER_PREFS_KEY, prefs);
}
