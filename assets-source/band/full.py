import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session
src = Image.open('/Users/hanzhu/moonroom/assets-source/band/sasa-band-fullbody.png').convert('RGB')
names = ['shenyu', 'sasa', 'linche']
sess = new_session('isnet-anime')
D = '/tmp/mr/band/'
def cut(panel, name, edge_fade_bottom=False):
    rgba = np.array(remove(panel, session=sess, post_process_mask=False))
    a = rgba[:, :, 3].astype(np.float32) / 255
    # keep the largest blob plus anything touching it (ribbons), drop specks
    k, lab, st, _ = cv2.connectedComponentsWithStats((a > .3).astype(np.uint8))
    if k > 1:
        keep = np.zeros_like(a)
        big = st[1:, cv2.CC_STAT_AREA].max()
        for i in range(1, k):
            if st[i, cv2.CC_STAT_AREA] > big * .01: keep[lab == i] = 1
        a *= cv2.dilate(keep, np.ones((9, 9), np.uint8))
    rgba[:, :, 3] = (a * 255).astype(np.uint8)
    ys, xs = np.where(rgba[:, :, 3] > 12)
    box = (max(0, xs.min() - 6), max(0, ys.min() - 6), min(panel.width, xs.max() + 7), min(panel.height, ys.max() + 7))
    out = Image.fromarray(rgba).crop(box)
    out.save(D + name + '.png'); print(name, out.size)
for i, n in enumerate(names):
    cut(src.crop((i * 512 + 3, 0, (i + 1) * 512 - 3, 694)), f'{n}-stand')
    cut(src.crop((i * 512 + 3, 700, (i + 1) * 512 - 3, 1024)), f'{n}-play')
