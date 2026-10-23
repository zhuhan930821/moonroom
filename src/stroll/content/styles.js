// Building styles. `label` tells Claude what the style looks like; the roof/facade renderer is
// registered under the same id in content/render.jsx.
import { define } from '../registry.js'

;[
  ['cottage', '童话小屋，三角坡屋顶'], ['pagoda', '层层翘檐的塔楼'], ['gothic', '哥特尖顶，偶尔有尖塔'],
  ['seaside', '海边平顶小楼，屋顶有小阁楼'], ['desert', '沙漠平顶，常带圆顶'], ['crystal', '水晶棱锥屋顶，半透明发光'],
  ['mushroom', '蘑菇伞盖屋顶'], ['candy', '糖果色的坡顶小屋'],
].forEach(([id, label]) => define('style', { id, label }))
