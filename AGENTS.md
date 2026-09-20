# Working on Singapore Food Bingo

Context and conventions for anyone — human or agent — picking this up later.
User-facing docs live in `README.md`; this file is about *how to change things safely*.

## What it is

A tap-through version of a printed bingo poster, built for ~14 friends visiting
Singapore for a wedding. They join by name, tap dishes to read a collectible-style
card, and tick off what they've eaten. One shared leaderboard.

- **Live:** https://singapore-food-bingo.netlify.app
- **Repo:** https://github.com/madytekt/singapore-bingo
- **Host:** Netlify, deploying from `main`. **Push to `main` = deploy.** There is no
  staging step, so check changes locally first.

## Layout

```
public/            ← the ONLY folder served to the web
  index.html       the entire site: markup, CSS and JS in one file
  assets/          the poster + 25 dish images
netlify/functions/board.mjs   the leaderboard API
netlify.toml       publish = "public", functions = "netlify/functions"
package.json       one dependency: @netlify/blobs
```

Keep `README.md`, `package.json` and `netlify.toml` **outside** `public/`. They were
moved there deliberately so they aren't served — verify with
`curl -o /dev/null -w '%{http_code}' https://singapore-food-bingo.netlify.app/package.json`
(expect 404).

`public/index.html` is intentionally a single file. Don't split it into separate
CSS/JS files without a reason — the whole point is that it's editable in one place.

## The repo is public

Never commit a secret. If the game ever needs a shared passphrase, it must be a
**Netlify environment variable** read via `process.env`, never a literal in the code.

Player names are not in the repo — they only exist in the live Blobs store.

## Identity model — read before touching auth

There are no accounts. The rules are enforced server-side in `board.mjs`:

- A record is keyed by `slug(name)`. Claiming a name binds it to a random
  **device id** generated in that browser.
- `join` refuses (`name_taken`) if the name exists on a different device.
- `save` and `delete` refuse (`not_your_card`) unless the device matches.
- `claim` swaps the bound device when given the right 4-character code.
- **`GET` must never return `device` or `code`.** `readAll()` strips them. If you
  add a field to the record, check it isn't leaked there.

Recovery is a **personal link** — `/#play=<slug>&c=<CODE>` — surfaced with a Copy
button in the Leaderboard panel. This exists because iOS Safari evicts localStorage
after 7 days of not visiting, which would otherwise strand people mid-trip.

Admin override (deleting anyone's card) is the CLI, not a code path:

```sh
netlify blobs:list sg-food-bingo
netlify blobs:delete sg-food-bingo <name-slug>
```

## Dish images — do not re-crop by grid

The 25 card images were extracted from a 5×5 source board by **connected-shape
detection**, not by grid position. This matters:

- The board is 1254px across 5 tiles — **250.8px each, not a whole number** — so
  `background-size: 500% 500%` rounds and bleeds the neighbouring dish in.
- Worse, the dishes **overflow their own squares** in the source art. The durian
  genuinely paints up into Wanton Mee's cell. No grid crop can separate them.

The working approach: flood-fill the whole board into connected regions, then for
each square keep only regions whose **centre of mass** falls inside that cell, and
erase intruding pixels. Each dish is then centred on cream and exported at 560px.

If you regenerate the art, verify with a 5×5 contact sheet before shipping — the
bleed is easy to miss on a single card.

## Layout conventions

- The card is **side-by-side at every width**: art + stats in a left column, text
  right. Column widths: 324px desktop, 142px phone, 122px below 380px.
- The card is a flex column capped at `94dvh`. Header, footer and buttons are
  `flex:none`; only `.tcard-grid` scrolls, so **Mark as tried** is always reachable.
- Dish art is 560px native. Don't display it larger than that — it was upscaled
  once and looked visibly soft.
- The board itself is the **poster image with invisible hotspots** over it
  (`.hotspot-grid`, positioned by percentage). That's why the board never looks
  cropped. If the poster image is ever replaced, the hotspot offsets need retuning.

## Editing dishes

All 25 live in the `FOODS` array in `public/index.html`:

```js
{n:'Satay', t:'Grill', h:1, p:'S$0.80–1.20 a stick',
 w:'Satay Street, Lau Pa Sat (from 7pm)', when:'Supper', r:'Common',
 d:'Charcoal-grilled marinated skewers…',
 g:['chicken or mutton','turmeric'],   // ingredients
 a:['Peanuts','Soy'],                  // allergens
 clue:'…'}                             // optional; adds a ★ on the board
```

`h` = spice 0–3. `r` = `Common` | `Rare` | `Legendary`. `when` is kept in the data
but no longer displayed.

**Order is load-bearing:** entry *n* maps to square *n* on the poster and to
`dish-NN.jpg`. Reordering the array without re-exporting the images desyncs
everything.

Square 13 carries a clue about the wedding dinner.

## Running it

```sh
npm install
netlify dev     # site + /api/board together
```

A plain static server will serve the page but `/api/board` 404s, so joining fails
and the leaderboard shows its offline note.

## Before you ship

- `node --check netlify/functions/board.mjs`
- Parse the inline script:
  `node -e "new (require('vm').Script)(require('fs').readFileSync('public/index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1])"`
- Open a card on a **real phone**, not just a resized desktop window. Browser
  devtools emulation has repeatedly disagreed with actual phone rendering here.
- If you touched the API, re-test the three refusals: `name_taken`,
  `not_your_card` on save, `not_your_card` on delete.
- Don't test against production — it puts junk players on the live leaderboard.
  Stand up a local replica of the endpoint instead.
