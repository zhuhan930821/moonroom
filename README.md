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
| E | 使用附近物品；床、沙发或办公椅模式下返回探索 |
| Esc | 退出电脑或鼓组；探索时释放鼠标 |
| J K L ; / U I O / Y H | 鼓手模式：Kick、Snare、闭镲、开镲 / 三个通鼓 / Crash、Ride（数字 1–9 同样可用，也可以用鼠标点鼓面） |
| R 或 Enter / Space / M / [ ] | 鼓手和钢琴模式：录音开关 / 播放最近一段 / 节拍器（钢琴模式是 \\）/ 调速度 |
| G | 鼓手模式：节奏挑战（用录过的鼓组工程当谱面） |
| E（靠近月球灯 / 落地灯 / 书架 / 唱片机） | 开关灯；抽一本书看日记；放 Studio 里压好的唱片 |
| Z 行 + S D 行、Q 行 + 2 3 行 | 钢琴模式：两个八度的白键和黑键；- / = 换八度；Enter 录音 |
| M | 沙发模式：环境音乐开关 |
| C | 探索模式：拉开或合拢整面窗墙的纱帘 |

靠近 CRT、鼓凳、钢琴、笔记本或沙发会出现提示。CRT 的 Diary、Music、Dreams、Studio 图标能打开窗口；**Studio** 列出所有录音工程，可播放、循环、量化、点格子编辑鼓点和钢琴音符、导出 WAV（工程保存在浏览器 localStorage）。书桌右侧的笔记本和副屏打开 **Mugo Moc**（`~/DrumApp`），默认打开线上版本 `https://web-ten-rho-z0tt3ihxv2.vercel.app/`；本地开发可用 `?mugoUrl=http://localhost:5173/` 或环境变量 `VITE_MUGO_URL` 覆盖。右下角设置按钮可调音量和切换「精致 / 流畅」画质。

## 房间里的小互动

- **房间跟着音乐呼吸**：底鼓让灯串膨胀、照亮墙面，军鼓沿灯串送出一道光，镲片点亮星空，钢琴按音高给地面和月亮河染色。
- **吉他**：床边墙上的两把吉他，走过去按 E 拿起来（橙色木吉他，红色电吉他接音箱，Tab 切换）。1–8 选和弦（C G Am F Dm Em E A），Space / J 下扫、K 上扫，Z–N 拨单根弦，M 闷音；手机上点和弦按钮，在扫弦区上下划。声音是实时合成的（Karplus-Strong 拨弦），弹的那把吉他弦会抖、音孔会亮，房间灯光和狐狸也会跟着反应。
- **手柄**：Xbox / PS / Switch Pro 等手柄（线连或蓝牙，连上后按任意键）。左摇杆走、右摇杆看、A 互动、B 返回、Y 窗帘；坐到鼓、钢琴、吉他前都能用手柄演奏，屏幕底部有按键提示。浏览器规定声音要先点一下屏幕才能打开，用手柄进入时会提示。
- **乐队模式**：手柄按 Start（或 ⚙ →「乐队模式」），最多三个人每人按 A 加入，分到鼓 / 吉他 / 钢琴（←/→ 换乐器），Start 开始。吉他搬到鼓和钢琴中间的小舞台上，三样乐器各有一盏聚光灯，谁弹谁亮；镜头自动导播：一个人独奏时推近，几个人一起弹时拉成全景，没人弹时慢慢退回。Back 回大厅，Esc 结束。
- **日记会更新**：房间会悄悄记下你每天做了什么（弹了多少音、摸了哪只狐狸、去了哪个任意门世界、拍的照片、做的梦……）。第二天回来时，书架上多一页用这些写成的日记，打开书会先翻到这一页；当天的那页也能看，标着「还没写完」。只存在这台浏览器里。
- **照片墙**：钢琴上方、阁楼下的照片墙错落排列；走到墙前按 E（或 ⚙ →「整理照片墙」）选挂哪些照片、从相册添加；在任意门那边按 F / 点 📷 拍下的风景会自动挂上去。
- **唱片机**：Studio 里点「压成唱片」，唱片出现在唱片机旁的唱片箱；放上后循环播放，人走开也不停。
- **时间流转**：躺在沙发上，窗外从深夜走到黎明、白天，再经黄昏回到夜里（一圈约 2 分钟）；起身后时间停在当下，可以在白天的房间里走动。设置面板（⚙）可以固定为夜晚、黎明或白天。夜里有蟋蟀，黎明鸟叫最热闹。
- **私人角落**：床边按 E 躺下，可做梦并留下最多 20 段梦境记录；办公椅按 E 坐下，可写并保存私人笔记。笔记和梦仅存在当前浏览器，清除站点数据会删除它们。
- **狐狸**：眠眠睡在床尾，弹琴时耳朵会动，鼓敲得太响会醒来打个哈欠，换个姿势接着睡；音乐响起时云团会走到沙发边，跟着节拍点头，安静一阵后自己走回去。
- **摸摸狐狸**：靠近眠眠或云团按 E，眠眠会醒来蹭蹭手，云团会摇尾巴；云团的互动位置会跟着它走动。
- **城堡亮灯**：把工程压成唱片、节奏挑战拿到三星、或 Mugo 送回一首曲子时，窗外城堡从最高的塔尖开始逐层亮灯，同时响起一段你所在调性的琶音。
- **风铃**：按 C 拉窗帘时风铃会响，音高取自最近一个钢琴工程的调性。
- **Milo 来串门**：在笔记本上的 Mugo 屏幕点「邀请 Milo 来串门」。Milo 坐到鼓边；你弹钢琴时他用 Mugo 的 Tiny Band 鼓点伴奏，录音会把他的鼓一起录进去。
- **一键互送**：Studio 的「↗ 在 Mugo 打开」直接切到笔记本上的 Mugo 并打开当前工程；Mugo 里点「↩ 送回 Moonroom」，曲子会压成唱片放进唱片箱。需要 Mugo 部署了 `moonroom/bridge` 分支（~/DrumApp，等 Codex 合并）；未部署前可用 `?mugoUrl=` 指向本地跑的分支。
- **MIDI 文件互通**：Studio 的「⤓ MIDI」导出标准 MIDI（通用 MIDI 鼓编号与 Mugo 一致），在 Mugo 的「乐谱库 → 导入 MIDI 文件…」打开；Mugo 导出的 MIDI 也能在 Studio 里导入或直接拖进窗口。

