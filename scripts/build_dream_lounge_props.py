import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(ROOT, 'assets-source', 'lounge')
MODEL_DIR = os.path.join(ROOT, 'public', 'assets', 'models', 'lounge')
os.makedirs(SOURCE_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

def material(name, color, metallic=0, roughness=.5, emission=None, strength=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = strength
    mat.diffuse_color = (*color, 1)
    return mat

cream = material('A2_Cream_Ceramic', (.82, .68, .55), 0, .38)
lavender = material('A2_Lavender_Ceramic', (.38, .20, .50), 0, .30)
gold = material('A2_Champagne_Gold', (.58, .40, .19), .76, .27)
moon = material('Moon_Glow', (.88, .77, .58), .02, .56, (.98, .74, .42), 1.35)
crater = material('Moon_Crater', (.55, .43, .38), 0, .72)

def smooth(obj):
    if obj.type == 'MESH':
        for poly in obj.data.polygons: poly.use_smooth = True
    return obj

def uv(name, location, scale, mat, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object; obj.name = name; obj.scale = scale
    obj.data.materials.append(mat); smooth(obj)
    return obj

def cylinder(name, location, radius, depth, mat, vertices=48, bevel=.02):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(mat); smooth(obj)
    if bevel:
        mod = obj.modifiers.new('Soft_Edges', 'BEVEL'); mod.width = bevel; mod.segments = 3
    return obj

root = bpy.data.objects.new('Moon_Breathing_Lamp', None)
bpy.context.collection.objects.link(root)

base = cylinder('Lamp_Base', (0, 0, .09), .25, .18, lavender, bevel=.035); base.parent = root
foot = cylinder('Lamp_Foot_Ring', (0, 0, .025), .27, .045, gold, bevel=.012); foot.parent = root
stem = cylinder('Lamp_Stem', (0, 0, .30), .045, .42, gold, vertices=40, bevel=.012); stem.parent = root
collar = cylinder('Lamp_Moon_Collar', (0, 0, .515), .115, .055, gold, bevel=.014); collar.parent = root

globe = uv('Moon_Globe', (0, 0, .69), (.285, .285, .285), moon, 72, 40); globe.parent = root
# Subtle silhouette relief; these shallow patches read as lunar dimples rather
# than added mechanical detail and share one material/draw-call family.
for index, (direction, radius) in enumerate([
    ((-.72,-.48,.50),.060), ((.46,-.78,.28),.048), ((.66,-.26,.69),.038),
    ((-.18,-.91,-.12),.034), ((-.65,-.58,-.46),.043), ((.18,-.94,.39),.027),
]):
    normal = Vector(direction).normalized()
    position = Vector((0,0,.69)) + normal * .278
    patch = uv(f'Moon_Crater_{index+1:02d}', position, (radius, radius, .012), crater, 32, 12)
    patch.rotation_euler = normal.to_track_quat('Z', 'Y').to_euler()
    patch.parent = root

anchor = bpy.data.objects.new('Anchor_Moon_Lamp', None)
bpy.context.collection.objects.link(anchor); anchor.location = (0, 0, .52); anchor.parent = root
root['asset'] = 'Moon Breathing Lamp'; root['phase'] = 'A2.2 prototype'; root['dimensions_m'] = '0.55 x 0.55 x 0.98'

blend_path = os.path.join(SOURCE_DIR, 'moon-breathing-lamp.blend')
glb_path = os.path.join(MODEL_DIR, 'moon-breathing-lamp.glb')
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_apply=True, export_yup=True, export_extras=True)
print('BLEND', blend_path)
print('GLB', glb_path)
