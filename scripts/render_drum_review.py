import bpy
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
candidate = os.environ.get('MOONROOM_DRUM_CANDIDATE') == '1'
GLB = os.path.join(ROOT, 'public', 'assets', 'models', 'candidates', 'art-katja-drum-kit-moonroom.glb') if candidate else os.path.join(ROOT, 'public', 'assets', 'models', 'acoustic-drum-kit.glb')
OUT = os.path.join(ROOT, 'screenshots', 'candidate-art-katja-blender-review' if candidate else 'a1-1-blender-review')
os.makedirs(OUT, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=GLB)
imported = list(bpy.context.scene.objects)
if not candidate:
    review_root = bpy.data.objects.new('R3F_Orientation', None)
    bpy.context.collection.objects.link(review_root)
    review_root.rotation_euler.x = math.pi / 2
    for obj in imported:
        if obj.parent is None:
            obj.parent = review_root

world = bpy.context.scene.world
world.color = (.025, .015, .05)
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.025, .012, .06, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65 if candidate else .28

def area(name, location, color, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj

def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

key = area('Warm_Key', (-3.8, -4.0, 5.5), (1.0, .86, .72) if candidate else (1.0, .46, .22), 1250 if candidate else 900, 4)
point_at(key, (0, 0, .8))
fill = area('Moon_Fill', (4.5, -1.0, 4.0), (.66, .76, 1.0) if candidate else (.28, .42, 1.0), 1050 if candidate else 700, 5)
point_at(fill, (0, 0, .8))
if candidate:
    rim = area('Neutral_Rim', (0, 4.2, 4.8), (.92, .94, 1.0), 1150, 3.5)
    point_at(rim, (0, 0, 1.0))

bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, -.182 if candidate else -.82))
floor = bpy.context.object
material = bpy.data.materials.new('Review_Floor')
material.diffuse_color = (.055, .018, .08, 1)
material.use_nodes = True
material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .82
floor.data.materials.append(material)

camera_data = bpy.data.cameras.new('Review_Camera')
camera = bpy.data.objects.new('Review_Camera', camera_data)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera
camera_data.lens = 46

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 720 if candidate else 800
scene.render.resolution_y = 450 if candidate else 500
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.render.image_settings.color_mode = 'RGB'
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.studio_light = 'paint.sl' if candidate else 'rim.sl'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = candidate
scene.display.shading.cavity_type = 'BOTH'
if candidate:
    scene.display.shading.background_type = 'VIEWPORT'
    scene.display.shading.background_color = (.18, .18, .21)
scene.view_settings.look = 'AgX - Medium High Contrast'

views = {
    'front': ((0, -6.1, 1.52), (0, 0, .95), 54),
    'side': ((5.2, -2.8, 1.85), (0, 0, .92), 54),
    'drummer': ((-.20, 3.85, 2.05), (0, -.45, 1.22), 54),
    'hardware': ((-2.75, -2.75, 2.25), (-1.18, -.48, 1.93), 62),
}

for name, (location, target, lens) in views.items():
    camera.location = location
    camera.data.lens = lens
    point_at(camera, target)
    scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('RENDER', scene.render.filepath)
