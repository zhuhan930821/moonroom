import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Environment from './scene/Environment'
import Furniture from './scene/Furniture'
import PlayerController from './game/PlayerController'
import { INTERACTIONS } from './config/scene'
import { useInteractionSystem } from './game/useInteractionSystem'
import { renderDemoLog, startDemoLog } from './audio/drums'
import { roomState } from './game/roomState'
import Desktop from './ui/Desktop'
import DrumPanel from './ui/DrumPanel'
import RhythmOverlay from './ui/RhythmOverlay'
import PianoPanel from './ui/PianoPanel'
import MugoScreen from './ui/MugoScreen'
import RecordPanel from './ui/RecordPanel'
import PhotoPanel from './ui/PhotoPanel'
import DiaryPage from './ui/DiaryPage'
import ScorePage from './ui/ScorePage'
import { BedDreamPanel, ChairNotePanel } from './ui/PersonalSpacePanels'
import { MobileExploreControls, MobilePianoKeys } from './ui/MobileControls'
import WorldScene from './worlds/WorldScene'
import AnywhereDoor from './worlds/AnywhereDoor'
import SouvenirShelf from './worlds/SouvenirShelf'
import WorldHud from './worlds/WorldHud'
import { WorldCameraButton, WorldShutter } from './worlds/WorldCamera'
import PortalPanel from './worlds/PortalPanel'
import SouvenirPanel from './worlds/SouvenirPanel'
import { worldState } from './worlds/worldState'
import { worldPrompt } from './worlds/worldPrompt'
import { preloadCoreAssets } from './scene/AssetModel'
import GLBAsset from './scene/AssetModel'
import { LightingProvider } from './lighting/LightingContext'
import { BLOOM_PASSES, CINEMATIC_DEFAULTS, GOLDEN_DEFAULTS, CinematicLights, CinematicPostFX } from './lighting/CinematicLighting'
import FairyLights from './scene/FairyLights'
import TimeOfDay from './scene/TimeOfDay'
import Milo from './scene/Milo'
import { FLAGS } from './config/flags'

preloadCoreAssets()

