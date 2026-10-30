import numpy as np, cv2
from PIL import Image
D = '/tmp/mr/band/'
# Per character (panel px, 724x724): left strip with text/insets to drop, quote-text boxes to inpaint
# where they overlap the figure, and extra areas to drop (foreground props).
CFG = {
  'shenyu': dict(left=172, inpaint=[(170, 250, 300, 350)], drop=[], bottom=645),
  'sasa':   dict(left=185, inpaint=[(185, 240, 268, 362)], drop=[(0, 230, 200, 365)], bottom=724),
  'linche': dict(left=172, inpaint=[(172, 255, 250, 340)], drop=[(0, 250, 252, 368)], bottom=548),
}
for n, c in CFG.items():
    rgb = np.array(Image.open(D + f'{n}-panel.png').convert('RGB'))
    anime = np.array(Image.open(D + f'{n}-cut.png'))[:, :, 3].astype(np.float32) / 255
    human = np.array(Image.open(D + f'{n}-mask-u2net_human_seg.png').convert('L')).astype(np.float32) / 255
    human = cv2.erode(human, np.ones((7, 7), np.uint8))  # pull the blobby body mask in a little
    a = np.maximum(anime, human)
    keep = np.zeros_like(a); keep[:c['bottom'], c['left']:] = 1
    for x0, y0, x1, y1 in c['drop']: keep[y0:y1, x0:x1] = 0
    keep = cv2.GaussianBlur(keep, (61, 61), 0)  # feather every crop edge; the shader dissolves them further
    a = a * keep
    # Remove the card's quote text where it crosses the figure: bright, low-saturation strokes.
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    tmask = np.zeros(a.shape, np.uint8)
    for x0, y0, x1, y1 in c['inpaint']:
        reg = (hsv[y0:y1, x0:x1, 2] > 150) & (hsv[y0:y1, x0:x1, 1] < 90)
        tmask[y0:y1, x0:x1][reg] = 255
    tmask = cv2.dilate(tmask, np.ones((3, 3), np.uint8), iterations=2)
    rgb = cv2.inpaint(rgb, tmask, 5, cv2.INPAINT_TELEA)
    # keep only the largest connected figure (drops stray specks)
    bin_ = (a > .5).astype(np.uint8)
    k, lab, stats, _ = cv2.connectedComponentsWithStats(bin_)
    if k > 1:
        big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        region = cv2.dilate((lab == big).astype(np.uint8), np.ones((15, 15), np.uint8))
        a = a * region
    rgba = np.dstack([rgb, (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    ys, xs = np.where(rgba[:, :, 3] > 10)
    pad = 14
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(724, xs.max() + pad), min(724, ys.max() + 1))
    Image.fromarray(rgba).crop(box).save(D + f'{n}-final.png')
    print(n, box)
