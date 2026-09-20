# Singapore Food Bingo

A tap-through version of the printed Singapore Food Bingo poster, made for friends
visiting Singapore. Twenty-five hawker dishes, one shared leaderboard.

**Live:** https://singapore-food-bingo.netlify.app

---

## How to play

1. Open the link and join with your name.
2. Tap any dish on the poster to open its card — what's in it, what it costs,
   where to get it, and which allergens to watch for.
3. Eaten it? Hit **Mark as tried**. Your square stamps and the leaderboard updates
   for everyone.
4. Five in a row in any direction is a bingo. A ★ on a square means its card
   carries a clue.

---

## How players are recognised

There are no accounts and no passwords.

- Joining with a name claims that name and binds it to your browser.
- **A name can only be claimed once.** Anyone else typing it is refused.
- **Only the bound device can tick that card's squares.** Nobody can mark
  someone else's dishes.
- Your progress lives on the server, keyed by your name — it is never stored
  only on your phone.

### Staying signed in

Recognition uses browser storage, which survives refreshes and closed tabs
indefinitely — but it is cleared by wiping browsing data, by private windows, by
switching browsers, and **by iOS Safari if the site goes unopened for 7 days.**

So every player gets a **personal link** (`…/#play=name&c=CODE`), shown with a
Copy button in the Leaderboard panel. Opening it signs them back in on any phone,
with no code to type. Tell people to save theirs — it is the safety net for the
7-day Safari behaviour.

A 4-character backup code is shown underneath in case they ever need to type it.

### What this is not

The site and its API are public: anyone with the URL can read the leaderboard and
join under a new name. The name binding stops friends impersonating each other; it
is not authentication. Fine for bingo, not for anything sensitive.

**Player names are visible to anyone with the site URL.** They are never stored in
this repository — only in the live database.

---

## Project layout

```
public/                              ← the only folder served to the web
  index.html                         the whole site: markup, styles, logic
  assets/singapore-food-bingo-reference.png   the poster board
  assets/dish-01.jpg … dish-25.jpg   one card image per dish
netlify/functions/board.mjs          the leaderboard API
netlify.toml                         publish dir + functions dir
package.json                         one dependency: @netlify/blobs
```

Everything outside `public/` stays private — `README.md`, `package.json` and
`netlify.toml` all return 404 on the live site.

---

## The API

One endpoint, `/api/board`, backed by Netlify Blobs. One record per player,
keyed by a slug of their name.

| Request | Does | Fails with |
|---|---|---|
| `GET` | Returns every player's name and squares | — |
| `POST {action:'join', name, device}` | Claims a name, returns the rejoin code | `name_taken` if another device holds it |
| `POST {action:'claim', name, code, device}` | Moves a card to a new device | `bad_code` |
| `POST {action:'save', name, device, tried}` | Saves 25 squares | `not_your_card` if the device isn't bound |

`GET` never returns device ids or rejoin codes.

---

## Editing the dishes

All 25 live in the `FOODS` array in `public/index.html`:

```js
{n:'Satay', t:'Grill', h:1, p:'S$0.80–1.20 a stick',
 w:'Satay Street, Lau Pa Sat (from 7pm)', when:'Supper', r:'Common',
 d:'Charcoal-grilled marinated skewers…',
 g:['chicken or mutton','turmeric',…],   // ingredients
 a:['Peanuts','Soy'],                    // allergens
 clue:'…'}                               // optional; adds a ★ to the board
```

`h` is spice level 0–3, `r` is rarity (`Common` / `Rare` / `Legendary`).
Order matters: entry *n* maps to square *n* on the poster and to `dish-NN.jpg`.

### Regenerating the card images

Each image is isolated from the source board by connected-shape detection rather
than by grid position. This matters: the dishes overflow their squares on the
original artwork, so a plain grid crop pulls in slices of the neighbouring dish —
durian appearing under the wanton mee. The export flood-fills the whole board into
regions, then keeps only the regions whose centre of mass falls inside a given
square.

---

## Changing it

`AGENTS.md` covers the conventions and the traps — the identity model, why the dish
images are extracted the way they are, and what to check before shipping. Read it
before editing.

## Working on it

```sh
npm install
netlify dev        # serves the site and /api/board together at localhost:8888
```

A plain static server also works, but `/api/board` will 404, the leaderboard shows
an "Offline" note and joining won't work.

Deploys happen automatically on push to `main`.

### Housekeeping

Remove a stray or test player:

```sh
netlify blobs:delete sg-food-bingo <slug-of-their-name>
netlify blobs:list sg-food-bingo          # see all player keys
```
