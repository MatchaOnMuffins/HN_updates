import { CACHE_TTL_SECONDS } from "./constants.js";

export type CacheEnvelope<T> = {
  cachedAt: string;
  data: T;
};

export function buildCacheKey(parts: string[]): string {
  return parts.join(":");
}

export async function readCache<T>(kv: KVNamespace | undefined, key: string): Promise<T | null> {
  if (!kv) {
    return null;
  }

  const cached = await kv.get<CacheEnvelope<T>>(key, "json");
  return cached?.data ?? null;
}

export async function writeCache<T>(kv: KVNamespace | undefined, key: string, data: T, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> {
  if (!kv) {
    return;
  }

  const envelope: CacheEnvelope<T> = {
    cachedAt: new Date().toISOString(),
    data
  };

  await kv.put(key, JSON.stringify(envelope), { expirationTtl: ttlSeconds });
}

export async function withCache<T>(
  kv: KVNamespace | undefined,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = CACHE_TTL_SECONDS
): Promise<{ data: T; cached: boolean }> {
  const cached = await readCache<T>(kv, key);

  if (cached !== null) {
    return { data: cached, cached: true };
  }

  const data = await fetcher();
  await writeCache(kv, key, data, ttlSeconds);
  return { data, cached: false };
}
