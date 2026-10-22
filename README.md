# Moonroom — Dreamcore Playable Room

一个本地运行的第一人称 3D 梦核房间，技术栈为 Vite、React、React Three Fiber、Three.js 和 Web Audio。

## 启动

```bash
npm install
npm run dev
```

打开终端给出的地址，点击「进入梦境」。桌面浏览器与键盘/鼠标是目标平台。生产构建与自动测试：

```bash
npm test
npm run build
npm run preview
```

## 操作

| 按键 | 功能 |
| --- | --- |
| WASD / 鼠标 | 走动 / 观察 |
| Shift | 加速行走 |
| E | 使用附近物品；躺下时起身 |
| Esc | 退出电脑或鼓组；探索时释放鼠标 |
| J / K / L | 鼓手模式：Kick / Snare / Hi-hat |
| M | 躺椅模式：环境音乐开关 |
| C | 探索模式：拉开或合拢整面窗墙的纱帘 |

靠近 CRT、鼓凳或懒人躺椅会出现提示。CRT 的 Diary、Music、Dreams 图标能打开和关闭窗口。右下角设置按钮可调音量和切换「精致 / 流畅」画质。

## 结构

| 路径 | 内容 |
| --- | --- |
| `src/config/scene.js` | 统一房间、家具、碰撞、相机姿态、交互坐标 |
| `src/game/` | 第一人称控制、碰撞与统一交互模式 |
| `src/scene/AssetModel.jsx` | 可复用 GLB 加载、材质覆盖、加载占位、碰撞体与交互锚点 |
| `src/scene/` | 房间、月亮河远景、GLB 核心家具、床、狐狸与装饰 |
| `src/ui/Desktop.jsx` | CRT 桌面和三个可点击窗口 |
| `src/audio/drums.js` | CC0 鼓采样播放、原创合成环境音、音量控制 |
| `public/assets/models/` | CRT、完整架子鼓、软体躺椅 GLB |
| `public/assets/textures/` / `public/assets/audio/` | 月亮河远景与鼓采样 |
| `scripts/build_core_assets.py` | Blender GLB 可重复生成脚本 |
| `assets-source/architecture/` / `scripts/build_moonroom_architecture.py` | Blender 房屋源文件与可重复导出脚本 |
| `scripts/build_drum_corner.py` | 鼓角环境 GLB 的 A/C 分阶段生成脚本 |
| `scripts/render_drum_review.py` | 架子鼓正面、侧面、鼓手和五金特写的 Blender 审片脚本 |
| `docs/phase-1.5a-asset-audit.md` | 基础几何审计、加载方式、绑定方式与验证记录 |
| `screenshots/` | 三个游戏内观察位置的截图 |
| `ASSETS.md` | 素材来源与许可记录 |

## 截图与调试视角

开发服务器支持 `?spawn=bed`、`?spawn=deskView`、`?spawn=lounge`、`?spawn=drumCorner`、`?spawn=drumFront` 与 `?spawn=drumSide`。这些只用于复查固定构图，不改变正常入口；`?spawn=desk` 和 `?spawn=drums` 可快速复查交互。加上 `&capture=1` 后按 `P`，开发服务器将当前 3D 画面保存为 `screenshots/moonroom-<spawn>.png`（1600×900）。这是本地开发辅助功能，不进入生产服务器。

第三方鼓组适配测试可在上述 URL 后加入 `&drumCandidate=1`。该开关只替换视觉子模型，继续沿用原有世界坐标、碰撞体、鼓凳锚点和 8 个交互根节点；未加开关时仍加载旧鼓组。未经确认，不应把候选文件改成默认资产。

Phase A2 的 Dream Lounge 审计记录位于 `docs/phase-a2-audit.md`。当前只接入第一个摆件原型 `moon-breathing-lamp.glb`；可用 `?spawn=loungeProp&capture=1` 复查它在休息区中的构图。其余五件摆件尚未批量制作，需先确认该原型的美术品质。

整面拱窗墙共用一根轨道和左右两幅轻纱，探索模式按 `C` 可沿水平方向拉开或合拢。使用 `?spawn=curtainWall&capture=1` 查看，附加 `&voileSample=0` 可对比旧紫帘；详见 `docs/voile-window-sample.md`。

Phase 1 Blender 房屋建筑现为默认场景；可用 `?architecture=legacy` 临时查看旧 Three.js 建筑。建筑、审片截图和集成记录见 `docs/architecture-phase-1.md`。新建筑只替换房屋外壳，不改变鼓组、电脑、家具碰撞或交互坐标。

## 已知边界

- CRT、鼓组和躺椅已转为 GLB；床、书架、现代笔记本、狐狸及次要装饰仍是程序化模型。
- 环境音乐是浏览器合成的安静持续音，不是完整曲目。
- 暂无手柄、移动端触控、AI 狐狸对话或房间外可行走地图。
- 画质开关提供低分辨率和较少云层；60 FPS 仍需在目标中端硬件上实测。
