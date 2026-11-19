// Shared fetch helper for every handler: one browser User-Agent, a per-call deadline so a slow host
// never runs past the budget Kino gives the whole call, and text output. Mirrors the pattern proven
// in kino-plugin-cablevisionhd.
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0";

/**
 * Fetch `url` as text with the browser UA, retrying up to `tries`, bounded by `deadline` (epoch ms).
 * Defaults to GET; pass `method`/`body` for a POST (a signed API that mints a stream on demand needs one).
 */
export async function fetchText(url, headers, { tries = 2, deadline, method = "GET", body } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const left = deadline ? deadline - Date.now() : 8000;
    if (left <= 0) break;
    try {
      const req = { method, headers: { "User-Agent": UA, ...(headers || {}) }, timeoutMs: Math.min(8000, left) };
      if (method !== "GET" && body !== undefined) req.body = body;
      const r = await kino.fetch(url, req);
      if (!r.ok) throw new Error("http " + r.status);
      return await r.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("fetch failed");
}

/** The context every handler method receives: the call's deadline, the fetch helper, and the plugin settings. */
export function makeCtx({ deadline, settings } = {}) {
  return { deadline: deadline || Date.now() + 18000, fetchText, settings: settings || {} };
}
