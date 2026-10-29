"""Convert downloaded Poly Haven 1K glTF plants into standalone editable Blender + GLB assets."""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parent.parent
for plant in ('potted_plant_01', 'potted_plant_04'):
    source = ROOT / 'assets-source' / 'third-party' / f'polyhaven-{plant}' / f'{plant}_1k.gltf'
    if not source.exists():
        raise FileNotFoundError(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.name = f'BOTANICAL_{plant}_{obj.name}'
    bpy.ops.file.pack_all()
    blend = ROOT / 'assets-source' / 'botanical' / f'{plant}-polyhaven.blend'
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = ROOT / 'public' / 'assets' / 'models' / 'botanical' / f'{plant}-polyhaven.glb'
    glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_apply=True)
    print(f'{plant}: {blend} -> {glb}')
