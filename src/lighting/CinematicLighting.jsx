import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { energy } from '../audio/musicBus'
import { darkness, roomState } from '../game/roomState'

export const CINEMATIC_DEFAULTS = { moonlight: 3.2, warm: 105, ambient: 0.52, exposure: 1.0, bloomStrength: 0.28, bloomThreshold: 1.08 }
// Golden pass: warm practicals lead, moonlight only rims the window side (reference: amber, lived-in).
export const GOLDEN_DEFAULTS = { moonlight: 1.35, warm: 70, ambient: 0.95, exposure: 1.15, bloomStrength: 0.38, bloomThreshold: 1.12 }
export const BLOOM_PASSES = ['bloom', 'golden']

function GoldenLights({ settings, quality }) {
  const w = settings.warm
  const moon = useRef(), sky = useRef(), lounge = useRef(), floor = useRef()
  // Lamps fade rather than snap; with lamps off the moonlight grows and the fill turns bluer.
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4)
    const { lamps } = roomState.get()
    const dark = darkness()
    if (lounge.current) lounge.current.intensity += ((lamps.moon ? w * .7 : 0) - lounge.current.intensity) * k
    if (floor.current) floor.current.intensity += ((lamps.floor ? w * .45 : 0) - floor.current.intensity) * k
    if (moon.current) moon.current.intensity += (settings.moonlight * (1 + dark * 1.1) - moon.current.intensity) * k
    if (sky.current) sky.current.intensity += (settings.ambient * (1 - dark * .25) - sky.current.intensity) * k
  })
  return <>
    <directionalLight ref={moon} position={[1.5, 7.8, -10.5]} color="#b9b4ff" intensity={settings.moonlight} castShadow shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={32} shadow-bias={-0.00025} shadow-normalBias={0.035}/>
    <hemisphereLight ref={sky} args={['#b496cc', '#8c5a3e', settings.ambient]} />
    {/* desk, lounge moon lamp, drum-corner floor lamp, bed, bookshelf, room fill */}
    <pointLight position={[-.6, 3.2, -3.0]} color="#ffb36a" intensity={w * .8} distance={5.6} decay={2} castShadow={quality === 'high'} shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight ref={lounge} position={[4.15, 2.05, .55]} color="#ffbd78" intensity={w * .7} distance={5} decay={2}/>
    <pointLight ref={floor} position={[-8.2, 3.0, -1.6]} color="#ffa95c" intensity={w * .45} distance={5.4} decay={2}/>
    <pointLight position={[6.6, 3.6, -2.8]} color="#ffbf80" intensity={w * .45} distance={5.5} decay={2}/>
    <pointLight position={[6.0, 4.2, 3.0]} color="#ffb877" intensity={w * .6} distance={6.5} decay={2}/>
    <pointLight position={[0, 5.4, 1.5]} color="#ffc995" intensity={w * .7} distance={12} decay={2}/>
  </>
}

export function CinematicLights({ layer, settings, quality }) {
  if (layer === 'golden') return <GoldenLights settings={settings} quality={quality}/>
  const moon = layer === 'moon' || layer === 'combined' || layer === 'bloom'
  const warm = layer === 'warm' || layer === 'combined' || layer === 'bloom'
  const ambient = layer === 'combined' || layer === 'bloom'
  return <>
    {moon && <directionalLight position={[1.5, 7.8, -10.5]} color="#aebfff" intensity={settings.moonlight} castShadow shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={32} shadow-bias={-0.00025} shadow-normalBias={0.035} shadow-radius={quality === 'high' ? 4 : 2}/>} 
    {warm && <><pointLight position={[-2.7, 2.55, -4.05]} color="#ffb56f" intensity={settings.warm} distance={5.2} decay={2} castShadow={quality === 'high'} shadow-mapSize-width={512} shadow-mapSize-height={512}/><pointLight position={[4.15, 2.05, .55]} color="#ffc07c" intensity={settings.warm * .58} distance={4.6} decay={2}/></>}
    {ambient && <hemisphereLight args={['#8396c8', '#382a39', settings.ambient]} />}
  </>
}

export function CinematicPostFX({ enabled, settings }) {
  const { gl, scene, camera, size } = useThree()
  const composer = useMemo(() => {
    const next = new EffectComposer(gl)
    next.addPass(new RenderPass(scene, camera))
    next.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), settings.bloomStrength, .55, settings.bloomThreshold))
    next.addPass(new OutputPass())
    return next
  }, [gl, scene, camera])
  const bloom = composer.passes[1]
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = settings.exposure
    return () => { gl.toneMapping = THREE.NoToneMapping; gl.toneMappingExposure = 1 }
  }, [gl, settings.exposure])
  useEffect(() => { composer.setSize(size.width, size.height) }, [composer, size])
  useEffect(() => () => composer.dispose(), [composer])
  bloom.threshold = settings.bloomThreshold
  useFrame(() => {
    if (!enabled) return
    // The whole room's glow breathes with kicks and cymbals.
    bloom.strength = settings.bloomStrength + energy('kick', 5) * .18 + energy('cymbal', 1.8) * .28 + energy('piano', 2) * .1
    composer.render()
  }, enabled ? 1 : 0)
  return null
}
