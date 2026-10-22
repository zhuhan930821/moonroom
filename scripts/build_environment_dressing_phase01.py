"""Build one ceiling-garden review asset; does not modify the room GLB.

Run: blender -b -P scripts/build_environment_dressing_phase01.py
Coordinates are the existing Moonroom/architecture X,Y-up,Z coordinates.
"""
from pathlib import Path
import math
import random

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/decor/phase-01"
PUBLIC = ROOT / "public/assets/models/decor"
for directory in (SOURCE, PUBLIC):
    directory.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

parent = bpy.data.collections.new("MOONROOM_DECOR_PHASE_01")
bpy.context.scene.collection.children.link(parent)
groups = {}
for label in ("CeilingVines", "HangingFlowers", "WindowFlowers", "HangingOrnaments", "DeskDecor", "ShelfDecor"):
    group = bpy.data.collections.new(label)
    parent.children.link(group)
    groups[label] = group

def material(name, color, rough=.85, metal=0, emit=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metal
    if emit:
        shader.inputs["Emission Color"].default_value = (*emit[0], 1)
        shader.inputs["Emission Strength"].default_value = emit[1]
    return mat

stem_dark = material("D01_Stem_DeepSage", (.105, .175, .13), .89)
stem_light = material("D01_Stem_MossSage", (.19, .265, .17), .88)
leaf_mats = [material(name, rgb, .84) for name, rgb in (
    ("D01_Leaf_SageShadow", (.25,.38,.27)),
    ("D01_Leaf_DustyOlive", (.38,.46,.29)),
    ("D01_Leaf_MoonlitSage", (.44,.53,.42)),
)]
flower_mats = [material(name, rgb, .89) for name, rgb in (
    ("D01_Flower_Ivory", (.92,.84,.76)),
    ("D01_Flower_DustyRose", (.78,.50,.57)),
    ("D01_Flower_Lavender", (.66,.57,.79)),
)]
gold = material("D01_AgedChampagneGold", (.72,.51,.28), .48, .37)
bulb = material("D01_WarmFairyBulb", (.91,.64,.38), .46, 0, ((1.0,.62,.28), .7))

def link_object(obj, group, asset_id):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    groups[group].objects.link(obj)
    obj["asset_id"] = asset_id
    return obj

def curve(name, points, radius, mat, group, asset_id):
    data = bpy.data.curves.new(name + "_Curve", "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for node, point in zip(spline.bezier_points, points):
        node.co = point
        node.handle_left_type = "AUTO"
        node.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    groups[group].objects.link(obj)
    data.materials.append(mat)
    obj["asset_id"] = asset_id
    return obj

def add_mesh(name, vertices, faces, mat, group, asset_id):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    groups[group].objects.link(obj)
    mesh.materials.append(mat)
    obj["asset_id"] = asset_id
    return obj

def leaf_geometry(centers, length, width, seed):
    rng = random.Random(seed)
    verts, faces = [], []
    for center, direction in centers:
        base = Vector(center)
        forward = Vector(direction).normalized()
        side = forward.cross(Vector((0,1,0))).normalized()
        if side.length < .1:
            side = Vector((1,0,0))
        ridge = forward.cross(side).normalized()
        l = length * rng.uniform(.81, 1.19)
        w = width * rng.uniform(.76, 1.20)
        start = len(verts)
        for step in range(6):
            t = step/5
            bend = ridge * (math.sin(t*math.pi)*.018 + t*t*rng.uniform(-.014,.014))
            mid = base + forward*l*t + bend
            half = w * max(0, math.sin(math.pi*t))**.78
            for across in (-1, 0, 1):
                point = mid + side*half*across + ridge*(.010 if across == 0 else -.005)
                verts.append(tuple(point))
        for step in range(5):
            row = start + step*3
            next_row = row+3
            for across in (0,1):
                faces.extend(((row+across, next_row+across, next_row+across+1),
                              (row+across, next_row+across+1, row+across+1)))
    return verts, faces

def leaf_cluster(name, center, variant, seed):
    rng = random.Random(seed)
    count = (6, 7, 9)[variant]
    centers = []
    for i in range(count):
        angle = i*2.399 + variant*.36 + rng.uniform(-.19,.19)
        outward = Vector((math.cos(angle), -.24-rng.random()*.35, math.sin(angle)))
        origin = Vector(center) + Vector((rng.uniform(-.045,.045), rng.uniform(-.065,.035), rng.uniform(-.045,.045)))
        centers.append((origin, outward))
    size = ((.145,.048), (.22,.042), (.18,.067))[variant]
    verts, faces = leaf_geometry(centers, *size, seed+100)
    return add_mesh(name, verts, faces, leaf_mats[variant], "CeilingVines", f"D01_LEAF_CLUSTER_{variant+1}")

def flower_cluster(name, center, kind, seed):
    rng = random.Random(seed)
    verts, faces = [], []
    flowers = (3, 3, 4)[kind]
    for flower in range(flowers):
        cx = center[0] + (flower-(flowers-1)/2)*.11 + rng.uniform(-.025,.025)
        cy = center[1] - rng.uniform(0,.13)
        cz = center[2] + rng.uniform(-.08,.08)
        scale = rng.uniform(.85,1.17)
        for petal in range(5):
            angle = 2*math.pi*petal/5 + rng.uniform(-.07,.07)
            dx, dz = math.cos(angle), math.sin(angle)
            side_x, side_z = -dz, dx
            r = (.082 if kind != 2 else .091)*scale
            w = .050*scale
            idx = len(verts)
            for step in range(5):
                t = step/4
                breadth = w*math.sin(math.pi*t)**.75
                droop = -.034*t*t - (.035*t if kind==2 else 0)
                for across in (-1,0,1):
                    verts.append((cx+dx*r*t+side_x*breadth*across,
                                  cy+droop+(.013 if across==0 else 0),
                                  cz+dz*r*t+side_z*breadth*across))
            for step in range(4):
                for across in (0,1):
                    a = idx+step*3+across
                    faces.extend(((a,a+3,a+4),(a,a+4,a+1)))
    return add_mesh(name, verts, faces, flower_mats[kind], "HangingFlowers", f"D01_FLOWER_CLUSTER_{kind+1}")

# The arrangement is attached to the existing X=3.25 beam at Z=-3.45.
# Local study geometry is authored around X=6.5, then placed below.
curve("D01_Vine_ShortClimber", [
    (6.42,7.91,-.82),(6.60,7.75,-.55),(6.40,7.60,-.28),(6.57,7.88,.06)],
    .016, stem_dark, "CeilingVines", "D01_VINE_SHORT")
curve("D01_Vine_MediumCurved", [
    (6.52,7.92,-.10),(6.68,7.68,.28),(6.34,7.52,.53),(6.10,7.20,.78),(6.04,6.96,.95)],
    .013, stem_light, "CeilingVines", "D01_VINE_MEDIUM")
curve("D01_Vine_LongHanging", [
    (6.54,7.90,1.32),(6.39,7.58,1.43),(6.56,7.04,1.48),(6.41,6.19,1.58),(6.49,5.35,1.69)],
    .014, stem_dark, "CeilingVines", "D01_VINE_LONG")
for i, (start,end) in enumerate((((6.48,7.56,1.48),(6.15,7.12,1.70)),
                                  ((6.48,6.35,1.50),(6.80,5.92,1.73)))):
    curve(f"D01_LongVine_Offshoot_{i}", [start, end], .007, stem_light, "CeilingVines", "D01_VINE_LONG_BRANCH")

for i, point in enumerate(((6.47,7.64,-.55),(6.51,7.58,-.19),(6.43,7.57,.36),
                           (6.24,7.34,.66),(6.09,7.12,.84),(6.47,7.38,1.47),
                           (6.51,6.84,1.52),(6.42,6.29,1.63),(6.17,7.08,1.67),
                           (6.49,5.91,1.61),(6.43,5.54,1.68),(6.74,5.88,1.73))):
    leaf_cluster(f"D01_LeafCluster_{i:02}_{i%3}", point, i%3, 330+i*17)

flower_cluster("D01_Flower_Ivory_01", (6.16,7.12,.91), 0, 19)
flower_cluster("D01_Flower_Rose_01", (6.47,5.96,1.57), 1, 24)
flower_cluster("D01_Flower_Lavender_01", (6.49,5.39,1.67), 2, 29)

# A single star and a short light string, both anchored to the same beam.
curve("D01_Star_Cord", [(6.20,7.62,.09),(6.20,7.02,.10)], .004, gold,
      "HangingOrnaments", "D01_STAR_CORD")
star_verts, star_faces = [], []
sx, sy, sz = 6.20, 6.88, .10
for depth in (-.015,.015):
    for i in range(10):
        angle = math.pi/2 + i*math.pi/5
        radius = .16 if i%2 == 0 else .067
        star_verts.append((sx+math.cos(angle)*radius, sy+math.sin(angle)*radius, sz+depth))
star_verts.extend(((sx,sy,sz-.015),(sx,sy,sz+.015)))
for i in range(10):
    star_faces.append((20,i,(i+1)%10))
    star_faces.append((21,10+(i+1)%10,10+i))
    star_faces.extend(((i,(i+1)%10,10+(i+1)%10),(i,10+(i+1)%10,10+i)))
add_mesh("D01_HangingStar_Brass", star_verts, star_faces, gold, "HangingOrnaments", "D01_HANGING_STAR")

curve("D01_FairyWire", [(6.59,7.62,-.88),(6.71,7.48,-.33),(6.60,7.56,.15),
                         (6.69,7.46,.75),(6.60,7.58,1.40),(6.62,7.60,1.87)],
      .003, gold, "HangingOrnaments", "D01_FAIRY_STRING")
for i in range(8):
    z = -.72 + i*.34
    y = 7.49 + .035*math.sin(i*1.6)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=.026,
                                         location=(6.68,y,z))
    light = bpy.context.object
    light.name = f"D01_FairyBulb_{i:02}"
    light.data.materials.append(bulb)
    link_object(light, "HangingOrnaments", "D01_FAIRY_BULB")

# Shift the authored modular study along the same beam to the verified
# near-window crossbeam. This puts it inside the existing hero camera frustum.
for group in groups.values():
    for obj in group.objects:
        obj.location.x -= 3.25
        obj.location.z -= 3.45

# Save editable source, then export only the one reviewed arrangement.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "moonroom-decor-phase01-ceiling-sample.blend"))
objects = [obj for group in groups.values() for obj in group.objects]
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(PUBLIC / "moonroom-decor-phase01-ceiling-sample.glb"),
                          export_format="GLB", use_selection=True, export_yup=True)
print("D01_COMPLETE", len(objects), "objects")
