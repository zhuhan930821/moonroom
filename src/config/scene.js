export const ROOM = { width: 20, depth: 16, height: 8 }
export const WINDOW_ARCHES = [{ x: -5.25, width: 4.6 }, { x: 0, width: 4.85 }, { x: 5.25, width: 4.6 }]
export const PLAYER = { height: 1.68, radius: 0.34, speed: 3.5, sprint: 5.6 }
export const START = [-1.4, PLAYER.height, 6.5]
export const START_LOOK = [-.12, -.04]
export const QA_SPAWNS = {
  desk: [-2.65, PLAYER.height, -2.55],
  deskView: [-1.1, PLAYER.height, .5],
  deskLaptop: [.65, PLAYER.height, -2.55],
  deskMidi: [2.85, PLAYER.height, -2.55],
  floorClose: [-1.4, PLAYER.height, 2.2],
  drums: [-6.6, PLAYER.height, -.12],
  drumFront: [-7.1, 1.4, -5.85],
  drumSide: [-3.25, 1.55, .05],
  drumCorner: [-7.1, 1.58, 2.35],
  curtainWall: [0, 1.68, 5.7],
  hero: START,
  ceilingGarden: [1.0, 4.5, -.8],
  drumHardware: [-4.45, 1.18, -1.15],
  lounge: [1.3, PLAYER.height, .85],
  loungeProp: [5.5, 1.55, -1.2],
  loungePropWide: [2, 1.55, 5.8],
  sofa: [1.3, 1.48, 6.35],
  bed: [3.55, PLAYER.height, 6.1],
  bedFrame: [4.8, PLAYER.height, 7.5],
  // Window-edge views: oblique looks past the arches used to expose the sky backdrop's edges
  edgeLeft: [-8.8, PLAYER.height, -5.6],
  edgeRight: [8.0, PLAYER.height, -6.6],
  edgeUp: [0, PLAYER.height, -6.2],
}

export const QA_LOOKS = {
  deskLaptop: [0, -.31],
  deskMidi: [0, -.42],
  floorClose: [0, -.67],
  bedFrame: [-.48, -.20],
  drumFront: [Math.PI, -.03],
  drumSide: [.96, -.06],
  drumCorner: [0, -.03],
  curtainWall: [0, -.08],
  hero: START_LOOK,
  ceilingGarden: [-.72, .66],
  drumHardware: [1.05, -.08],
  loungeProp: [2.43, -.15],
  loungePropWide: [-.32, -.10],
  edgeLeft: [-.8, .12],
  edgeRight: [.85, .1],
  edgeUp: [0, .95],
}

export const FURNITURE = {
  bed: { position: [8.45, 0, 3.0], size: [3.3, 1.15, 3.75] },
  bookshelf: { position: [9.05, 0, -3.1], size: [1.25, 4.8, 5.1] },
  desk: { position: [0.1, 0, -4.25], size: [8.2, 1.25, 1.7] },
  drums: { position: [-7.1, 0, -2.8], size: [4.2, 2.2, 3.8] },
  beanbag: { position: [1.3, 0, 3.0], size: [3.6, 1.2, 2.4] },
  keyboard: { position: [-8.9, 0, 2.6], size: [1.4, 1.5, 3.25] },
  record: { position: [-7.6, 0, 5.5], size: [1.55, 1.15, 1.6] },
}

export const COLLIDERS = Object.values(FURNITURE).map(({ position, size }) => ({
  minX: position[0] - size[0] / 2,
  maxX: position[0] + size[0] / 2,
  minZ: position[2] - size[2] / 2,
  maxZ: position[2] + size[2] / 2,
})).concat([
  { minX: -10, maxX: -9.22, minZ: -6.25, maxZ: -4.95 },
  { minX: -9.92, maxX: -9.18, minZ: -3.45, maxZ: -2.55 },
])

export const INTERACTIONS = {
  computer: { position: [-2.65, 0, -3.1], radius: 1.8, label: '使用电脑' },
  drums: { position: [-6.6, 0, -.15], radius: 1.95, label: '坐到鼓凳' },
  beanbag: { position: [1.3, 0, 3.0], radius: 2.25, label: '躺下' },
}

export const FOX_HINTS = [
  { name: '眠眠', position: [7.9, 0, 5.7], radius: 1.4 },
  { name: '云团', position: [3.25, 0, 4.45], radius: 1.5 },
]

export const CAMERA_POSES = {
  computer: { position: [-2.65, 1.75, -2.6], lookAt: [-2.65, 1.45, -4.35] },
  drums: { position: [-7.05, 1.72, -.15], lookAt: [-7.05, 1.1, -2.85] },
  beanbag: { position: [1.3, 1.45, 3.35], lookAt: [.4, 3.2, -13] },
}