## 结构

| 路径 | 内容 |
| --- | --- |
| `src/config/scene.js` | 统一房间、家具、碰撞、相机姿态、交互坐标 |
| `src/config/flags.js` | 所有 URL 复查/调试开关及其默认值（唯一入口） |
| `src/game/` | 第一人称控制、碰撞与统一交互模式 |
| `src/scene/AssetModel.jsx` | 可复用 GLB 加载、材质覆盖、加载占位、碰撞体与交互锚点 |
| `src/scene/` | 房间、月亮河远景、GLB 核心家具、床、狐狸与装饰 |
| `assets/moonroom_asset_inventory.csv` | 62 项原子资产清单与生产状态（以此为准） |
| `assets/workstation/` | 工作台资产 C01–C05 的源文件、GLB、预览与 `asset.json` |
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

## 默认场景与复查开关

所有 URL 开关统一在 `src/config/flags.js` 解析。默认 URL 显示已确认的房间；以下开关只用于复查：

| 开关 | 作用 |
| --- | --- |
| `?deskCandidate=0` / `?laptopCandidate=0` / `?midiCandidate=0` | 回看 C01 / C03 / C05 之前的程序化占位 |
| `?floorMaterialTest=legacy` / `=1` | 回看 Phase 1 原地板 / 橡木测试地板 |
| `?lightingPass=current` | 回看旧灯光；默认已是暖金灯光 + 灯串 + 蜡烛（`docs/golden-pass-01.md`），`?fairyLights=0` 隐藏灯串 |
| `?loungeLegacy=1` | 回看旧的薰衣草躺椅；默认为低矮云朵沙发（F01） |
| `?bedLegacy=1` | 回看旧的 Moon Nest 床；默认为重新配色的 Messy bed 2.0（E01，CC BY 4.0，署名见 `ASSETS.md`） |
| `?spawn=edgeLeft|edgeRight|edgeUp` | 窗边斜视和仰视，用于检查窗外远景是否露边 |
| `?lightingPass=moon|warm|combined|bloom|golden`、`?lightingDebug=1` | 灯光分层与调参面板 |
| `?drumCandidate=1`、`?decorSample=1`、`?rugMaterialTest=1`、`?rugPileTest=1` | 未确认候选（默认不加载） |
| `?voileSample=0`、`?curtainClosed=1`、`?architecture=legacy`、`?whiteModel=1`、`?visualBaseline=1` | 帘子、旧建筑、白模与旧灯光对比 |

## 已知边界

- 已确认的默认 GLB：鼓组（D01）、CRT（C02）、工作长桌（C01）、笔记本与副屏（C03）、音箱（C04）、MIDI（C05）、云朵沙发（F01）、床（E01）与 Phase 1 建筑（Poly Haven 木地板）。书架、唱片机、侧墙键盘、狐狸及次要装饰仍是程序化模型。
- 环境音乐是浏览器合成的安静持续音，不是完整曲目。
- 暂无手柄、移动端触控、AI 狐狸对话或房间外可行走地图。
- 画质开关提供低分辨率和较少云层；60 FPS 仍需在目标中端硬件上实测。
