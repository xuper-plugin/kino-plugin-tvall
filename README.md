<p align="center">
  <img src="icon.png" width="96" alt="TVall">
</p>

<h1 align="center">TVall</h1>

<p align="center">Live TV for <a href="https://github.com/kinotvapp/kino-light">Kino</a> — 24/7 channels and today's events, from self-updating dynamic sources.</p>

---

## What it is

TVall is a live-TV plugin for Kino. It reads its list of sources from a small
catalog (`tvall.json`) that updates itself, so new sources can be added without
shipping a new plugin build. Today it serves 24/7 sports channels (DAZN,
Movistar, LaLiga, ESPN and more) plus the day's live events.

## How it resolves a stream

Each source in the catalog declares a `recipe` that the handlers interpret:

- **`zicotv`** (the live source): channels and events are minted through the
  site's own signed JSON API — no scraping, no token player.
  1. `GET /api/player/{id}` → an HTML page carrying a signed `renew` URL.
  2. `POST` that signed URL → a JSON list of CDN `.m3u8` sources.
  3. play the first free stream with the right `Referer`.
- **`generic`**: a declarative handler. A source serves its catalog as HTML
  (regex) or JSON, and resolves either by scraping the `.m3u8` or by running the
  player in a hidden WebView (`kino.browser.capture`) and capturing the stream
  it requests.

Every step is defensive: a site that changes yields an empty list or a null
stream, never a crash. Sources are tried in weight order and de-duped by title.

## Install

In Kino: **Plugins → + → Kino** and paste `xuper-plugin/kino-plugin-tvall`.

## Develop

```bash
npm install
npm test            # unit tests for the handlers and the catalog
npm run build       # bundle src/plugin.js → plugin.js
npm run validate    # SDK check: "Kino would accept this plugin"
```

After any change to `plugin.js` or the version, re-sign:

```bash
node sdk/seal.mjs --sign --repo xuper-plugin/kino-plugin-tvall --key <author-key.pem>
```

The channel catalog lives in `tvall.json`; `src/catalog-seed.js` is the bundled
offline fallback and is kept in sync with it (a test asserts equality).
