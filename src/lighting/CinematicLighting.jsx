import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export const CINEMATIC_DEFAULTS = { moonlight: 3.2, warm: 105, ambient: 0.52, exposure: 1.0, bloomStrength: 0.28, bloomThreshold: 1.08 }

export function CinematicLights({ layer, settings, quality }) {
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
  bloom.strength = settings.bloomStrength
  bloom.threshold = settings.bloomThreshold
  useFrame(() => { if (enabled) composer.render() }, enabled ? 1 : 0)
  return null
}
