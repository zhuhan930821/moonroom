# Adding things to the stroll

The street behind the Anywhere Door is built from **registered content**. The engine reads
whatever is registered: `layout.js`, `StrollWorld.jsx` and `StrollHud.jsx` all do this.
To add something, you write a content file and register it. You don't change the engine.

All content lives in `src/stroll/content/`:

| File | Kind | What it is |
| --- | --- | --- |
| `themes.js` | `theme` | Whole street presets: name, legend, palette, sky, street style, shops and goods. The wish is matched against `keywords`. |
| `styles.js` | `style` | Building styles. Claude sees the `label` and can choose the style. The roof renderer is in `render.jsx`. |
| `rooms.js` | `room` | Enterable building types (`shop`, `home`). Each defines its placement, door, depth, furniture, interactions and coins. The interior renderer is in `render.jsx`. |
| `props.js` | `prop` | Things placed on the street (`fountain`). Each defines placement, obstacle and interactions. The renderer is in `render.jsx`. |
| `interactions.js` | `interaction` | What E does: `label(item, ctx)` is the prompt (return `null` to hide), and `use(item, ctx)` acts. |
| `species.js` | `species` | How a shopkeeper looks, matched by regex against the keeper's description. |
| `render.jsx` | — | React renderers, registered with `render(kind, id, Component)`. |
| `index.js` | — | Imports every data file, so a new file needs one line here. |

Data files are plain JS, so the node tests can lay out a street and check that it can be walked.
Renderers are separate. That keeps the tests free of three.js.

## Recipes

**A new theme.** Copy an entry in `themes.js` and give it a new `id`. If its keywords appear in
the wish, the offline generator can pick it.

**A new building style.**
1. Add it to `styles.js` as `['treehouse', '树屋，屋顶长着一棵树']`.
2. Add `render('style', 'treehouse', Roof)` to `render.jsx`. `Roof` receives
   `{ w, top, depth, roof, roll, accent }` and is drawn in building-local coordinates.

From then on, Claude can choose this style for new streets.

**A new enterable building**, for example a library where you read the guestbook:
```js
// rooms.js
define('room', {
  id: 'library', order: 20,                       // after shops (0) and the roof stairs
  place: ({ r, candidates }) => candidates({ maxZ: -20 }).filter(() => r() < .15).slice(0, 2).map(b => ({ b })),
  blockers: b => [[3, 4, b.z - .5, b.z + .5]],   // a desk: local depth u0..u1, world z0..z1
  interactions: b => [{ kind: 'read', u: 2.5, z: b.z, radius: 1.5 }],
})
// interactions.js
define('interaction', { id: 'read', label: () => '翻开留言簿', use: (it, ctx) => ctx.toast('……') })
// render.jsx: render('room', 'library', ({ b, world, night }) => …)
```
The `Shell` / `Part` helpers in `interiors.jsx` give you walls with a doorway, so the room only
needs to draw its furniture.

**A new street prop.** Add `define('prop', { id, place, obstacle?, interactions? })` and a renderer.
`place` returns world positions. `obstacle` makes a round area you can't walk into.
The fountain is the worked example.

## The `ctx` an interaction receives
`world`, `coins`, `shop(i)`, `owns(good)`, `buy(seller, good)` (pays and puts the item on the
souvenir shelf), `panel('good' | 'shop', data)`, `toast(text)`, `addCoins(n)`, `chime(midiNotes)`,
`home()`.

## Checks
`tests/stroll-content.test.js` registers a library, a bench, a reading interaction and a new
style in a test, without touching the engine. It then checks that the street lays out, can be
walked, and uses all four. Copy that test whenever you add a new kind of thing.
