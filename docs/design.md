# tvall — dynamic live-TV plugin for Kino — design

## Intent & why
A Kino live-TV plugin whose **sources are not baked into the code**. A remote JSON (`tvall.json`, in the repo)
lists the hosts and, per host, how to list / search / resolve. The plugin reads it and acts dynamically.
Sources can be added, removed, or marked up/down **without shipping a new plugin version**. A **daily job**
validates every host and writes which ones are alive. A host not in the JSON — or disabled/down — never appears.
Covers **both** 24/7 channels and today's events (matches).

## Goals
- Plugin downloads `tvall.json` (cache + fallback), and from the **enabled + healthy** hosts builds its channel
  list and its "live now / today" events list.
- **Hybrid recipe engine:** a `type` field per host picks a built-in handler (`daddylive`, `livetv`, `generic`…).
  `generic` interprets declarative recipe fields (URL templates, regex, referer, headers) so most new hosts enter
  by editing the JSON alone.
- **Daily GitHub Action** runs each host's health check (list returns channels; resolve one yields `#EXTM3U`;
  events parse) and commits `status`/`lastCheck` back into `tvall.json`.
- Search: by channel name, and by event/team across today's events.

## Non-goals
VOD, DRM-protected channels, user accounts/login. Not writing a handler for every possible site — `generic`
covers the long tail. Not guaranteeing every one of the 15 seed hosts ships working on day 1.

## Anti-goals (failure even if it "works")
- A dead/slow host hanging or failing the whole plugin (each host is isolated, budgeted, and skipped on failure).
- Stale JSON making Kino show channels that 404 (the job prunes/marks them; the plugin hides `status:"down"`).
- A new host type forcing a plugin release for the common cases (the point is JSON-only adds via `generic`).

## Approaches considered
1. **Fully declarative JSON** — every host is regex/templates a generic engine runs. Rejected: DaddyLive-family
   sites need a multi-step token/handshake a flat regex can't express robustly, and livetv.sx has anti-bot.
2. **Typed handlers only** — every host maps to a built-in handler. Rejected: a new site-type needs a plugin
   release, which defeats "add hosts dynamically."
3. **Hybrid (CHOSEN)** — typed handlers for the known families (`daddylive`, `livetv`, …) **plus** a `generic`
   declarative type for the long tail. Known families are robust; unknown sites enter via JSON. Best of both.

## The how (decided)
### tvall.json (schema 1)
```jsonc
{
  "schema": 1,
  "updatedAt": 0,                      // ms, set by the job
  "hosts": [
    {
      "id": "daddylive",
      "name": "DaddyLive",
      "type": "daddylive",             // selects the handler
      "base": "https://daddylive.app",
      "enabled": true,
      "status": "up",                  // up | degraded | down  (set by the job)
      "lastCheck": 0,
      "weight": 10,                    // ordering / preference when a channel exists on several hosts
      "provides": ["channels", "events"],
      "recipe": { /* type-specific; for "generic": listURL, channelRegex, playerRegex, referer, headers, tokenFlow */ }
    }
  ]
}
```
### Handlers (in the plugin, a registry `type -> handler`)
Each handler implements `listChannels()`, `listEvents()`, `resolve(ref)`, `health()`.
- `daddylive` — the DaddyLive family (thedaddy.pk→.li, daddylive.app, and mirrors): shared engine.
- `livetv` — livetv.sx style (event-first, external stream links, anti-bot headers).
- `generic` — declarative: runs the `recipe`'s templates/regex. Covers hosts without a dedicated handler.
(Other seed hosts are slotted into one of these three during implementation, after evaluating each.)

### Kino surface
- Capability **`channels`** + **`liveStreamHosts: "any"`** (the red permission; streams come from hosts the JSON
  names). apiVersion per the current kit.
- `liveCategories` / `liveChannels`: aggregated across all `up` hosts. Categories: **"En vivo ahora"** (today's
  events) + genre categories (Deportes, …) + optional per-source grouping. De-dupe a channel that several hosts
  carry, preferring higher `weight`.
- `liveSearch`: channel name + event/team match.
- `resolve(ref)`: `ref = "<hostId>|<kind>|<id>"` (`kind` = `channel`|`event`) → dispatch to that host's handler,
  which returns `{ url, mime, headers }` (referer/UA the signal needs), exactly like CablevisionHD.
- Home/section: an "En vivo ahora" row (events) + channel rows. Settings: status (hosts up/total), "re-check now",
  preferred source.
- **Events are time-bound:** short TTL (~5–10 min), fetched fresh; shown under "En vivo ahora / Hoy".

### The daily job (GitHub Action, cron)
For each host, call the handler's `health()`: list returns ≥N channels, resolving one yields `#EXTM3U`, events
parse. Write `status` + `lastCheck` + `updatedAt`; commit `tvall.json`. Adding a host = a PR/commit editing the
JSON (a `generic` entry needs no plugin change).

## Left to the builder
- The exact regex/selectors/token flow per host — **evaluated during implementation** (the owner asked that each
  host be evaluated); seed the JSON with the ones that actually resolve, leave the rest `enabled:false` until done.
- Precise `ref` encoding and category ids; cache TTLs (channels longer, events short); the health thresholds (N).
- Which repo hosts the JSON + job (proposal: a new `xuper-plugin/kino-plugin-tvall`, committed as `xuper-plugin`),
  and whether the plugin reads the JSON from raw.githubusercontent with a jsDelivr fallback.
- First version ships the `daddylive` + `generic` handlers and the hosts that pass health; `livetv` and the harder
  sites follow as added handlers/entries.
```
