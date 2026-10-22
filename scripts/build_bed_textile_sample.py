"""Create a non-integrated Moon Nest textile study from the user-supplied GLB.

Run: blender -b -t 4 --python scripts/build_bed_textile_sample.py
"""
import bpy
import bmesh
import math
import random
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/third-party/sketchfab-messy-bed-2/original.glb"
OUT = ROOT / "assets-source/lounge/moon-nest-textile-sample.blend"
GLB = ROOT / "assets-source/lounge/moon-nest-textile-sample.glb"
PNG = ROOT / "screenshots/moon-nest-textile-sample-blender.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bed_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

bed_collection = bpy.data.collections.new("BED_SOURCE_MessyBed2_CC_BY")
bpy.context.scene.collection.children.link(bed_collection)
for o in bed_meshes:
    for c in list(o.users_collection): c.objects.unlink(o)
    bed_collection.objects.link(o)

textile_collection = bpy.data.collections.new("TEXTILES_MoonNest_Study")
bpy.context.scene.collection.children.link(textile_collection)

def woven_image(name, rgb, seed, knit=False):
    """Pack a small color and normal fabric map so glTF keeps the close-up detail."""
    random.seed(seed)
    n = 256
    img = bpy.data.images.new(name + "_color", width=n, height=n, alpha=True)
    normal = bpy.data.images.new(name + "_normal", width=n, height=n, alpha=True)
    pixels = []
    normals = []
    for y in range(n):
        for x in range(n):
            u = x / n
            v = y / n
            thread = (math.sin(u * math.tau * (90 if knit else 155))
                      + math.sin(v * math.tau * (90 if knit else 155))) * 0.012
            mottling = random.uniform(-0.014, 0.014)
            shade = 1 + thread + mottling
            pixels.extend((min(1, rgb[0] * shade), min(1, rgb[1] * shade), min(1, rgb[2] * shade), 1))
            nx = math.cos(u * math.tau * (90 if knit else 155)) * 0.07
            ny = math.cos(v * math.tau * (90 if knit else 155)) * 0.07
            normals.extend((0.5 + nx, 0.5 + ny, 1, 1))
    img.pixels[:] = pixels
    normal.pixels[:] = normals
    img.pack()
    normal.pack()
    return img, normal

