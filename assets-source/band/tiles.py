from PIL import Image
import numpy as np
out = []
for name, n in [('a', 3), ('b', 4)]:
    im = Image.open(f'/Users/hanzhu/moonroom/assets-source/band/band-memories-{name}.png').convert('RGB')
    W, H = im.size
    for r in range(n):
        for c in range(n):
            x0, y0, x1, y1 = round(c * W / n), round(r * H / n), round((c + 1) * W / n), round((r + 1) * H / n)
            tile = im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3))
            fn = f'{name}{r * n + c + 1:02d}.webp'
            tile.save(f'/Users/hanzhu/moonroom/public/assets/band/memories/{fn}', 'WEBP', quality=82, method=6)
            out.append(fn)
    print(name, im.size)
print(len(out))
for n in ['duo-lean', 'duo-hair', 'duo-back']:
    Image.open(f'/tmp/mr/band/{n}.png').save(f'/Users/hanzhu/moonroom/public/assets/band/{n}.webp', 'WEBP', quality=90, method=6)
