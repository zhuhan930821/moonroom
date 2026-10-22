import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import Environment from './scene/Environment'
import Furniture from './scene/Furniture'
import PlayerController from './game/PlayerController'
import { INTERACTIONS } from './config/scene'
import { useInteractionSystem } from './game/useInteractionSystem'
import Desktop from './ui/Desktop'
import { preloadCoreAssets } from './scene/AssetModel'
import GLBAsset from './scene/AssetModel'
import { LightingProvider } from './lighting/LightingContext'
import { BLOOM_PASSES, CINEMATIC_DEFAULTS, GOLDEN_DEFAULTS, CinematicLights, CinematicPostFX } from './lighting/CinematicLighting'
import FairyLights from './scene/FairyLights'
import { FLAGS } from './config/flags'

preloadCoreAssets()

function PerformanceProbe() {
  const gl = useThree(state => state.gl)
  const sample = useRef({ elapsed: 0, frames: 0 })
  useFrame((_, delta) => {
    sample.current.elapsed += delta
    sample.current.frames += 1
    if (sample.current.elapsed < 2) return
    window.__moonroomPerf = {
      fps: sample.current.frames / sample.current.elapsed,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    }
    sample.current = { elapsed: 0, frames: 0 }
  })
  return null
}

export default function App() {
  const root = useRef(null)
  const game = useInteractionSystem(root)
  const [quality, setQuality] = useState('high')
  const [showSettings, setShowSettings] = useState(false)
  const [lightingPass, setLightingPass] = useState(FLAGS.lightingPass)
  const [lighting, setLighting] = useState(FLAGS.lightingPass === 'golden' ? GOLDEN_DEFAULTS : CINEMATIC_DEFAULTS)
  const showLightingDebug = FLAGS.lightingDebug
  const cinematic = lightingPass !== 'current'
  const updateLighting = key => event => setLighting(value => ({ ...value, [key]: Number(event.target.value) }))
  const captureRef = useRef(null)
  const { capture: captureEnabled, whiteModel, captureMode, captureName } = FLAGS
  const capture = async () => {
    const state = captureRef.current
    if (!state) return
    const { gl, scene, camera } = state
    const oldWidth = gl.domElement.width, oldHeight = gl.domElement.height, oldAspect = camera.aspect, oldRatio = gl.getPixelRatio()
    gl.setPixelRatio(1)
    gl.setSize(1600, 900, false)
    camera.aspect = 1600 / 900
    camera.updateProjectionMatrix()
    gl.render(scene, camera)
    const dataUrl = gl.domElement.toDataURL('image/png')
    gl.setPixelRatio(oldRatio)
    gl.setSize(oldWidth / oldRatio, oldHeight / oldRatio, false)
    camera.aspect = oldAspect
    camera.updateProjectionMatrix()
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), character => character.charCodeAt(0))
    await fetch(`/__capture?name=${encodeURIComponent(captureName)}`, { method:'POST', headers:{'Content-Type':'image/png'}, body:bytes })
  }
  useEffect(() => {
    if (!captureEnabled || game.started) return
    game.startPreview()
    if (captureMode && ['drums', 'computer', 'beanbag'].includes(captureMode)) game.enter(captureMode)
  }, [captureEnabled, captureMode, game.started, game.startPreview, game.enter])
  useEffect(() => {
    if (!captureEnabled) return
    const onKey = event => { if (event.code === 'KeyP') capture() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const inExplore = game.mode === 'explore'
  const prompt = game.mode === 'beanbag' ? '起身' : inExplore && game.near ? INTERACTIONS[game.near].label : null

  return <main ref={root} onClick={() => game.started && inExplore && !game.locked && game.requestLock()} data-mode={game.mode} data-last-hit={game.hit.name || ''}>
    <Canvas shadows={quality === 'high'} dpr={quality === 'high' ? [1,1.5] : 1} camera={{fov:66,near:.06,far:90}} gl={{antialias:quality === 'high',powerPreference:'high-performance',preserveDrawingBuffer:captureEnabled}} onCreated={state=>{captureRef.current=state}}>
      {whiteModel ? <>
        <color attach="background" args={['#44444a']}/>
        <ambientLight intensity={1.8}/>
        <directionalLight position={[-5,9,4]} intensity={2.2}/>
        <GLBAsset url="/assets/models/review/moonroom-reference-blockout.glb" castShadow={false}/>
      </> : <LightingProvider value={{ cinematic, decorationLights: !cinematic }}>
        <Environment hit={game.hit} quality={quality} cinematic={cinematic}/>
        {cinematic && <CinematicLights layer={lightingPass} settings={lighting} quality={quality}/>} 
        <Furniture hit={game.hit}/>
        {FLAGS.fairyLights && <FairyLights quality={quality}/>}
        {cinematic && <CinematicPostFX enabled={BLOOM_PASSES.includes(lightingPass)} settings={lighting}/>} 
      </LightingProvider>}
      <PlayerController locked={game.locked} mode={game.mode} onPosition={game.updatePosition}/>
      {captureEnabled && <PerformanceProbe/>}
    </Canvas>

    {!game.started && <section className="welcome"><div className="eyebrow">A PLACE BETWEEN DREAMS</div><h1>MOONROOM</h1><p>月光穿过拱窗，房间还记得你。</p><button onClick={game.start}>进入梦境 <span>→</span></button><small>桌面浏览器 · 建议佩戴耳机</small></section>}

    {game.started && <>
      <div className="hud"><div className="brand">MOONROOM <span>{whiteModel ? 'WHITE MODEL / LAYOUT REVIEW' : '01 / THE ROOM'}</span></div><div className="controls"><b>WASD</b> 移动　<b>Shift</b> 加速　<b>鼠标</b> 观察　<b>C</b> 窗帘　<b>Esc</b> 退出</div></div>
      {inExplore && <div className="reticle"/>}
      {!whiteModel && <div className={`prompt ${prompt ? 'show' : ''}`} data-testid="interaction-prompt">{prompt && <><kbd>E</kbd><span>{prompt}</span></>}</div>}
      {inExplore && game.foxName && <div className="fox-hint">✦ {game.foxName}</div>}
      {inExplore && !game.locked && <div className="unlock">点击画面继续探索</div>}
      {game.mode === 'computer' && <><Desktop ambient={game.ambient} onToggleAmbient={game.toggleAmbient}/><div className="mode-exit">Esc · 返回房间</div></>}
      {game.mode === 'drums' && <div className="mode-panel" data-testid="drum-controls"><span>DRUM SESSION</span><div><kbd>J</kbd> Kick　<kbd>K</kbd> Snare　<kbd>L</kbd> Hi-hat</div><small>{game.hit.name ? `刚刚敲击 ${game.hit.name} · ` : ''}Esc · 离开鼓凳</small></div>}
      {game.mode === 'beanbag' && <div className="mode-panel" data-testid="lounge-controls"><span>TAKE A BREATH</span><button onClick={e=>{e.stopPropagation();game.toggleAmbient()}}>{game.ambient ? '❚❚ 暂停环境音乐' : '▶ 播放环境音乐'}</button><small>E · 起身　M · 音乐开关</small></div>}
      <button className="settings-toggle" aria-label="声音与画质设置" onClick={e=>{e.stopPropagation();setShowSettings(v=>!v)}}>⚙</button>
      {captureEnabled && <button className="capture-toggle" onClick={e=>{e.stopPropagation();capture()}}>P · 截图</button>}
      {showSettings && <section className="settings" onClick={e=>e.stopPropagation()}><h2>房间设置</h2><label>音量 <input type="range" min="0" max="1" step="0.01" value={game.volume} onChange={e=>game.changeVolume(Number(e.target.value))}/></label><label>画质 <select value={quality} onChange={e=>setQuality(e.target.value)}><option value="high">精致</option><option value="low">流畅</option></select></label><button onClick={game.toggleAmbient}>{game.ambient?'关闭环境音':'打开环境音'}</button></section>}
      {showLightingDebug && !whiteModel && <section className="lighting-debug" onClick={e=>e.stopPropagation()}>
        <header><span>LIGHTING PASS 01</span><button onClick={()=>setLightingPass(value=>value === 'current' ? 'bloom' : 'current')}>{lightingPass === 'current' ? '查看升级版' : '对比原版'}</button></header>
        <label>渲染层<select value={lightingPass} onChange={e=>setLightingPass(e.target.value)}><option value="current">Current</option><option value="moon">Moon only</option><option value="warm">Warm only</option><option value="combined">Combined</option><option value="bloom">Combined + Bloom</option><option value="golden">Golden (warm)</option></select></label>
        <label>Moonlight <output>{lighting.moonlight.toFixed(2)}</output><input type="range" min="0" max="5" step=".05" value={lighting.moonlight} onChange={updateLighting('moonlight')}/></label>
        <label>Warm lights <output>{lighting.warm.toFixed(1)}</output><input type="range" min="0" max="180" step="1" value={lighting.warm} onChange={updateLighting('warm')}/></label>
        <label>Ambient <output>{lighting.ambient.toFixed(2)}</output><input type="range" min="0" max="1" step=".01" value={lighting.ambient} onChange={updateLighting('ambient')}/></label>
        <label>Exposure <output>{lighting.exposure.toFixed(2)}</output><input type="range" min=".35" max="1.5" step=".01" value={lighting.exposure} onChange={updateLighting('exposure')}/></label>
        <label>Bloom strength <output>{lighting.bloomStrength.toFixed(2)}</output><input type="range" min="0" max="1.2" step=".01" value={lighting.bloomStrength} onChange={updateLighting('bloomStrength')}/></label>
        <label>Bloom threshold <output>{lighting.bloomThreshold.toFixed(2)}</output><input type="range" min=".5" max="2" step=".01" value={lighting.bloomThreshold} onChange={updateLighting('bloomThreshold')}/></label>
      </section>}
      {game.audioError && <div className="audio-error">音频加载失败：{game.audioError}</div>}
    </>}
  </main>
}