def fabric(name, color, seed, knit=False, fleece_normal=None, fleece_diffuse=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Roughness"].default_value = 0.94 if knit else 0.86
    p.inputs["Sheen Weight"].default_value = 0.28
    p.inputs["Sheen Roughness"].default_value = 0.8
    img, normal = woven_image(name, color, seed, knit)
    if fleece_diffuse:
        source = bpy.data.images.load(str(fleece_diffuse), check_existing=True)
        source_pixels = np.asarray(source.pixels[:], dtype=np.float32).reshape((-1, 4))
        brightness = source_pixels[:, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        shade = np.clip(0.65 + brightness * 0.63, 0.5, 1.2)
        colored = np.empty_like(source_pixels)
        colored[:, :3] = np.clip(shade[:, None] * np.asarray(color), 0, 1)
        colored[:, 3] = 1
        img = bpy.data.images.new(name + "_tinted_fleece", width=source.size[0], height=source.size[1], alpha=True)
        img.pixels[:] = colored.ravel()
        img.pack()
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt = m.node_tree.nodes.new("ShaderNodeTexImage")
    nt.image = bpy.data.images.load(str(fleece_normal), check_existing=True) if fleece_normal else normal
    nt.image.colorspace_settings.name = "Non-Color"
    nm = m.node_tree.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 0.72 if fleece_normal else (0.38 if knit else 0.20)
    m.node_tree.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    m.node_tree.links.new(nt.outputs["Color"], nm.inputs["Color"])
    m.node_tree.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    return m

ivory = fabric("Ivory brushed cotton", (0.83, 0.77, 0.71), 4)
cream = fabric("Cream duvet", (0.90, 0.81, 0.77), 5)
blush = fabric("Washed blush pillow", (0.75, 0.55, 0.59), 6)
fleece_map = ROOT / "assets-source/third-party/polyhaven-curly-teddy-natural/curly_teddy_natural_nor_gl_1k.jpg"
fleece_diffuse = ROOT / "assets-source/third-party/polyhaven-curly-teddy-natural/curly_teddy_natural_diff_1k.jpg"
lavender = fabric("Lavender fleece throw", (0.55, 0.43, 0.61), 7, True, fleece_map, fleece_diffuse)
pink_fleece = fabric("Dusty pink plush cover", (0.81, 0.60, 0.65), 12, True, fleece_map, fleece_diffuse)
plum = fabric("Muted mauve pillow", (0.43, 0.30, 0.43), 8)

for o in bed_meshes:
    name = o.name.lower()
    if "pillows" in name: mat = ivory
    elif "sheet" in name: mat = ivory
    elif "comforter" in name: mat = blush
    elif "cover" in name: mat = pink_fleece
    else: continue
    o.data.materials.clear()
    o.data.materials.append(mat)
    if "sheet" in name:
        # The supplied bed has loose mattress-sheet tabs protruding behind its
        # former wood backboard. Tuck only those low rear vertices beneath the
        # new padded wrap; retain the rest of the sculpted sheet intact.
        inverse = o.matrix_world.inverted()
        for vertex in o.data.vertices:
            world = o.matrix_world @ vertex.co
            if world.y > 0.80 and world.z < 0.65:
                world.y = 0.79
                vertex.co = inverse @ world
    if "comforter" in name or "cover" in name:
        solid = o.modifiers.new("Soft duvet edge thickness", "SOLIDIFY")
        solid.thickness = 0.055 if "cover" in name else 0.022
        solid.offset = -0.65

# This variant has no visible headboard, night shelves, drawers, or wood shell.
# The untouched third-party original remains preserved as original.glb.
kept_meshes = []
for o in bed_meshes:
    if "frame" in o.name.lower() or "shelves" in o.name.lower():
        bpy.data.objects.remove(o, do_unlink=True)
    else:
        kept_meshes.append(o)
bed_meshes = kept_meshes

# A single quilted fabric skirt hides the former drawer zone on all sides.
# It is a continuous rounded, unevenly hanging cloth shell, not rigid boxes.
segments, rings = 96, 16
skirt_verts, skirt_faces = [], []
for j in range(rings + 1):
    v = j / rings
    for i in range(segments):
        theta = math.tau * i / segments
        ct, st = math.cos(theta), math.sin(theta)
        padded_bulge = 0.062 * math.sin(math.pi * v)
        x = math.copysign(abs(ct) ** 0.58, ct) * (0.95 + 0.075 * v + padded_bulge)
        rear_depth = 0.20 * max(0, st) ** 3 * (1 - v) ** 2
        y = math.copysign(abs(st) ** 0.58, st) * (0.91 + 0.085 * v + padded_bulge + rear_depth)
        fold = (0.038 * math.sin(theta * 11 + v * 1.8)
                + 0.019 * math.sin(theta * 23 - v * 2.1)) * (0.18 + 0.82 * v)
        x += ct * fold
        y += st * fold
        rear_wrap = 0.18 * max(0, st) ** 3 * (1 - v) ** 2
        z = 0.53 - 0.49 * v + rear_wrap + 0.035 * v * math.sin(theta * 13 + 0.4)
        skirt_verts.append((x, y, z))
for j in range(rings):
    for i in range(segments):
        a = j * segments + i
        b = j * segments + (i + 1) % segments
        skirt_faces.append((a, b, b + segments, a + segments))
skirt_mesh = bpy.data.meshes.new("Plush bed-skirt mesh")
skirt_mesh.from_pydata(skirt_verts, [], skirt_faces)
skirt_mesh.update()
skirt_uv = skirt_mesh.uv_layers.new(name="Fleece UV")
for poly in skirt_mesh.polygons:
    for loop_index in poly.loop_indices:
        idx = skirt_mesh.loops[loop_index].vertex_index
        skirt_uv.data[loop_index].uv = ((idx % segments) / segments * 5,
                                       (idx // segments) / rings * 2)
skirt = bpy.data.objects.new("Dusty pink plush / conceals former drawers", skirt_mesh)
textile_collection.objects.link(skirt)
skirt.data.materials.append(pink_fleece)
for poly in skirt_mesh.polygons: poly.use_smooth = True
skirt_solid = skirt.modifiers.new("Padded soft hem", "SOLIDIFY")
skirt_solid.thickness = 0.06

# One continuously draped grid placed on the existing bedding via ray casts.
# The top follows the sculpted duvet; only its foot and left corner fall over.
bed_surfaces = []
depsgraph = bpy.context.evaluated_depsgraph_get()
for o in bed_meshes:
    if any(k in o.name.lower() for k in ("cover", "comforter", "sheet")):
        bed_surfaces.append((o, BVHTree.FromObject(o, depsgraph)))

def bedding_height(x, y):
    heights = []
    for obj, bvh in bed_surfaces:
        local_origin = obj.matrix_world.inverted() @ Vector((x, y, 2.0))
        local_dir = (obj.matrix_world.inverted().to_3x3() @ Vector((0, 0, -1))).normalized()
        hit, _, _, _ = bvh.ray_cast(local_origin, local_dir, 5)
        if hit is not None:
            heights.append((obj.matrix_world @ hit).z)
    return max(heights) if heights else 0.56

verts = []
faces = []
nx, ny = 64, 36
for j in range(ny + 1):
    v = j / ny
    y = -0.43 - 0.81 * v
    for i in range(nx + 1):
        u = i / nx
        x = -0.96 + 1.84 * u + 0.026 * math.sin(v * math.tau * 1.3)
        edge = math.sin(math.pi * u) ** 0.5
        fold = (0.012 * math.sin(7 * math.pi * u + 0.7 * v)
                + 0.007 * math.sin(15 * math.pi * u + 2.6 * v)) * edge
        bunch = 0.028 * math.exp(-((v - 0.20) / 0.12) ** 2)
        z = bedding_height(x, max(y, -0.98)) + 0.013 + fold + bunch
        if y < -1.00:
            t = min(1, (-1.00 - y) / 0.24)
            z -= 0.21 * t ** 1.4
            y = -1.00 - 0.07 * math.sin(t * math.pi * 0.5)
        if x < -0.89:
            z -= 0.08 * min(1, (-0.89 - x) / 0.07)
        verts.append((x, y, z))
for j in range(ny):
    for i in range(nx):
        a = j * (nx + 1) + i
        faces.append((a, a + 1, a + nx + 2, a + nx + 1))
mesh = bpy.data.meshes.new("Throw folded cloth mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
uv = mesh.uv_layers.new(name="Woven UV")
for poly in mesh.polygons:
    for loop_index in poly.loop_indices:
        vertex_index = mesh.loops[loop_index].vertex_index
        uv.data[loop_index].uv = ((vertex_index % (nx + 1)) / nx * 2,
                                  (vertex_index // (nx + 1)) / ny * 2)
throw = bpy.data.objects.new("Oversized lavender throw / draped", mesh)
textile_collection.objects.link(throw)
throw.data.materials.append(lavender)
for p in throw.data.polygons: p.use_smooth = True
solid = throw.modifiers.new("Real fabric thickness", "SOLIDIFY")
solid.thickness = 0.045
bevel = throw.modifiers.new("Soft woven edge", "BEVEL")
bevel.width = 0.008
bevel.segments = 2

# The source bed already has two naturally crumpled pillow islands. Extract
# those sculpted forms as separate accent copies; unlike the earlier upright
# throw-pillow source, they genuinely sit flat on bedding.
source_pillow = next(o for o in bed_meshes if "pillows" in o.name.lower())
bm = bmesh.new()
bm.from_mesh(source_pillow.data)
unseen = set(bm.verts)
components = []
while unseen:
    seed = unseen.pop()
    queue = [seed]
    comp = {seed}
    while queue:
        v = queue.pop()
        for edge in v.link_edges:
            neighbor = edge.other_vert(v)
            if neighbor in unseen:
                unseen.remove(neighbor)
                comp.add(neighbor)
                queue.append(neighbor)
    if len(comp) > 100:
        components.append(comp)
components.sort(key=lambda comp: sum(v.co.x for v in comp) / len(comp))
for idx, comp in enumerate(components[:2]):
    vertex_list = list(comp)
    world = [source_pillow.matrix_world @ v.co for v in vertex_list]
    center = Vector((sum(v.x for v in world) / len(world),
                     sum(v.y for v in world) / len(world),
                     sum(v.z for v in world) / len(world)))
    index = {v: i for i, v in enumerate(vertex_list)}
    faces_local = [tuple(index[v] for v in f.verts) for f in bm.faces if all(v in comp for v in f.verts)]
    mesh = bpy.data.meshes.new(f"Accent pillow sculpt {idx+1}")
    mesh.from_pydata([tuple(v - center) for v in world], [], faces_local)
    mesh.update()
    accent = bpy.data.objects.new(f"Accent pillow {idx+1} / source sculpt", mesh)
    textile_collection.objects.link(accent)
    accent.data.materials.append(plum if idx == 0 else blush)
    accent.location = (-0.51 if idx == 0 else 0.49, 0.36 if idx == 0 else 0.22, 0.64)
    accent.rotation_euler.z = -0.26 if idx == 0 else 0.35
    accent.scale = (0.72, 0.72, 0.55)
    for poly in mesh.polygons: poly.use_smooth = True
bm.free()

# Preview objects are separated from the exported asset collections.
preview = bpy.data.collections.new("PREVIEW_ONLY")
bpy.context.scene.collection.children.link(preview)
ground_mat = bpy.data.materials.new("Preview warm floor")
ground_mat.diffuse_color = (0.34, 0.28, 0.32, 1)
ground_mat.use_nodes = True
ground_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.34, 0.28, 0.32, 1)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.015))
floor = bpy.context.object
floor.name = "Preview floor"
for c in list(floor.users_collection): c.objects.unlink(floor)
preview.objects.link(floor)
floor.data.materials.append(ground_mat)

def softbox(name, loc, energy, size, color):
    d = bpy.data.lights.new(name, "AREA")
    d.energy, d.size, d.color = energy, size, color
    o = bpy.data.objects.new(name, d)
    preview.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.55)) - o.location).to_track_quat("-Z", "Y").to_euler()

softbox("Warm window softbox", (3, -4, 5), 850, 5, (1, 0.89, 0.81))
softbox("Cool fill", (-3, 2, 3), 550, 4, (0.8, 0.84, 1))
camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
preview.objects.link(camera)
camera.location = (3.7, -4.2, 2.8)
camera.rotation_euler = (Vector((0, -0.1, 0.55)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.5
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 24
bpy.context.scene.render.resolution_x = 1100
bpy.context.scene.render.resolution_y = 770
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.filepath = str(PNG)
bpy.context.scene.world.color = (0.55, 0.55, 0.55)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))

bpy.ops.object.select_all(action="DESELECT")
for o in list(bed_collection.objects) + list(textile_collection.objects): o.select_set(True)
bpy.context.view_layer.objects.active = bed_meshes[0]
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True, export_apply=True)
bpy.ops.render.render(write_still=True)
print("SAMPLE_OUTPUT", str(OUT), str(GLB), str(PNG))
