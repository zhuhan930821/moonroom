# Moonroom — Ceiling Garden & Wall Dressing Pass 02

本轮只增加现有房间的上层植物与侧墙装饰；建筑、窗、家具、鼓组、碰撞和交互均不移动。可用 `?decorPass02=0` 单独关闭这批装饰作同机位对比。

## 资产和位置

- `assets-source/decor/phase-02/source.blend`：独立可编辑 Blender 源文件。沿用 D01 原创花藤的弯曲茎、三种叶簇和三种小花，组合为七组不同长度／疏密的吊顶植物。分别固定于 `X=-9.3/-6.5/3.25/6.5/9.3` 的既有梁位，重点铺在左阁楼、左右窗角和休息区上方；中间月亮保留负空间。
- 两侧墙面的攀墙藤蔓从原有檐口下垂；另有四件带厚度的木金边框、月亮／云层浅浮雕。它们位于侧墙上部，避开鼓、书架、床头与行走区。浮雕画是可替换的本轮测试资产，不声称达到参考图中插画／海报的细节质量。
- `public/assets/models/decor/moonroom-ceiling-wall-dressing-pass02.glb`：运行时按共享材质合批为 16 个网格，约 43k Blender 面，约 2–3 MB。没有每朵花或每只灯泡对应的实时光源；高画质沿用样板的一盏局部暖补光，低画质不加补光。

## 同机位审片

- [加入前入口](../screenshots/visual-overhaul-pass01/reference-final/hero-desktop.png) / [本轮入口](../screenshots/visual-overhaul-pass01/dressing-release/hero-desktop.png)
- [本轮移动端](../screenshots/visual-overhaul-pass01/dressing-release/hero-mobile.png)
- [左墙近景](../screenshots/visual-overhaul-pass01/dressing-release/wall-left.png)
- [天花近景](../screenshots/visual-overhaul-pass01/dressing-pass02-final/ceiling-garden.png)：此图拍摄于最后一次移动左侧藤蔓、修改画框浮雕之前，仅用于检查模块几何和梁上附着。

## 美术判断与边界

吊藤在主视角形成更明显的前景边框，墙面不再完全空白。反复截图后将一组挡月亮的藤蔓移回左侧阁楼梁位，并把过高的画框降到视线范围。仍存在明显差距：现有叶片是风格化折面网格，近景的植物精细度、花叶遮挡与参考插画不在同一等级；墙面浅浮雕还不是高品质叙事插画。下一轮若要真正靠近参考，应先审定 1–2 件高质量植物／画作资产，再替换这批模块，而不是继续无限复制。

## 验证

`blender -b -P scripts/build_ceiling_wall_dressing.py` 成功输出可编辑 .blend 和 GLB；`npm test` 32/32 通过；`npm run build` 通过。浏览器截图的页面错误为零，见 `dressing-release/results.json`。自动交互烟测在软件渲染环境中等待鼓组退出时超时，因此本轮**没有确认**鼓组和电脑交互的端到端结果，仍需在正常浏览器中复测。软件渲染器的 FPS 不能代表实体手机；仍需真机测试。
