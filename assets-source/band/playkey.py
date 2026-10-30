import numpy as np, cv2
from PIL import Image
src = np.array(Image.open('/Users/hanzhu/moonroom/assets-source/band/sasa-band-fullbody.png').convert('RGB')).astype(np.float32) / 255
for i, n in enumerate(['shenyu', 'sasa', 'linche']):
    rgb = src[700:1024, i * 512 + 3:(i + 1) * 512 - 3]
    H, W = rgb.shape[:2]
    lum = rgb @ np.array([.299, .587, .114], np.float32)
    bg = np.median(np.concatenate([lum[:8].ravel(), lum[:, :8].ravel()]))
    key = np.clip((lum - bg - .02) / .14, 0, 1)
    seg = np.array(Image.open(f'/tmp/mr/band/{n}-playmask-isnet-general-use.png').convert('L')).astype(np.float32) / 255
    a = np.maximum(key, seg)
    yy, xx = np.mgrid[0:H, 0:W]
    vig = np.clip(np.minimum.reduce([xx / (W * .12), (W - 1 - xx) / (W * .12), yy / (H * .06), (H - 1 - yy) / (H * .3)]), 0, 1)
    a = cv2.GaussianBlur(a * vig, (5, 5), 0)
    out = np.dstack([rgb, a]) * 255
    Image.fromarray(out.astype(np.uint8)).save(f'/tmp/mr/band/{n}-play.png')
    print(n, W, H)
