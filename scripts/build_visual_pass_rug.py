"""Re-skin the approved rug test as an isolated, reviewable Moonroom asset.

The existing geometry, world position, woven normal and roughness are retained.
Run: blender -b -P scripts/build_visual_pass_rug.py
"""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/models/candidates/rug-star-moon-pile-test.glb'
ALBEDO = ROOT / 'assets-source/rug/visual-pass-01/textures/moonroom-persian-floral-basecolor.png'
OUT_BLEND = ROOT / 'assets-source/rug/visual-pass-01/source.blend'
OUT_GLB = ROOT / 'public/assets/models/rugs/moonroom-persian-floral-pass01.glb'
OUT_GLB_LOW = ROOT / 'public/assets/models/rugs/moonroom-persian-floral-pass01-low.glb'

if not SOURCE.is_file() or not ALBEDO.is_file():
    raise FileNotFoundError('Rug source GLB and generated Base Color are required')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))

surface = bpy.data.objects['RUG_ShortPlushPile_OneMesh']
backing = bpy.data.objects['RUG_WovenBacking_25mm']
material = surface.data.materials[0]
material.name = 'RUG_Persian_Floral_Wool_PBR_PASS01'
bsdf = material.node_tree.nodes.get('Principled BSDF')
base_link = next(link for link in material.node_tree.links if link.to_node == bsdf and link.to_socket.name == 'Base Color')
base_node = base_link.from_node
base_node.image = bpy.data.images.load(str(ALBEDO), check_existing=True)
base_node.image.colorspace_settings.name = 'sRGB'
base_node.label = 'ImageGen Persian floral pigment — Base Color only'
surface.name = 'RUG_Persian_Floral_Woven_PASS01'
surface['asset_id'] = 'RUG_PERSIAN_FLORAL_PASS01'
surface['visual_only'] = True
backing['visual_only'] = True

for image in bpy.data.images:
    if image.source == 'FILE':
        image.pack()
OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))

bpy.ops.object.select_all(action='DESELECT')
surface.select_set(True)
backing.select_set(True)
bpy.context.view_layer.objects.active = surface
OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True)
decimate = surface.modifiers.new('Mobile_Decimate_Pile', 'DECIMATE')
decimate.ratio = 0.12
for image in bpy.data.images:
    if image.source == 'FILE' and image.size[0] > 1024:
        image.scale(1024, 1024)
        image.pack()
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB_LOW), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True)
print('MOONROOM_RUG_PASS01', OUT_GLB, tuple(round(v, 3) for v in surface.dimensions))
