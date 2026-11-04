import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'
import { energy } from '../audio/musicBus'
import { darkness, roomState } from '../game/roomState'
import { FLAGS } from '../config/flags'

export const CINEMATIC_DEFAULTS = { moonlight: 3.2, warm: 105, ambient: 0.52, exposure: 1.0, bloomStrength: 0.28, bloomThreshold: 1.08 }
// Golden pass: warm practicals lead, moonlight only rims the window side (reference: amber, lived-in).
export const GOLDEN_DEFAULTS = FLAGS.visualPass
  ? { moonlight: 1.55, warm: 84, ambient: 0.94, exposure: 1.16, bloomStrength: 0.25, bloomThreshold: 1.2 } // brighter, warmer room
  : { moonlight: 1.35, warm: 70, ambient: 0.95, exposure: 1.15, bloomStrength: 0.38, bloomThreshold: 1.12 }
export const BLOOM_PASSES = ['bloom', 'golden']

function GoldenLights({ settings, quality }) {
  const w = settings.warm
  const moon = useRef(), sky = useRef(), lounge = useRef(), floor = useRef()
  const night = useMemo(() => new THREE.Color(FLAGS.visualPass ? '#9ebdff' : '#b9b4ff'), []), sunrise = useMemo(() => new THREE.Color('#ffc392'), []), noon = useMemo(() => new THREE.Color('#fff3e0'), [])
  const skyNight = useMemo(() => new THREE.Color(FLAGS.visualPass ? '#8194c3' : '#b496cc'), []), skyDawn = useMemo(() => new THREE.Color('#f2b9b0'), []), skyDay = useMemo(() => new THREE.Color('#d4e6ff'), [])
  // Lamps fade rather than snap; with lamps off the moonlight grows and the fill turns bluer.
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4)
    const { lamps } = roomState.get()
    const dark = darkness()
    if (lounge.current) lounge.current.intensity += ((lamps.moon ? w * .7 : 0) - lounge.current.intensity) * k
    if (floor.current) floor.current.intensity += ((lamps.floor ? w * (FLAGS.visualPass ? .75 : .45) : 0) - floor.current.intensity) * k
    const { dawn, day } = roomState.get()
    // Moonlight becomes sunrise, then a bright white sun through the arches.
    if (moon.current) { moon.current.intensity += (settings.moonlight * (1 + dark * 1.1 + dawn * 1.2 + day * 1.9) - moon.current.intensity) * k; moon.current.color.copy(night).lerp(sunrise, dawn).lerp(noon, day) }
    if (sky.current) { sky.current.intensity += (settings.ambient * (1 - dark * .25 + dawn * .35 + day * .55) - sky.current.intensity) * k; sky.current.color.copy(skyNight).lerp(skyDawn, dawn).lerp(skyDay, day) }
  })
  return <>
    <directionalLight ref={moon} position={[1.5, 7.8, -10.5]} color={FLAGS.visualPass ? '#9ebdff' : '#b9b4ff'} intensity={settings.moonlight} castShadow shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={32} shadow-bias={-0.00025} shadow-normalBias={0.035}/>
    <hemisphereLight ref={sky} args={[FLAGS.visualPass ? '#8194c3' : '#b496cc', FLAGS.visualPass ? '#5d4057' : '#8c5a3e', settings.ambient]} />
    {/* desk, lounge moon lamp, drum-corner floor lamp, bed, bookshelf, room fill */}
    <pointLight position={[-.6, 3.2, -3.0]} color="#ffb36a" intensity={w * .8} distance={5.6} decay={2} castShadow={quality === 'high'} shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight ref={lounge} position={[4.15, 2.05, .55]} color="#ffbd78" intensity={w * .7} distance={5} decay={2}/>
    <pointLight ref={floor} position={[-8.2, 3.0, -1.6]} color="#ffa95c" intensity={w * (FLAGS.visualPass ? .75 : .45)} distance={5.4} decay={2}/>
    {FLAGS.visualPass && <pointLight position={[-6.8, 4.3, -2.5]} color="#ffd2a0" intensity={w * .25} distance={5.3} decay={2}/>}
    <pointLight position={[6.6, 3.6, -2.8]} color="#ffbf80" intensity={w * .45} distance={5.5} decay={2}/>
    <pointLight position={[6.0, 4.2, 3.0]} color="#ffb877" intensity={w * .6} distance={6.5} decay={2}/>
    {FLAGS.visualPass && <pointLight position={[3.2, 2.65, 4.7]} color="#ffbf88" intensity={w * .42} distance={5.2} decay={2}/>}
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

// Film look after tone mapping: violet shadows, warm highlights, a soft vignette and fine grain.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.299, .587, .114));
      vec3 shadows = vec3(.035, .012, .05), highlights = vec3(1.04, 1.0, .95);
      vec3 graded = c * mix(vec3(1.), highlights, smoothstep(.45, 1., l)) + shadows * (1. - smoothstep(0., .45, l));
      graded = mix(vec3(dot(graded, vec3(.299, .587, .114))), graded, 1.06);            // a touch more colour
      float vig = smoothstep(1.15, .35, length((vUv - .5) * vec2(1.25, 1.)));
      graded *= mix(.78, 1., vig);
      graded += (hash(vUv * 1000. + fract(uTime) * 61.) - .5) * .022;                   // fine film grain
      gl_FragColor = vec4(mix(c, graded, uAmount), 1.);
    }`,
}

export function CinematicPostFX({ enabled, settings }) {
  const { gl, scene, camera, size } = useThree()
  const composer = useMemo(() => {
    const next = new EffectComposer(gl)
    next.addPass(new RenderPass(scene, camera))
    const look = new URLSearchParams(location.search).get('look') !== '0' // ?look=0: the old chain, for before/after review
    // Contact shadows: ambient occlusion where furniture meets the floor and walls meet.
    const ao = new GTAOPass(scene, camera, size.width, size.height)
    ao.output = GTAOPass.OUTPUT.Default
    ao.blendIntensity = .9
    ao.updateGtaoMaterial({ radius: .7, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 12 })
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 })
    if (look) next.addPass(ao)
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), settings.bloomStrength, .55, settings.bloomThreshold)
    next.addPass(bloom)
    next.addPass(new OutputPass())
    const grade = new ShaderPass(GradeShader)
    if (look) next.addPass(grade)
    // The composer renders off-screen, so the canvas's own antialias does nothing: SMAA instead.
    if (look) next.addPass(new SMAAPass(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio()))
    next.userData = { bloom, grade, ao }
    return next
  }, [gl, scene, camera])
  const { bloom, grade } = composer.userData
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = settings.exposure
    return () => { gl.toneMapping = THREE.NoToneMapping; gl.toneMappingExposure = 1 }
  }, [gl, settings.exposure])
  useEffect(() => { composer.setSize(size.width, size.height) }, [composer, size])
  useEffect(() => () => composer.dispose(), [composer])
  bloom.threshold = settings.bloomThreshold
  useFrame(({ clock }) => {
    if (!enabled) return
    grade.uniforms.uTime.value = clock.elapsedTime
    // The whole room's glow breathes with kicks and cymbals.
    bloom.strength = settings.bloomStrength + energy('kick', 5) * .18 + energy('cymbal', 1.8) * .28 + energy('piano', 2) * .1
    composer.render()
  }, enabled ? 1 : 0)
  return null
}
