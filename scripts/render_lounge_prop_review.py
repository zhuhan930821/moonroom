import bpy
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB = os.path.join(ROOT, 'public', 'assets', 'models', 'lounge', 'moon-breathing-lamp.glb')
OUT = os.path.join(ROOT, 'screenshots', 'phase-a2-moon-lamp')
os.makedirs(OUT, exist_ok=True)

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=GLB)

bpy.ops.mesh.primitive_plane_add(size=5, location=(0, 0, 0))
floor = bpy.context.object
floor_mat = bpy.data.materials.new('Neutral_Floor'); floor_mat.diffuse_color = (.16, .15, .18, 1)
floor.data.materials.append(floor_mat)

camera_data = bpy.data.cameras.new('Review_Camera')
camera = bpy.data.objects.new('Review_Camera', camera_data)
bpy.context.collection.objects.link(camera); bpy.context.scene.camera = camera
camera.location = (1.45, -2.2, 1.25); camera.data.lens = 58
camera.rotation_euler = (Vector((0, 0, .48)) - camera.location).to_track_quat('-Z', 'Y').to_euler()

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 700; scene.render.resolution_y = 700; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.display.shading.light = 'STUDIO'; scene.display.shading.studio_light = 'paint.sl'
scene.display.shading.color_type = 'MATERIAL'; scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True; scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.background_type = 'VIEWPORT'; scene.display.shading.background_color = (.24, .22, .27)
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.filepath = os.path.join(OUT, 'blender-neutral.png')
bpy.ops.render.render(write_still=True)
print('RENDER', scene.render.filepath)
