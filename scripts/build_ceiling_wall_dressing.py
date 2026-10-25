"""Extend the reviewed ceiling vine sample and add shallow 3D wall art.

Run: blender -b -P scripts/build_ceiling_wall_dressing.py
This makes a separate source.blend and GLB; the room/architecture GLBs stay intact.
Coordinates follow the existing Moonroom Blender source (Y-up, corrected by GLBAsset).
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-source/decor/phase-01/moonroom-decor-phase01-ceiling-sample.blend'
OUT = ROOT / 'assets-source/decor/phase-02'
GLB = ROOT / 'public/assets/models/decor/moonroom-ceiling-wall-dressing-pass02.glb'
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
source_objects = [obj for obj in bpy.data.objects if obj.name.startswith('D01_')]
assert source_objects, 'Ceiling vine sample is missing'

# The original test reads too pale under Moonroom's warm practical lights.
# Keep the same meshes and variations but bring foliage back to muted sage.
for name, color in (
    ('D01_Leaf_SageShadow', (.13,.235,.16)),
    ('D01_Leaf_DustyOlive', (.20,.285,.18)),
    ('D01_Leaf_MoonlitSage', (.23,.32,.25)),
    ('D01_Flower_Ivory', (.76,.67,.58)),
    ('D01_Flower_DustyRose', (.60,.36,.43)),
    ('D01_Flower_Lavender', (.52,.43,.63)),
):
    material = bpy.data.materials[name]
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color,1)
    material.diffuse_color = (*color,1)

root = bpy.data.collections.new('MOONROOM_DECOR_PHASE_02')
bpy.context.scene.collection.children.link(root)
ceiling = bpy.data.collections.new('CeilingGarden')
wall = bpy.data.collections.new('WallReliefAndVines')
root.children.link(ceiling)
root.children.link(wall)

def relink(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)

def mat(name, color, rough=.82, metal=0):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    result.diffuse_color = (*color, 1)
    return result

walnut = mat('D02_WalnutFrame', (.245, .115, .105), .68)
gilt = mat('D02_AgedChampagneGilt', (.61, .41, .22), .45, .52)
plum = mat('D02_IndigoVelvetGround', (.095, .075, .20), .94)
lavender = mat('D02_LavenderRelief', (.53, .41, .62), .86)
ivory = mat('D02_IvoryMoonRelief', (.73, .67, .62), .79)
rose = mat('D02_DustyRoseRelief', (.61, .34, .43), .86)

def mesh_box(name, location, size, material, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('soft carved edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(material)
    relink(obj, wall)
    obj['asset_id'] = name.split('__')[0]
    return obj

def relief_shape(name, x, y, z, points, material, depth=.018):
    vertices = [(x, y + py, z + pz) for py, pz in points]
    vertices += [(x + depth, y + py, z + pz) for py, pz in points]
    n = len(points)
    faces = [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    wall.objects.link(obj)
    mesh.materials.append(material)
    return obj

def star_points(radius, small, count=5):
    return [(math.sin(i*math.pi/count)*(radius if i%2==0 else small),
             math.cos(i*math.pi/count)*(radius if i%2==0 else small)) for i in range(count*2)]

def wall_frame(index, side, y, z, width, height):
    # x is the wall normal; the face is 0.2m inside the structural wall.
    x = -9.77 if side == 'left' else 9.77
    inward = 1 if side == 'left' else -1
    front = x + inward*.07
    aid = f'D02_WALL_RELIEF_{index:02}'
    mesh_box(f'{aid}__back', (x,y,z), (.11,height,width), walnut, .035)
    mesh_box(f'{aid}__pigment', (front,y,z), (.018,height-.16,width-.16), plum, .01)
    for dy in (-height/2+.045,height/2-.045):
        mesh_box(f'{aid}__rail_h_{dy:.2f}', (front+inward*.025,y+dy,z), (.065,.075,width), gilt, .012)
    for dz in (-width/2+.045,width/2-.045):
        mesh_box(f'{aid}__rail_v_{dz:.2f}', (front+inward*.025,y,z+dz), (.065,height-.10,.075), gilt, .012)
    # Raised, deliberately simple celestial relief; true depth, no flat poster.
    art_x = front + inward*.04
    radius = min(width,height)*.18
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1,
                                         location=(art_x,y+height*.15,z-width*.12))
    moon = bpy.context.object
    moon.name = f'{aid}__moon'
    moon.scale = (.032,radius,radius)
    moon.data.materials.append(ivory)
    relink(moon,wall)
    relief_shape(f'{aid}__star', art_x,y-height*.07,z+width*.19,
                 star_points(radius*.55,radius*.22), gilt)
    # Three gently scalloped cloud silhouettes provide parallax when walking
    # past. They are relief meshes, not a flat print or a single triangle.
    for layer, material in enumerate((lavender,rose,ivory)):
        base = -height*.37 + layer*.062
        outline = [(base-height*.09,-width*.40),
                   (base+height*.025,-width*.40),
                   (base+height*.06,-width*.31),
                   (base+height*.055,-width*.22),
                   (base+height*.095,-width*.11),
                   (base+height*.09,-width*.015),
                   (base+height*.06,width*.075),
                   (base+height*.10,width*.16),
                   (base+height*.085,width*.25),
                   (base+height*.04,width*.32),
                   (base+height*.035,width*.40),
                   (base-height*.09,width*.40)]
        relief_shape(f'{aid}__hills_{layer}', art_x+inward*(.012+layer*.012), y, z,
                     outline, material, .009)
    for small in range(4):
        sy = y + height*(.28 - small*.078)
        sz = z + width*(.20 + (small%2)*.095)
        relief_shape(f'{aid}__smallstar_{small}', art_x+inward*.05, sy, sz,
                     star_points(radius*(.115 if small%2 else .16),radius*.055), gilt, .007)

# The source hangs from X=3.25 beam, around Z=-3.45. All copies are transformed
# around that physical beam anchor, so their cords and stems still attach to wood.
anchor = Vector((3.25, 7.78, -3.45))
arrangements = [
    ('A', -6.50, 3.45, -.09, 1.04, 1.48, 0),  # dense near west loft
    ('B', -9.30, -3.45, .11, .83, 1.21, 3), # sparse above drums
    ('C', -6.50, 0.00, .07, .86, 1.18, 4), # fills loft beam, leaves moon aperture open
    ('D',  3.25, -3.45, 0.00, 1.08, 1.30, 0), # reviewed beam, longer drops
    ('E',  6.50, -3.45, -.12, 1.00, 1.34, 5), # right window corner
    ('F',  9.30, 0.00, .09, .78, 1.16, 2),  # asymmetric far-right wall
    ('G', -6.50, -3.45, -.05, 1.01, 1.36, 2), # leafy left arch / drum corner
]
for tag, target_x, target_z, turn, horizontal_scale, height_scale, thinning in arrangements:
    transform = (Matrix.Translation((target_x, 7.78, target_z))
                 @ Matrix.Rotation(turn, 4, 'Y')
                 @ Matrix.Diagonal((horizontal_scale,height_scale,horizontal_scale,1))
                 @ Matrix.Translation(-anchor))
    for obj in source_objects:
        # Some arrangements deliberately skip flowers, stars or the longest drop.
        if thinning and obj.name.startswith('D01_Flower') and int(obj.name[-1]) % thinning == 0:
            continue
        if thinning >= 4 and ('HangingStar' in obj.name or 'Star_Cord' in obj.name):
            continue
        if thinning >= 5 and ('LongHanging' in obj.name or 'LongVine' in obj.name):
            continue
        copy = obj.copy()
        copy.data = obj.data.copy()
        copy.name = f'D02_{tag}__{obj.name}'
        ceiling.objects.link(copy)
        copy.matrix_world = transform @ obj.matrix_world
        copy['asset_id'] = f'D02_CEILING_{tag}'

wall_frame(1, 'left', 3.78, -2.5, 1.23, 1.55)
wall_frame(2, 'left', 4.05, 1.1, .90, 1.13)
wall_frame(3, 'right', 3.72, 1.6, 1.12, 1.38)
wall_frame(4, 'right', 3.95, 5.12, .79, .99)

# Two climbing stems start at the existing side-wall crown and grow down around
# the relief panels. Leaf/flower meshes are copies of the approved small modules.
stem_mat = bpy.data.materials['D01_Stem_DeepSage']
leaf_sources = [obj for obj in source_objects if obj.name.startswith('D01_LeafCluster')]
flower_sources = [obj for obj in source_objects if obj.name.startswith('D01_Flower_')]
rng = random.Random(2046)
for side, start_z in ((-1,-3.8),(1,3.5)):
    x = side*9.68
    points = [(x,7.70,start_z),(x-side*.07,6.92,start_z+.20),
              (x-side*.04,6.15,start_z-.17),(x-side*.10,5.40,start_z+.12)]
    data = bpy.data.curves.new(f'D02_WallVine_{side}', 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = .012
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for node, point in zip(spline.bezier_points, points):
        node.co = point
        node.handle_left_type = 'AUTO'
        node.handle_right_type = 'AUTO'
    vine = bpy.data.objects.new(f'D02_WallVine_{side}', data)
    wall.objects.link(vine)
    data.materials.append(stem_mat)
    for i in range(7):
        y = 7.5-i*.31
        z = start_z + .13*math.sin(i*1.37) + .09*i
        sample = leaf_sources[(i*3 + (side+1)) % len(leaf_sources)]
        copy = sample.copy()
        copy.data = sample.data.copy()
        copy.name = f'D02_WallLeaf_{side}_{i}'
        wall.objects.link(copy)
        centre = sum((sample.matrix_world @ Vector(corner) for corner in sample.bound_box), Vector()) / 8
        copy.matrix_world = (Matrix.Translation((x-side*.08,y,z))
                             @ Matrix.Diagonal((.62,.62,.62,1))
                             @ Matrix.Translation(-centre) @ sample.matrix_world)
    for i in range(2):
        sample = flower_sources[i]
        copy = sample.copy()
        copy.data = sample.data.copy()
        copy.name = f'D02_WallFlower_{side}_{i}'
        wall.objects.link(copy)
        centre = sum((sample.matrix_world @ Vector(corner) for corner in sample.bound_box), Vector()) / 8
        copy.matrix_world = (Matrix.Translation((x-side*.11,6.2-i*.71,start_z+.14*i))
                             @ Matrix.Diagonal((.7,.7,.7,1))
                             @ Matrix.Translation(-centre) @ sample.matrix_world)

# Remove the imported sample from this independent source, then save fully
# editable arrangements/frames before making a material-batched runtime export.
for obj in source_objects:
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'source.blend'))

for obj in list(bpy.data.objects):
    if obj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')

objects = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.users_collection]
for obj in objects:
    # Converting all object transforms before joining prevents offset materials.
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

by_material = {}
for obj in objects:
    if obj.data.materials:
        by_material.setdefault(obj.data.materials[0].name, []).append(obj)
for name, batch in by_material.items():
    if len(batch) < 2:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in batch:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = batch[0]
    bpy.ops.object.join()
    batch[0].name = f'D02_BATCH__{name}'

bpy.ops.object.select_all(action='DESELECT')
export_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.users_collection]
for obj in export_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = export_objects[0]
GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True, export_yup=True)
print('D02_EXPORTED', len(export_objects), 'meshes', sum(len(o.data.polygons) for o in export_objects), 'faces')
