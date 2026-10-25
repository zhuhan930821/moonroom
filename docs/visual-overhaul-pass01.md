# Moonroom Visual Pass 01 — 审计与验收

后续的吊顶植物／墙面装饰见 [Pass 02](ceiling-wall-dressing-pass02.md)；Pass 02 的独立 GLB 已取代本页所述的单件天花样板。

主参考：用户最后提供的竖幅床／鼓／阁楼局部图（2026-10-24）。此前的三窗全景图只作为世界观与窗景辅参考。竖幅图的主要构图是：柔软床品前景、温暖且密集的鼓角／书架中景、木质阁楼与藤蔓上景，窗景仅占左侧少量画面。

## Audit

| 层 | 当前实现 | 本轮问题 |
| --- | --- | --- |
| 渲染和控制 | React Three Fiber / Three.js，`src/App.jsx`、`src/game/PlayerController.jsx`；`src/config/scene.js` 管理家具碰撞与机位 | 不宜因美术重排直接改变碰撞或交互锚点 |
| 建筑 | `src/scene/Environment.jsx` 加载 Blender GLB；规则天花横梁来自 `scripts/build_moonroom_architecture.py` | 入口视角呈明显方格；鼓角缺少参考图的木质阁楼背景 |
| 灯光 | `src/lighting/CinematicLighting.jsx` 的 Golden 灯光及 Bloom | 原画面整体偏均匀暖粉，冷暖分离弱；激进降低环境光则会让床／鼓过暗 |
| 地毯 | `src/scene/Furniture.jsx` 的旧版 Canvas 星月平面；另有测试用短绒 GLB | 旧默认地毯近景缺纹样、纤维与边缘深度 |
| 家具 | 床、沙发、鼓、桌及书架均已有 GLB；`src/scene/Furniture.jsx` 组合 | 与主参考的最大差距是床品体积、软塌质感及前中后景布局，不是单靠色彩可补 |
| 装饰 | 已有 `room-dressing.glb`、窗藤蔓和一件 Blender 天花花藤测试 GLB | 量与层次不足；本轮只启用已有天花模块，不批量新增小物 |

## First visual pass

- `?visualPass=1`（默认）启用；`?visualPass=0` 回看旧版，不覆盖原建筑或地毯资产。
- 天花板隐藏两条最显眼的中部规则横梁，并在高画质桌面模式启用已有 Blender 花藤／吊星样板。低画质模式不额外加载该样板。
- 地毯换为独立 GLB：波斯花卉 Base Color、Poly Haven CC0 织物 Normal/Roughness，保留既有测试网格的短绒表面和轮廓；低画质加载减面与 1K 贴图版本。纹样由 imagegen 生成，不是参考图的精确纹样，也不应当作最终批准材质。
- Golden 灯光降低泛粉环境光和 Bloom，保留暖灯作为主导，提高月光的蓝色分离，并在鼓角／休息区补局部暖光。第一次过冷过暗的试验已经根据同机位截图回调；最终配置以暖光为主。

## 相同机位截图

- 入口前：[旧版](../screenshots/visual-overhaul-pass01/before/hero-desktop.png) / [最终](../screenshots/visual-overhaul-pass01/reference-final/hero-desktop.png)
- 地毯近景：[旧版](../screenshots/visual-overhaul-pass01/before/rug-close.png) / [最终](../screenshots/visual-overhaul-pass01/reference-final/rug-close.png)
- 鼓角竖幅：[旧版](../screenshots/visual-overhaul-pass01/reference-before/drum-corner.png) / [最终](../screenshots/visual-overhaul-pass01/reference-final/drum-corner.png)
- 床边竖幅：[旧版](../screenshots/visual-overhaul-pass01/reference-before/bed-corner.png) / [最终](../screenshots/visual-overhaul-pass01/reference-final/bed-corner.png)
- 横向移动端视口：[旧版](../screenshots/visual-overhaul-pass01/before/hero-mobile.png) / [最终](../screenshots/visual-overhaul-pass01/reference-final-mobile/hero-mobile.png)

## 美术判断与未完成项

地毯图案、边缘体积和天花板规则感有肉眼可见改善，入口画面局部更丰富。但本轮**没有达到主参考图的品质或构图**。鼓组现在主要以拱窗为背景，参考图以阁楼／书墙为背景；床与鼓相隔约 15m，不能在不改变现有布局的前提下自然形成参考图那样紧凑的床前景＋鼓中景。床的薄皱被褥、裸露硬质床板、平整靠枕，与参考图的厚蓬松织物仍相距很远。墙面仍大面积空白、植物层级稀少、窗帘过平直。上述问题需后续独立的模型、布料／材质与布局审片；不能靠继续增大 Bloom 或重复小装饰伪装解决。

本轮未动床、沙发、鼓、主要工作台的世界坐标、碰撞、交互 ID 和数据存储。尤其未动鼓件根节点、鼓凳锚点或 Drum Session。

## 验证

- `npm test`：32/32 通过，涵盖移动／碰撞和交互目标等逻辑。
- `npm run build`：通过；JS chunk 约 1.46 MB，仍有代码拆包警告。
- `node scripts/verify_visual_pass_interactions.mjs`：在页面 GLB 加载完成后，鼓击按键、Esc 退出鼓模式、CRT Diary 窗口打开及 Esc 退出电脑模式通过，无页面错误。该脚本对 Diary 图标派发 DOM click 以避开软件渲染器下的点击时序问题，因此**没有证明图标的实体鼠标命中精度**。
- Headless Chromium 桌面／横向移动端截图没有页面错误或资源请求失败。横向移动端的绘制调用数从 337 保持 337，三角面约从 576,571 增至 582,182。软件渲染器的绝对 FPS 数值不可信，**未验证实体手机 60 FPS**；低画质地毯比高画质更轻量。浏览器交互 smoke 脚本见 `scripts/verify_visual_pass_interactions.mjs`。
- 资产来源见 `ASSETS.md`。地毯 GLB 高画质约 14 MB、低画质约 5.6 MB；后续仍应压缩纹理并做真机测试。

下一轮建议先制作一张从现有房间坐标出发的构图白模图，明确是否允许调整床／鼓／阁楼之间的空间关系。若不允许，目标应改为分别把「床边」和「鼓角」拍出类似的温暖密度，而不是要求同一竖幅镜头重现参考图。
