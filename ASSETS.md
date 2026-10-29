# 素材来源与许可证

| 文件或模块 | 来源 | 许可证 / 使用方式 |
| --- | --- | --- |
| `public/assets/audio/kick.m4a` | [Virtuosity Drums 声学 Kick，通过 Keyboardia 的 CC0 素材库整理](https://github.com/adewale/keyboardia/blob/main/app/public/instruments/LICENSE.md) | CC0 1.0；[上游项目](https://github.com/sfzinstruments/virtuosity_drums) |
| `public/assets/audio/snare.m4a` | [Virtuosity Drums 声学 Snare，通过 Keyboardia 的 CC0 素材库整理](https://github.com/adewale/keyboardia/blob/main/app/public/instruments/LICENSE.md) | CC0 1.0；[上游项目](https://github.com/sfzinstruments/virtuosity_drums) |
| `public/assets/audio/hihat.m4a` | [Virtuosity Drums 声学闭合 Hi-hat，通过 Keyboardia 的 CC0 素材库整理](https://github.com/adewale/keyboardia/blob/main/app/public/instruments/LICENSE.md) | CC0 1.0；[上游项目](https://github.com/sfzinstruments/virtuosity_drums) |
| `public/assets/audio/{hihat-open,crash,ride}.wav` | [Virtuosity Drums（mid mic）通过 Keyboardia 的 CC0 素材库整理](https://github.com/adewale/keyboardia/blob/main/app/public/instruments/LICENSE.md) | CC0 1.0；转为单声道 WAV，长尾截短并淡出 |
| `public/assets/audio/{tom-high,tom-low}.wav` | [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums) `mid/htom`、`mid/ltom` center vl12 | CC0 1.0；Floor tom 由 low tom 降调得到 |
| `public/assets/audio/{kick,snare,hihat}.wav` | 上面三行同源 m4a 转 WAV（原 m4a 保存在 `assets-source/audio/`） | CC0 1.0；改为 WAV 是因为部分 Chromium 无法解码 AAC |
| `public/assets/audio/piano/{36..72}.mp3` | [University of Iowa Electronic Music Studios, Steinway grand（MIS）](https://theremin.music.uiowa.edu/MISpiano.html)，经 Keyboardia 整理的 mezzo-forte 采样 | “Free for any projects, without restrictions” |
| `public/assets/models/acoustic-guitar-cc0.glb` | [Grab3D — Acoustic Guitar](https://grab3d.com/models/music/acoustic-guitar/), downloaded from its [GLB file](https://grab3d.com/dl/acoustic-guitar/acoustic-guitar.glb) | CC0 1.0；约 18.8k 三角形，含琴体、琴颈、琴弦和嵌入材质。吉他声音由项目 Web Audio 拨弦算法实时生成，无第三方采样。 |
| `public/art/dream-sky.jpg` | OpenAI imagegen 根据用户参考图与文字要求生成的原创远景天空纹理 | 项目生成素材；没有第三方素材依赖。源图未作为纹理复制进游戏。 |
| `public/assets/textures/moon-river-sky.png` | OpenAI imagegen 根据用户参考图重绘的月亮、云海、城堡与月亮河远景 | 项目生成素材；没有第三方模型或贴图依赖。与多层 3D 云及发光河流几何共同使用。 |
| `public/assets/models/vintage-crt.glb` | 项目内 Blender 原创建模，生成脚本为 `scripts/build_core_assets.py` | 项目原创资产；可随本项目使用与修改。 |
| `public/assets/models/acoustic-drum-kit.glb` | 项目内 Blender 原创建模，生成脚本为 `scripts/build_core_assets.py` | 项目原创资产；可随本项目使用与修改。 |
| `public/assets/models/reclining-lounge.glb` | 项目内 Blender 原创建模，生成脚本为 `scripts/build_core_assets.py` | 项目原创资产；可随本项目使用与修改。 |
| `public/assets/models/drum-corner.glb` | 项目内 Blender 原创建模，生成脚本为 `scripts/build_drum_corner.py`；含星月地毯、落地灯、植物、窗帘/藤蔓、吊星、音乐书架与睡狐 | 项目原创资产；可随本项目使用与修改。没有第三方模型或贴图。 |
| `public/assets/models/lounge/moon-breathing-lamp.glb` | 项目内 Blender 原创建模，生成脚本为 `scripts/build_dream_lounge_props.py` | Phase A2 原创资产；月球灯原型使用共享奶油、薰衣草与香槟金 PBR 材质，没有第三方模型或贴图。 |
| `public/assets/models/decor/room-dressing.glb` | 项目内 Blender 原创盆栽、垂藤、花朵、吊星、吊灯、壁灯、桌灯、灯串外壳与蜡烛；生成脚本 `scripts/build_room_dressing.py`，可编辑源文件 `assets-source/room-dressing/source.blend` | 项目原创资产；没有第三方模型或贴图。网页导出按材质批合并，源文件保留每个物件独立编辑。Three.js 只保留实时光照和音乐驱动的发光核心。 |
| `public/assets/models/architecture/moonroom-architecture-phase1.glb` | 项目内 Blender 原创建筑，源文件 `assets-source/architecture/moonroom-architecture-phase1.blend`，生成脚本 `scripts/build_moonroom_architecture.py` | 项目原创资产；Phase 1 建筑默认加载，旧建筑可用 `?architecture=legacy` 查看。详见 `docs/architecture-phase-1.md`。 |
| `public/assets/models/rugs/moonroom-persian-floral-pass01{,-low}.glb` | Visual Pass 01 地毯测试：基于项目已有短绒地毯网格，OpenAI imagegen 生成的波斯花卉 Base Color，沿用 Poly Haven [Poly Wool Herringbone](https://polyhaven.com/a/poly_wool_herringbone) 的 Normal/Roughness；可编辑源文件 `assets-source/rug/visual-pass-01/source.blend`，生成脚本 `scripts/build_visual_pass_rug.py` | Base Color 为本项目生成素材；Poly Haven 贴图为 CC0。高低画质 GLB 分开导出，`?visualPass=0` 可回看旧地毯。不是对原参考图纹样的逐像素复制。 |
| `public/assets/models/botanical/potted-plant-02-polyhaven.glb` | [Poly Haven Potted Plant 02](https://polyhaven.com/a/potted_plant_02), 1K glTF imported to Blender and re-exported as GLB; editable `assets-source/botanical/potted-plant-02-polyhaven.blend` | CC0; reused beside the bed, left-rear bookshelf, and piano instead of crude floor plants. Source uses 1K Base Color/Normal/Roughness maps. |
| `public/assets/textures/wall-art/rear-crescent-castle.jpg` | Moonroom rear-wall print; original generated image at `assets-source/wall-art/rear-crescent-castle-source.png` | OpenAI imagegen-generated project asset, downsampled for browser use. Mounted as a framed print; not used as room scenery or architecture. |
| `public/assets/models/decor/moonroom-ceiling-wall-dressing-pass02.glb` | 在项目原创 D01 天花花藤样板上制作的 7 组错落吊藤、两侧攀墙藤蔓与 4 件立体星月浮雕画框；生成脚本 `scripts/build_ceiling_wall_dressing.py`，可编辑源文件 `assets-source/decor/phase-02/source.blend` | 项目原创网格和 PBR 材质；没有第三方模型或贴图。独立于建筑 GLB；`?visualPass=0` 可回看旧版。墙面浮雕是可替换的装饰测试，不冒充参考图中完整的绘画资产。 |
| `public/assets/models/collectibles/fox-{sit,sleep}.glb` | 项目内 Blender 原创 Q 版狐狸，生成脚本 `scripts/build_cute_fox.py`，源文件 `assets-source/collectibles/cute-fox/` | 项目原创资产；没有第三方模型或贴图 |
| `src/scene/**` 仍在使用的程序化几何 | 项目内程序化建模 | 用于实时天空、动画效果、部分乐器/家具和窗帘；植物与小型灯具外观已迁至上方 Blender GLB。 |
| `src/audio/drums.js` 环境音 | Web Audio 实时合成 | 项目原创；没有外部曲目或录音。 |

新版远景生成提示强调 16:9 梦核云海、巨大青绿色纹理月球、右侧哥特漂浮城堡、发光轨道，以及从城堡穿过云海向前蜿蜒的青紫色“月亮河”。使用内置 imagegen 生成，配合实时 3D 云层、星光与鼓击发光反馈。

## 书架（G02，2026-10-23 起默认）

`public/assets/models/bookshelf/wooden-bookcases-with-diary.glb` 基于用户提供的 [“Wooden Bookcases with Books” by Matthew Collings](https://sketchfab.com/3d-models/wooden-bookcases-with-books-d0618ac16b2a4a87b9b6c7d5e6765626)，许可为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。原文件保留在 `assets-source/third-party/sketchfab-wooden-bookcases/original.glb`。派生版本只把每柜的一本书改成 Moonroom 原创紫色封面日记；可编辑源文件为 `assets-source/bookshelf/diary-books/source.blend`，生成脚本为 `scripts/build_diary_bookcases.py`。运行时左侧使用矮书柜、右侧使用高书架，日记交互只抽出各柜的这一本书。重新分发时须保留原作者、链接与许可署名。

## 床（E01，2026-10-22 起默认）

| 文件 | 来源 | 许可证 / 署名 |
| --- | --- | --- |
| `public/assets/models/bed/messy-bed-2.glb` | [“Messy bed 2.0 (with wall mounted backboard)” by thethieme](https://sketchfab.com/3d-models/messy-bed-20-with-wall-mounted-backboard-a2b2645701c94fa49e65661806219c6b)，用户提供的转换 GLB；原始文件保存在 `assets-source/third-party/sketchfab-messy-bed-2/original.glb` | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)；分发时必须保留署名。项目只在运行时修改颜色（去掉原底色贴图、保留法线/粗糙度）、放大 2.1 倍并调整朝向，未改动网格 |

完整署名文本：`“Messy bed 2.0 (with wall mounted backboard)” (https://sketchfab.com/3d-models/messy-bed-20-with-wall-mounted-backboard-a2b2645701c94fa49e65661806219c6b) by thethieme is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).`

旧床 Moon Nest（项目原创）仍可用 `?bedLegacy=1` 查看。

## 架子鼓替换调研

检查过两个许可清晰的完整鼓组候选：Heataker 的 Sketchfab “Standard Drum Set”（CC BY，约 439k 三角面）和 art.katja 的 Sketchfab “Drum Kit”（CC BY，约 86k 三角面）。两者下载均需要 Sketchfab 账户授权，本项目没有在未取得原始下载文件时声称导入。最终资产由本机 Blender 原创制作并导出；配置与比例参考标准五鼓原声套鼓照片，而未复制第三方网格或贴图。

## 第三方鼓组候选（仅测试，尚未替换默认资产）

| 文件 | 来源 | 许可证 / 署名 |
| --- | --- | --- |
| `assets-source/drums/art-katja/original/drum-kit.zip` | [“Drum Kit” by art.katja](https://skfb.ly/p9FOp)，由用户提供的原始下载包 | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)；使用时必须保留作者署名 |
| `public/assets/models/candidates/art-katja-drum-kit-moonroom.glb` | 上述模型的独立 Moonroom 视觉测试导出 | CC BY 4.0；网格作者 art.katja。项目仅调整朝向、比例、节点组织与酒红/奶油/黄铜材质 |

可编辑比较文件为 `assets-source/drums/art-katja/working/drum-kit-comparison.blend`，测试版本为 `assets-source/drums/art-katja/working/candidate-moonroom-test.blend`。候选只在 URL 加入 `?drumCandidate=1` 时加载；默认仍使用项目原创的 `acoustic-drum-kit.glb`。完整署名文本：`“Drum Kit” (https://skfb.ly/p9FOp) by art.katja is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).`

## Phase 1.5B 鼓角

本阶段没有下载或混入第三方网格。`drum-corner.glb` 与更新后的 `acoustic-drum-kit.glb` 均由仓库内 Blender 脚本生成；参考图仅用于构图、配色与空间氛围判断。鼓角资产独立于可交互鼓组，便于在不破坏 Kick、Snare、Hi-hat 等节点的情况下迭代装饰和性能。

## Phase A1.1 架子鼓精修

架子鼓继续使用项目原创 Blender 资产，没有引入外部模型。A1.1 增加旋转曲面镲片、完整镲架与踏板五金、鼓圈/鼓耳/拉杆细节，以及内嵌 128×128 奶油鼓皮织理。生成脚本仍为 `scripts/build_core_assets.py`；`scripts/render_drum_review.py` 用于四机位离线几何审片。
