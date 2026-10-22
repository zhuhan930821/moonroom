import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FBX = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'original', 'extracted', 'source', 'Drum Set_sketchfab.fbx')
WORKING = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'working')
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'candidates', 'art-katja-drum-kit-moonroom.glb')

CORE = {
    'Kick': ['Cylinder.002'], 'Snare': ['Cylinder.004'], 'Tom_One': ['Cylinder'],
    'Tom_Two': ['Cylinder.067'], 'Floor_Tom': ['Cylinder.003'],
    'Crash': ['Circle.003'], 'Ride': ['Circle.005'], 'HiHat_Top': ['Circle.006', 'Circle.007'],
}

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for material in list(bpy.data.materials): bpy.data.materials.remove(material)

def set_pbr(material, color, metallic, roughness, coat=0):
    material.diffuse_color = (*color, 1); material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1); shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness; shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .18

def duplicate_material(source, name, color, metallic, roughness):
    material = source.copy(); material.name = name; set_pbr(material, color, metallic, roughness); return material

def preserve_parent(obj, parent):
    world = obj.matrix_world.copy(); obj.parent = parent; obj.matrix_world = world

reset(); bpy.ops.import_scene.fbx(filepath=FBX, use_image_search=True)
floor = bpy.data.objects.get('Plane.001')
if floor: bpy.data.objects.remove(floor, do_unlink=True)

materials = bpy.data.materials
set_pbr(materials['Main Color'], (.22, .012, .055), .18, .20, .42)
set_pbr(materials['Metal'], (.055, .065, .085), .90, .19)
set_pbr(materials['Black'], (.015, .010, .022), .12, .48)
set_pbr(materials['Black Glossy'], (.025, .015, .035), .50, .12)
set_pbr(materials['Black Glossy.001'], (.045, .025, .055), .15, .34)
set_pbr(materials['Transparent'], (.88, .76, .58), .02, .55)
set_pbr(materials['Black transp'], (.90, .79, .62), .01, .58)
set_pbr(materials['Beige'], (.80, .60, .34), .04, .56)
brass = duplicate_material(materials['Metal'], 'Moonroom_Brushed_Brass', (.58, .40, .18), .76, .30)
cream_head = duplicate_material(materials['Transparent'], 'Moonroom_Cream_Drumhead', (.91, .82, .66), .02, .48)
shell_lacquer = duplicate_material(materials['Main Color'], 'Moonroom_Wine_Lacquer', (.19, .009, .035), .22, .20)
set_pbr(shell_lacquer, (.19, .009, .035), .22, .20, .32)
for name in ('Circle.003', 'Circle.005', 'Circle.006', 'Circle.007'):
    obj = bpy.data.objects.get(name)
    if obj:
        for index, slot in enumerate(obj.material_slots):
            if slot.material and slot.material.name == 'Metal': obj.data.materials[index] = brass

# The source model uses separate material slots to draw black concentric rings on
# each head. Preserve the existing geometry and hardware, but make every head
# surface a single soft cream material and give only the shells a wine lacquer.
for name in ('Cylinder.002', 'Cylinder.004', 'Cylinder', 'Cylinder.067', 'Cylinder.003'):
    obj = bpy.data.objects.get(name)
    if not obj: continue
    for index, slot in enumerate(obj.material_slots):
        if not slot.material: continue
        if slot.material.name in {'Transparent', 'Black transp', 'Black Glossy', 'Black Glossy.001'}:
            obj.data.materials[index] = cream_head
        elif slot.material.name == 'Main Color':
            obj.data.materials[index] = shell_lacquer

global_root = bpy.data.objects.new('Candidate_DrumKit_Visual', None); bpy.context.collection.objects.link(global_root)
claimed = set()
for root_name, object_names in CORE.items():
    members = [bpy.data.objects.get(name) for name in object_names]; members = [obj for obj in members if obj]
    if not members: continue
    center = sum((obj.location for obj in members), members[0].location.copy() * 0) / len(members)
    interaction_root = bpy.data.objects.new(root_name, None); bpy.context.collection.objects.link(interaction_root)
    interaction_root.location = center; interaction_root['interaction_part'] = root_name
    for obj in members: preserve_parent(obj, interaction_root); claimed.add(obj)
    preserve_parent(interaction_root, global_root)

# Minimal bass-head emblem: two shallow discs reuse the existing head plane and
# add only 96 vertices. The offset cream disc cuts a restrained crescent from the
# wine-colored disc without changing the kick mesh or its interaction root.
kick_root = bpy.data.objects.get('Kick')
if kick_root:
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=.145, fill_type='NGON', location=(-.08, .301, -.83), rotation=(math.pi / 2, 0, 0))
    moon = bpy.context.object; moon.name = 'Kick_Moon_Emblem'; moon.data.materials.append(shell_lacquer); preserve_parent(moon, kick_root)
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=.124, fill_type='NGON', location=(-.025, .303, -.80), rotation=(math.pi / 2, 0, 0))
    moon_cut = bpy.context.object; moon_cut.name = 'Kick_Moon_Cutout'; moon_cut.data.materials.append(cream_head); preserve_parent(moon_cut, kick_root)
for obj in list(bpy.context.scene.objects):
    if obj in claimed or obj == global_root or obj.parent: continue
    preserve_parent(obj, global_root)

global_root.rotation_euler.z = math.pi; global_root.scale = (1.15, 1.15, 1.15); global_root.location.z = 1.525
global_root['source'] = 'https://skfb.ly/p9FOp'; global_root['author'] = 'art.katja'; global_root['license'] = 'CC BY 4.0'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORKING, 'candidate-moonroom-test.blend'))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_extras=True)
print('EXPORT', OUT)
