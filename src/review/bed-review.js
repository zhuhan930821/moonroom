import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
window.__bedReviewScene = scene
window.__bedReviewTHREE = THREE
scene.background = new THREE.Color('#6b586b')
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100)
window.__bedReviewCamera = camera
camera.position.set(2.6, 2.2, 3.5)
const view = new URLSearchParams(location.search).get('view')
if (view === 'side') camera.position.set(4.3, 1.65, 0.35)
if (view === 'back') camera.position.set(-2.6, 2.0, -3.5)
camera.lookAt(0, 0.55, 0)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.75
document.body.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight('#e5ddff', '#916974', 1.1))
const key = new THREE.DirectionalLight('#ffe1b5', 1.8)
key.position.set(2, 5, 3)
scene.add(key)
const fill = new THREE.DirectionalLight('#a5a1f1', 0.7)
fill.position.set(-3, 2, -2)
scene.add(fill)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: '#5c4857', roughness: 1 }),
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.02
scene.add(floor)

new GLTFLoader().load('/assets/models/review/moon-nest-textile-sample.glb', gltf => {
  scene.add(gltf.scene)
  document.body.dataset.loaded = 'true'
  document.body.dataset.meshes = String(gltf.scene.getObjectsByProperty('type', 'Mesh').length)
  renderer.render(scene, camera)
}, undefined, error => {
  document.body.dataset.error = String(error)
})

renderer.render(scene, camera)
