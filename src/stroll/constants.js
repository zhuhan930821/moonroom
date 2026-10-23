// Street geometry shared by layout, physics, content and renderers. The street runs along -Z,
// centred on x = 0; a building on side s (−1 left, +1 right) has its front wall at x = s·FRONT
// and a local depth u (0 at the front wall, DEPTH at the back): world x = s·(FRONT + u).
export const LENGTH = 200, FRONT = 6.2, DEPTH = 7, WALK = 5.3, FLOOR_H = 3.1
export const START_DOOR = [0, 0, 9.4], END_DOOR = [0, 0, -LENGTH - 5]
export const wx = (side, u) => side * (FRONT + u)