const isTouchScreen = () => typeof window !== 'undefined' && (
  new URLSearchParams(window.location.search).get('mobile') === '1' ||
  window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && window.innerWidth < 1000)
)

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
  const touchInput = useRef({ forward: 0, strafe: 0, lookX: 0, lookY: 0, sprint: false })
  const [isTouch, setIsTouch] = useState(isTouchScreen)
  const game = useInteractionSystem(root)
  const [quality, setQuality] = useState(() => isTouchScreen() ? 'low' : 'high')
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
    const media = window.matchMedia('(pointer: coarse)')
    const update = () => setIsTouch(isTouchScreen())
    media.addEventListener?.('change', update)
    window.addEventListener('resize', update)
    return () => { media.removeEventListener?.('change', update); window.removeEventListener('resize', update) }
  }, [])
  useEffect(() => {
    if (!captureEnabled || game.started) return
    game.startPreview()
    if (captureMode && ['drums', 'computer', 'beanbag', 'piano', 'mugo', 'record', 'books', 'musicBooks', 'photos'].includes(captureMode)) game.enter(captureMode)
  }, [captureEnabled, captureMode, game.started, game.startPreview, game.enter])
  useEffect(() => {
    if (!captureEnabled) return
    const onKey = event => { if (event.code === 'KeyP') capture() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    if (!FLAGS.demo) return
    window.__moonroomGame = game
    window.__moonroomAudio = { startDemoLog, renderDemoLog }
    window.__moonroomRoom = roomState
  })
  // Subscribe to the celebration timestamp (room state is mutated in place, so the object
  // itself never changes identity).
  const celebrateAt = useSyncExternalStore(roomState.subscribe, () => roomState.get().celebrateAt)
  const [, rerender] = useState(0)
  useEffect(() => { const timer = setTimeout(() => rerender(n => n + 1), 7000); return () => clearTimeout(timer) }, [celebrateAt])
  const celebrating = performance.now() / 1000 - celebrateAt < 7
  const world = useSyncExternalStore(worldState.subscribe, () => worldState.get().world) // Anywhere Door
  const worldNear = useSyncExternalStore(worldPrompt.subscribe, worldPrompt.get) // touch button label behind the door
  const inExplore = game.mode === 'explore'
  const prompt = game.mode === 'beanbag' ? '起身' : inExplore && game.near ? INTERACTIONS[game.near].label : null

  return <main ref={root} className={isTouch ? 'touch-layout' : ''} onClick={() => game.started && inExplore && !isTouch && !game.locked && game.requestLock()} data-mode={game.mode} data-last-hit={game.hit.name || ''}>
    <Canvas shadows={quality === 'high'} dpr={quality === 'high' ? [1,1.5] : 1} camera={{fov:66,near:.06,far:90}} gl={{antialias:quality === 'high',powerPreference:'high-performance',preserveDrawingBuffer:captureEnabled}} onCreated={state=>{captureRef.current=state;if(captureEnabled)window.__moonroomCaptureScene=state.scene}}>
      {world && <WorldShutter/>}
      {world ? <WorldScene world={world}/> : whiteModel ? <>
        <color attach="background" args={['#44444a']}/>
        <ambientLight intensity={1.8}/>
        <directionalLight position={[-5,9,4]} intensity={2.2}/>
        <GLBAsset url="/assets/models/review/moonroom-reference-blockout.glb" castShadow={false}/>
      </> : <LightingProvider value={{ cinematic, decorationLights: !cinematic }}>
        <Environment hit={game.hit} quality={quality} cinematic={cinematic}/>
        {cinematic && <CinematicLights layer={lightingPass} settings={lighting} quality={quality}/>} 
        <Furniture hit={game.hit} foxPet={game.foxPet} quality={quality} onStrike={game.mode === 'drums' ? game.strike : null}
          pianoNotes={game.pianoNotes} onNoteOn={game.mode === 'piano' ? game.noteOn : null} onNoteOff={game.noteOff}
          records={game.records} vinylId={game.vinyl?.id} pulledBook={game.book?.index} activeBookShelf={game.activeBookShelf}/>
        {FLAGS.fairyLights && <FairyLights quality={quality}/>}
        <TimeOfDay resting={game.mode === 'beanbag' || game.mode === 'bed'}/>
        <AnywhereDoor/><SouvenirShelf/>
        {game.milo.visiting && <Milo aside={game.mode === 'drums'}/>}
        {cinematic && <CinematicPostFX enabled={quality === 'high' && BLOOM_PASSES.includes(lightingPass)} settings={lighting}/>}
      </LightingProvider>}
      <PlayerController locked={game.locked} mode={game.mode} onPosition={game.updatePosition} activeBookShelf={game.activeBookShelf} touchInput={touchInput} touchEnabled={isTouch}/>
      {captureEnabled && <PerformanceProbe/>}
    </Canvas>

    {!game.started && <section className="welcome"><div className="eyebrow">A PLACE BETWEEN DREAMS</div><h1>MOONROOM</h1><p>月光穿过拱窗，房间还记得你。</p><button onClick={() => game.start(isTouch)}>进入梦境 <span>→</span></button><small>{isTouch ? '左手移动 · 右侧滑动观察 · 建议横屏' : '桌面浏览器 · 建议佩戴耳机'}</small></section>}

    {game.started && <>
      <div className="hud"><div className="brand">MOONROOM <span>{whiteModel ? 'WHITE MODEL / LAYOUT REVIEW' : '01 / THE ROOM'}</span></div><div className="controls"><b>WASD</b> 移动　<b>Shift</b> 加速　<b>鼠标</b> 观察　<b>C</b> 窗帘　<b>Esc</b> 退出</div></div>
      {inExplore && <div className="reticle"/>}
      {!whiteModel && <div className={`prompt ${prompt ? 'show' : ''}`} data-testid="interaction-prompt">{prompt && <><kbd>E</kbd><span>{prompt}</span></>}</div>}
      {inExplore && game.foxName && <div className="fox-hint">✦ {game.foxName}</div>}
      {game.foxPet && <div key={game.foxPet.id} className="fox-pet-toast">✦ {game.foxPet.name === '眠眠' ? '眠眠半睁着眼，轻轻蹭了蹭你的手' : '云团开心地摇起尾巴'}</div>}
      {celebrating && <div className="castle-toast" data-testid="castle-toast">✦ {roomState.get().celebration} · 窗外的城堡为你亮起来了</div>}
      {inExplore && game.milo.visiting && <div className="milo-hint">Milo 来串门了 · 坐到钢琴前，他会给你伴奏</div>}
      {inExplore && !isTouch && !game.locked && !FLAGS.demo && <div className="unlock">点击画面继续探索</div>}
      {isTouch && inExplore && <MobileExploreControls input={touchInput} near={world ? worldNear : game.near ? INTERACTIONS[game.near].label : null}
        onInteract={() => world ? window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })) : game.interact()}
        onCurtain={() => window.dispatchEvent(new Event('moonroom:toggle-curtain'))}/>}
      {isTouch && !inExplore && <button className="mobile-exit" data-testid="mobile-exit" onClick={event => { event.stopPropagation(); game.leave() }}>← 返回探索</button>}
      {game.mode === 'computer' && <><Desktop ambient={game.ambient} onToggleAmbient={game.toggleAmbient} onHit={game.pulse} onOpenInMugo={() => game.enter('mugo')}/><div className="mode-exit">Esc · 返回房间</div></>}
      {game.mode === 'drums' && <DrumPanel game={game}/>}
      {game.mode === 'drums' && game.challenge && <RhythmOverlay challenge={game.challenge} subscribeStrikes={game.subscribeStrikes} onRetry={() => game.startChallenge(game.challenge.take.id)} onClose={game.endChallenge}/>}
      {game.mode === 'piano' && <PianoPanel game={game}/>}
      {isTouch && game.mode === 'piano' && <MobilePianoKeys game={game}/>}
      {game.mode === 'mugo' && <MugoScreen onExit={game.leave} milo={game.milo} onInviteMilo={game.inviteMilo}/>}
      {game.mode === 'record' && <RecordPanel game={game}/>}
      {game.mode === 'photos' && <PhotoPanel/>}
      {game.mode === 'portal' && <PortalPanel onDone={game.leave}/>}
      {game.mode === 'souvenirs' && <SouvenirPanel onRevisit={async item => { game.enter('portal'); await worldState.open({ spec: item.world }); game.leave() }}/>}
      <WorldHud playerPosition={game.playerPosition} mode={game.mode}/>
      <WorldCameraButton active={inExplore}/>
      {game.mode === 'books' && game.book && <DiaryPage book={game.book} onNext={game.pullBook} onClose={game.leave}/>}
      {game.mode === 'musicBooks' && <ScorePage page={game.scorePage} onNext={game.nextScore} onClose={game.leave}/>}
      {game.mode === 'bed' && <BedDreamPanel onClose={game.leave}/>}
      {game.mode === 'deskChair' && <ChairNotePanel onClose={game.leave}/>}
      {game.mode === 'beanbag' && <div className="mode-panel" data-testid="lounge-controls"><span>TAKE A BREATH</span><button onClick={e=>{e.stopPropagation();game.toggleAmbient()}}>{game.ambient ? '❚❚ 暂停环境音乐' : '▶ 播放环境音乐'}</button><small>E · 起身　M · 音乐开关</small></div>}
      <button className="settings-toggle" aria-label="声音与画质设置" onClick={e=>{e.stopPropagation();setShowSettings(v=>!v)}}>⚙</button>
      {captureEnabled && !FLAGS.demo && <button className="capture-toggle" onClick={e=>{e.stopPropagation();capture()}}>P · 截图</button>}
      {showSettings && <section className="settings" onClick={e=>e.stopPropagation()}><h2>房间设置</h2><label>音量 <input type="range" min="0" max="1" step="0.01" value={game.volume} onChange={e=>game.changeVolume(Number(e.target.value))}/></label><label>画质 <select value={quality} onChange={e=>setQuality(e.target.value)}><option value="high">精致</option><option value="low">流畅</option></select></label><label>时间 <select id="time-mode" defaultValue={roomState.get().timeMode} onChange={e=>roomState.setTimeMode(e.target.value)}><option value="auto">跟随沙发（躺下时流转）</option><option value="night">夜晚</option><option value="dawn">黎明</option><option value="day">白天</option></select></label><button onClick={game.toggleAmbient}>{game.ambient?'关闭环境音':'打开环境音'}</button>{inExplore && <button onClick={()=>{setShowSettings(false);game.enter('photos')}}>整理照片墙</button>}</section>}
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
