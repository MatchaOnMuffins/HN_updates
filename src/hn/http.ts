import { REQUEST_TIMEOUT_MS } from "./constants.js";

export function createAbortSignal(): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout)
  };
}

export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} ${response.statusText}: ${url}`);
  }

  return response.json() as Promise<T>;
}
