"""Keep only the independently animated globe from Grab3D's CC0 disco-ball asset."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parent.parent
source = root / 'assets-source/third-party/grab3d/disco-ball/disco-ball.glb'
blend = root / 'assets-source/lighting/disco-ball-globe.blend'
glb = root / 'public/assets/models/lighting/disco-ball-globe.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
globe = next(obj for obj in bpy.context.scene.objects if obj.name.startswith('disco-ball_globe'))
for obj in list(bpy.context.scene.objects):
    if obj != globe:
        bpy.data.objects.remove(obj, do_unlink=True)
globe.name = 'BAND_MirrorBall_Globe'
globe.location = (0, 0, 0)
globe.rotation_euler = (0, 0, 0)
bpy.context.view_layer.objects.active = globe
globe.select_set(True)
bpy.ops.file.pack_all()
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_apply=True)
print(f'Wrote {blend} and {glb}')
