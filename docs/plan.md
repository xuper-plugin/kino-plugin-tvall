# tvall — dynamic live-TV plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Kino live-TV plugin whose sources (24/7 channels + today's events) come from a remote `tvall.json`, interpreted by a hybrid engine (typed handlers + a declarative `generic` type), kept fresh by a daily validation job.

**Architecture:** `src/` ES modules bundled to `plugin.js` with esbuild (owner rule: plugins built from `src/` + bundle). A loader fetches `tvall.json` (raw.githubusercontent, jsDelivr fallback, cache). A handler registry maps each host's `type` to a handler (`generic`, `daddylive`) exposing `listChannels/listEvents/resolve/health`. Kino-facing exports (`liveCategories/liveChannels/liveSearch/resolve/home/section/settingsStatus`) aggregate across `up` hosts. A GitHub Action runs each host's `health()` daily and commits `status` into `tvall.json`.

**Tech Stack:** JavaScript (ES2020), Kino plugin kit (`sdk/`, `contract.json`, `kino.d.ts`, apiVersion 27 kit, manifest `apiVersion: 9`), esbuild, `node --test` with recorded fixtures, GitHub Actions (Node).

**Spec:** `tvall-design.md` (this plugin's design doc; committed into the repo as `docs/design.md` in Task 1).

## Global Constraints
- Repo: **`xuper-plugin/kino-plugin-tvall`**; commits & pushes as **xuper-plugin** (`user.name=xuper-plugin`, `user.email=335105665+xuper-plugin@users.noreply.github.com`); no `Co-Authored-By`/Claude footer.
- Manifest: `id:"tvall"`, `apiVersion:9`, capabilities `["channels","home","browse","search","scopedSearch","resolve"]`, `liveStreamHosts:"any"` and `fetchHosts:"any"` (both red permissions — hosts are dynamic), `categories:["live"]`.
- All user-visible text localized **ES + EN** (catalog object in `src/i18n.js`); never a bare literal in UI output.
- Kit is the current one copied from `C:/dev/kino-app/plugins/sdk` + `docs/plugins/contract.json` + `docs/plugins/kino.d.ts`; validate with `node sdk/validate.mjs . --repo xuper-plugin/kino-plugin-tvall`.
- A dead/slow host must never hang or fail the whole plugin: every host call is isolated (try/catch) and budgeted (per-call deadline); a host that throws or times out is skipped, not propagated.
- The plugin shows only hosts that are `enabled:true` AND `status!="down"`.

## Review Focus
- **`tvall.json` unreachable or malformed** (CDN down, bad JSON): the plugin must fall back to a bundled seed copy and still list channels, never throw. → Task 2 test.
- **A single host's list/resolve times out or 404s**: that host is skipped; other hosts' channels still appear and resolve. → Task 6 test (aggregation isolates failures).
- **A channel offered by several `up` hosts**: de-duped to one entry, resolving tries hosts by `weight` then falls through on failure. → Task 6 test.
- **Events are stale** (fetched once, shown hours later): events carry a short TTL and a past event is dropped from "En vivo ahora". → Task 7 test.
- **A `generic` recipe with a regex that matches nothing** (site changed): the handler returns an empty list / `null` resolve, not a crash, and marks nothing playable. → Task 4 test.

---

### Task 1: Repo scaffold, manifest, kit, build & test harness
**Files:**
- Create: `kino-plugin.json`, `package.json`, `README.md`, `docs/design.md` (the approved design), `.gitignore`, `icon.png` (placeholder), `src/plugin.js` (entry, empty exports), `src/i18n.js`
- Create: `sdk/` + `contract.json` + `kino.d.ts` (copied from the kino-app kit)
- Test: `test/manifest.test.mjs`

**Interfaces:**
- Produces: the manifest + `npm run build` (`esbuild src/plugin.js --bundle --format=esm --target=es2020 --outfile=plugin.js`) + `npm test`.

- [ ] **Step 1:** Write `test/manifest.test.mjs`: `validate(root, {repo:"xuper-plugin/kino-plugin-tvall"})` returns `problems:[]`, and the manifest declares `channels` + `liveStreamHosts:"any"` + `fetchHosts:"any"`.
- [ ] **Step 2:** Run it; expect FAIL (no manifest yet).
- [ ] **Step 3:** Create `kino-plugin.json` per Global Constraints; copy the kit; add `package.json` scripts (`build`, `test`, `validate`); write minimal `src/plugin.js` and `src/i18n.js` (ES+EN catalog stub). Commit the approved `docs/design.md`.
- [ ] **Step 4:** `npm run build` then `npm test`; expect PASS.
- [ ] **Step 5:** Commit (`feat: scaffold tvall plugin, manifest, kit, build`).

---

### Task 2: `tvall.json` schema, bundled seed, and the loader
**Files:**
- Create: `tvall.json` (seed: the 15 hosts, each `enabled:false, status:"unknown"` except any validated later), `src/catalog-seed.js` (the seed embedded for offline fallback), `src/catalog.js`
- Test: `test/catalog.test.mjs`

**Interfaces:**
- Produces: `loadCatalog(): Promise<{hosts: Host[]}>` and `activeHosts(cat): Host[]` (filters `enabled && status!=="down"`, sorts by `weight` desc). `Host = {id,name,type,base,enabled,status,lastCheck,weight,provides,recipe}`.

- [ ] **Step 1:** Write tests: (a) `loadCatalog` returns the remote JSON when `kino.fetch` yields valid JSON; (b) on fetch failure or invalid JSON it returns the bundled seed (no throw); (c) `activeHosts` drops `enabled:false` and `status:"down"` and orders by `weight`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `src/catalog.js`: fetch `CATALOG_URL` (raw.githubusercontent main) with jsDelivr fallback, `JSON.parse` in try/catch, cache in `kino.storage` with TTL, fall back to `catalog-seed.js`. Implement `activeHosts`.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 3: Handler registry + handler contract
**Files:**
- Create: `src/handlers/index.js` (registry), `src/handlers/types.js` (JSDoc contract)
- Test: `test/registry.test.mjs`

**Interfaces:**
- Produces: `handlerFor(host): Handler | null` where `Handler = { listChannels(host,ctx), listEvents(host,ctx), resolve(host, id, ctx), health(host,ctx) }`; unknown `type` → `null`. `ctx` carries `{deadline, fetchText, settings}`.

- [ ] **Step 1:** Write test: `handlerFor({type:"generic"})` returns an object with the four methods; `handlerFor({type:"nope"})` returns `null`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement the registry (map `type→handler`) and the shared `ctx` helpers (`fetchText` with UA + per-call deadline, mirroring CablevisionHD's `fetchText`).
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 4: `generic` declarative handler
**Files:**
- Create: `src/handlers/generic.js`
- Test: `test/generic.test.mjs` (+ `test/fixtures/generic-*.html`)

**Interfaces:**
- Consumes: Task 3 contract. Recipe fields: `{ listURL, channelItemRegex, channelId, channelName, channelLogo, playerURL, playerRegex, streamRegex, referer, headers, tokenFlow? }`.
- Produces: `generic` handler. `listChannels` fetches `listURL`, applies `channelItemRegex`; `resolve` walks `playerURL`→`playerRegex`→`streamRegex`, returns `{url,mime:HLS_MIME,headers}`.

- [ ] **Step 1:** Write tests against recorded fixtures: a recipe + fixture HTML yields N channels; `resolve` yields the expected `{url,headers}`; a recipe whose regex matches nothing yields `[]` / `null` (no throw).
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `generic.js` interpreting the recipe; all parsing defensive (absent match → fallback, never throw).
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 5: `daddylive` handler (recon + implement)
**Files:**
- Create: `src/handlers/daddylive.js`
- Test: `test/daddylive.test.mjs` (+ recorded fixtures of the channel list page and a player page)

**Interfaces:**
- Consumes: Task 3 contract.
- Produces: `daddylive` handler covering the thedaddy/daddylive family: `listChannels` (24/7 list) and `listEvents` (today's schedule) and `resolve` (the family's player→stream flow, with the referer/headers the signal needs).

- [ ] **Step 1 (recon):** Fetch a live daddylive channel list, a schedule page, and a player page; record them as fixtures; note the exact list/player/stream patterns and token/handshake steps. (Exploration, no product code.)
- [ ] **Step 2:** Write tests against the fixtures: list yields channels; schedule yields today's events with start times; `resolve` yields `{url,headers}` whose playlist body (in the fixture) is `#EXTM3U`.
- [ ] **Step 3:** Run; expect FAIL.
- [ ] **Step 4:** Implement `daddylive.js` from the recon.
- [ ] **Step 5:** Run; expect PASS.
- [ ] **Step 6:** Commit.

---

### Task 6: Kino surface — channels aggregation, categories, search, resolve
**Files:**
- Modify: `src/plugin.js`
- Create: `src/aggregate.js`
- Test: `test/surface.test.mjs`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces exports: `liveCategories()`, `liveChannels({categoryId})`, `liveSearch({query})`, `resolve(ref)` (`ref="<hostId>|<kind>|<id>"`), `home()`, `browse(ref)`, `search(arg)`, `settingsStatus()`. `aggregate.js`: `allChannels(cat)` merges `up` hosts, de-dupes by normalized name (keep highest `weight`, remember the other hosts as resolve fallbacks).

- [ ] **Step 1:** Write tests (fixtures/stubbed handlers): channels from two `up` hosts merge and de-dupe; one host throwing is skipped and the other's channels still list; `resolve` dispatches by `hostId` and, on the primary's failure, tries the next host carrying that channel; `liveSearch` filters by name; a `status:"down"` host contributes nothing.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `aggregate.js` + wire the Kino exports; every per-host call isolated + budgeted.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 7: Events — "En vivo ahora" category with short TTL
**Files:**
- Modify: `src/aggregate.js`, `src/plugin.js`
- Test: `test/events.test.mjs`

**Interfaces:**
- Consumes: `listEvents` from handlers.
- Produces: an "live-now" category id; events listed as channels under it; each event `resolve`s via its host; events cached with `EVENTS_TTL_MS` (~5–10 min); events whose end/`start+window` is in the past are dropped.

- [ ] **Step 1:** Write tests: events from `up` hosts appear under the live-now category; a past event is dropped; the live-now category is absent when no host `provides` events.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement events aggregation + TTL + past-event filter; add the live-now category to `liveCategories`.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 8: Seed `tvall.json` from real host evaluation
**Files:**
- Modify: `tvall.json`, `src/catalog-seed.js`
- Test: `test/seed.test.mjs`

**Interfaces:**
- Consumes: Tasks 4–5 handlers.
- Produces: a `tvall.json` where every host that actually lists+resolves is `enabled:true` with a filled `recipe`/`type`; the rest stay `enabled:false` with a note.

- [ ] **Step 1 (recon):** For each of the 15 hosts, determine its `type` (`daddylive` family, `livetv`, or `generic` + recipe) and verify list+resolve live; record which pass.
- [ ] **Step 2:** Write test: `tvall.json` parses, every `enabled:true` host has a `type` with a registered handler and a non-empty `recipe` (or a family `type`), and `catalog-seed.js` equals `tvall.json`.
- [ ] **Step 3:** Run; expect FAIL.
- [ ] **Step 4:** Fill `tvall.json` from the recon; regenerate `catalog-seed.js`.
- [ ] **Step 5:** Run; expect PASS.
- [ ] **Step 6:** Commit.

---

### Task 9: Daily validation job (GitHub Action)
**Files:**
- Create: `.github/workflows/validate-hosts.yml`, `tools/validate-hosts.mjs`
- Test: `test/validate-hosts.test.mjs`

**Interfaces:**
- Consumes: the handlers' `health()` and `tvall.json`.
- Produces: `tools/validate-hosts.mjs` that loads `tvall.json`, runs each host's `health()`, sets `status`(`up|degraded|down`)+`lastCheck`+top-level `updatedAt`, writes the file; the workflow runs it on a daily cron and commits the change as `xuper-plugin`.

- [ ] **Step 1:** Write test: given a `tvall.json` and stubbed handlers (one healthy, one failing), the updater sets `up`/`down` and `lastCheck` and bumps `updatedAt`, preserving everything else.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `tools/validate-hosts.mjs`; write the workflow (daily cron, Node, commit+push as xuper-plugin, no-op when unchanged).
- [ ] **Step 4:** Run the test; expect PASS. (The workflow itself runs in CI, not locally.)
- [ ] **Step 5:** Commit.

---

### Task 10: Build, validate, publish 0.1.0
- [ ] **Step 1:** `npm run build`; `node sdk/validate.mjs . --repo xuper-plugin/kino-plugin-tvall` → accepted; `npm test` all green.
- [ ] **Step 2:** Create the GitHub repo `xuper-plugin/kino-plugin-tvall` (as xuper-plugin), set the local push credential helper, push `main`.
- [ ] **Step 3:** Tag/README install line `xuper-plugin/kino-plugin-tvall`; confirm raw manifest + `tvall.json` are reachable (the plugin's `CATALOG_URL`).
- [ ] **Step 4:** Commit any final docs.
