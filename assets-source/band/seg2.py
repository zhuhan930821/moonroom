from PIL import Image
from rembg import remove, new_session
for model in ['u2net_human_seg', 'isnet-general-use', 'birefnet-portrait']:
    try:
        sess = new_session(model)
    except Exception as e:
        print(model, 'fail', e); continue
    for n in ['shenyu', 'sasa', 'linche']:
        p = Image.open(f'/tmp/mr/band/{n}-panel.png')
        m = remove(p, session=sess, only_mask=True)
        m.save(f'/tmp/mr/band/{n}-mask-{model}.png')
    print(model, 'ok')
