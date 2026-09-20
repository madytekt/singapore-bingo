# Singapore Food Bingo

Twenty-five hawker dishes, one shared leaderboard. Friends join under their own
name, tap a dish to open its collectible card, and tick it off once they've eaten it.

## Files

```
index.html                       the site
assets/singapore-food-bingo-reference.png   the poster board
assets/dish-01.jpg … dish-25.jpg the 25 card images
netlify/functions/board.mjs      the shared leaderboard API (Netlify Blobs)
netlify.toml                     publish dir + functions dir
package.json                     one dependency: @netlify/blobs
```

Each card image is isolated from the source board by connected-shape detection, not
by grid position — the dishes overflow their squares on the original artwork, so a
plain grid crop pulls in slices of the neighbouring dish.

## Deploy to Netlify

The leaderboard needs the serverless function, so deploy a way that runs
`npm install` — **drag-and-drop will not work**.

**GitHub:** push this folder, then Netlify → Add new site → Import an existing
project. Leave the build command empty, publish directory `.`

**CLI:** `npm install -g netlify-cli && npm install && netlify deploy --prod`

Netlify Blobs needs no setup, no keys and no database — the function gets a store
on first write. Then rename the site under Site configuration → Change site name
and send the link to the group.

## How identity works

There are no accounts and no passwords. Instead:

- A player joins by typing their name. That name becomes the key for their card.
- Their browser generates a random device id, stored with the name. The server
  binds the card to that device.
- **A name can only be claimed once.** If someone else types a name that's taken,
  the server refuses (`name_taken`) and offers the rejoin path instead.
- **Only the bound device can write to a card.** A save from any other device is
  rejected (`not_your_card`), so nobody can tick someone else's squares.
- Moving to a new phone: enter the same name, then the four-character **rejoin
  code** shown in the leaderboard panel. That rebinds the card to the new device.
- The public board never returns device ids or rejoin codes — only names and squares.

This stops casual impersonation, which is the actual risk among friends. It is not
authentication: someone who knows a rejoin code can take that card, and the API
is open to anyone with the URL. Fine for a bingo game, not for anything sensitive.

## Clues

A dish can carry a `clue` — a hint shown in a gold box on its card, with a ★ on the
board so people go looking. Square 13 (Salted Egg Yolk Prawn) has one about the
wedding dinner. To add more, put a `clue:'...'` on any entry in the `FOODS` array
in `index.html`.

## Testing locally

```sh
npm install
npx netlify dev        # serves the page AND the /api/board function
```

Plain `python3 -m http.server` also works, but `/api/board` will 404, the leaderboard
shows an "Offline" note, and joining won't work (it needs the server to assign a card).

## Editing the dishes

All 25 live in the `FOODS` array in `index.html`: name, type, heat (0–3), price,
where to try it, best time, rarity, description, ingredients, allergens, optional clue.
Order matters — entry *n* maps to square *n* on the poster and to tile *n* of the
sprite sheet (5 per row, left to right).
