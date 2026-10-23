// Things placed on the street. place() returns instances (world x/z + any params);
// obstacle(inst) makes a round no-walk area; interactions(inst) work like rooms'.
// The renderer is registered under the same id in content/render.jsx.
import { define } from '../registry.js'
import { LENGTH } from '../constants.js'

define('prop', {
  id: 'fountain',
  place: ({ r }) => [{ x: 0, z: -LENGTH * .5 + (r() - .5) * 20 }],
  obstacle: f => ({ x: f.x, z: f.z, radius: 1.75 }),
  interactions: f => [{ kind: 'wish', pos: [f.x, f.z], radius: 3.0 }],
})
