import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session
src = Image.open('/Users/hanzhu/moonroom/assets-source/band/sasa-linche-duo.png').convert('RGB')
sess = new_session('isnet-anime')
human = new_session('u2net_human_seg')
for name, box in [('duo-lean', (0, 0, 762, 724)), ('duo-hair', (769, 0, 1372, 724)), ('duo-back', (1378, 0, 2172, 724))]:
    panel = src.crop(box)
    rgba = np.array(remove(panel, session=sess))
    a = rgba[:, :, 3].astype(np.float32) / 255
    hm = np.array(remove(panel, session=human, only_mask=True)).astype(np.float32) / 255
    a = np.maximum(a, cv2.erode(hm, np.ones((5, 5), np.uint8)))  # dark clothes the anime model drops
    k, lab, st, _ = cv2.connectedComponentsWithStats((a > .3).astype(np.uint8))
    if k > 1:
        big = st[1:, cv2.CC_STAT_AREA].max(); keep = np.zeros_like(a)
        for i in range(1, k):
            if st[i, cv2.CC_STAT_AREA] > big * .01: keep[lab == i] = 1
        a *= cv2.dilate(keep, np.ones((9, 9), np.uint8))
    rgba[:, :, 3] = (a * 255).astype(np.uint8)
    ys, xs = np.where(rgba[:, :, 3] > 12)
    out = Image.fromarray(rgba).crop((max(0, xs.min() - 6), max(0, ys.min() - 6), min(panel.width, xs.max() + 7), min(panel.height, ys.max() + 7)))
    out.save(f'/tmp/mr/band/{name}.png'); print(name, out.size)
