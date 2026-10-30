import numpy as np
from PIL import Image
from rembg import remove, new_session
src = Image.open('/Users/hanzhu/moonroom/assets-source/band/sasa-band-fullbody.png').convert('RGB')
for model in ['isnet-general-use', 'u2net']:
    sess = new_session(model)
    for i, n in enumerate(['shenyu', 'sasa', 'linche']):
        panel = src.crop((i * 512 + 3, 700, (i + 1) * 512 - 3, 1024))
        m = remove(panel, session=sess, only_mask=True)
        m.save(f'/tmp/mr/band/{n}-playmask-{model}.png')
    print(model, 'ok')
