// Content registry for the stroll world. Everything you can meet on a street is a registered
// definition, so new things are added as content files (see docs/stroll-content.md) without
// touching the layout, physics, HUD or renderer:
//   theme        a whole street preset (palette, sky, shops, goods)        — data
//   style        a building style (roof/facade); Claude may pick it          — data + renderer
//   room         an enterable building type (shop, home, …)                — data + renderer
//   prop         something placed on the street (fountain, …)              — data + renderer
//   interaction  what pressing E does near something                       — data
//   species      what a shopkeeper looks like, from their description      — data
// Data definitions are plain JS (node-testable); renderers are registered separately in
// content/render.jsx under the same id.
const tables = new Map()

export function define(kind, def) {
  if (!def?.id) throw new Error(`${kind} definition needs an id`)
  if (!tables.has(kind)) tables.set(kind, new Map())
  tables.get(kind).set(def.id, def)
  return def
}
export const all = kind => [...(tables.get(kind)?.values() ?? [])]
export const get = (kind, id) => tables.get(kind)?.get(id)
export const ids = kind => all(kind).map(def => def.id)

// Renderers (React components) live in their own table so data stays importable in node.
const renderers = new Map()
export function render(kind, id, component) { renderers.set(`${kind}:${id}`, component); return component }
export const renderer = (kind, id) => renderers.get(`${kind}:${id}`)
