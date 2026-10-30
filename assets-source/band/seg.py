import sys
from PIL import Image
from rembg import remove, new_session
src = Image.open('/Users/hanzhu/moonroom/assets-source/band/sasa-band-cards.png').convert('RGB')
W, H = src.size; pw = W / 3
sess = new_session('isnet-anime')
for i, name in enumerate(['shenyu', 'sasa', 'linche']):
    panel = src.crop((round(i * pw), 0, round((i + 1) * pw), H))
    panel.save(f'/tmp/mr/band/{name}-panel.png')
    out = remove(panel, session=sess, post_process_mask=True)
    out.save(f'/tmp/mr/band/{name}-cut.png')
    print(name, out.size)
