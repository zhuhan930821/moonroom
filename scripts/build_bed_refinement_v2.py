"""Moon Nest V2 geometry/material review only; never replaces the game asset.

Run: blender -b -t 4 --python scripts/build_bed_refinement_v2.py
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/lounge/moon-nest-textile-sample.blend"
OUT = ROOT / "assets-source/lounge/moon-nest-refinement-v2.blend"
SHOTS = ROOT / "screenshots/bed-refinement-v2"
SHOTS.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
textiles = bpy.data.collections.get("TEXTILES_MoonNest_Study")
assert textiles, "Missing approved-sized Moon Nest source collection"

# Remove only the old crumpled duvet/throw study. Preserve the mattress,
# original pillows, accents, pink upholstered wrap and source GLB on disk.
for obj in list(bpy.data.objects):
    if any(key in obj.name for key in (
        "Nordli_Cover_Low", "Nordli_Comforter_Low", "Oversized lavender throw"
    )):
        bpy.data.objects.remove(obj, do_unlink=True)

def saturate(v):
    return min(1.0, max(0.0, v))

def smoothstep(v):
    v = saturate(v)
    return v * v * (3 - 2 * v)

def duvet_height(x, y):
    """A padded down volume, with three broad lobes and gravity at its hem."""
    u = (x + 0.96) / 1.92
    v = (y + 1.16) / 1.65
    middle = max(0, math.sin(math.pi * u) * math.sin(math.pi * v))
    loft = 0.165 * middle ** 0.65
    puffs = (
        0.068 * math.exp(-((u - 0.27) / 0.25) ** 2 - ((v - 0.43) / 0.31) ** 2)
        + 0.075 * math.exp(-((u - 0.73) / 0.27) ** 2 - ((v - 0.48) / 0.30) ** 2)
        + 0.050 * math.exp(-((u - 0.48) / 0.31) ** 2 - ((v - 0.73) / 0.22) ** 2)
    )
    across = 0.026 * math.cos(2.5 * math.pi * u + 0.35) * math.sin(math.pi * v) ** 2
    lengthwise = 0.018 * math.cos(2 * math.pi * v - 0.2) * math.sin(math.pi * u) ** 2
    valleys = (
        0.052 * math.exp(-((u - 0.52) / 0.105) ** 2) * math.sin(math.pi * v) ** 2
        + 0.023 * math.exp(-((v - 0.56) / 0.09) ** 2) * math.sin(math.pi * u) ** 2
    )
    side_drape = 0.095 * smoothstep((abs(x) - 0.79) / 0.17)
    foot_drape = 0.15 * smoothstep((-0.89 - y) / 0.27)
    return 0.605 + loft + puffs + across + lengthwise - valleys - side_drape - foot_drape

def closed_fabric(name, n_x, n_y, extent, upper, thickness, material, bevel_width):
    """Closed, UV-mapped quilt, with padded bottom and rounded physical edge."""
    xmin, xmax, ymin, ymax = extent
    top = []
    bottom = []
    for j in range(n_y + 1):
        v = j / n_y
        y = ymin + (ymax - ymin) * v
        for i in range(n_x + 1):
            u = i / n_x
            x = xmin + (xmax - xmin) * u
            # Rounded plan corners without jagged cuts in the silhouette.
            corner = smoothstep((abs(x) - (xmax * 0.85)) / (xmax * 0.15))
            x -= math.copysign(0.025 * corner * abs(2 * v - 1), x)
            z = upper(x, y, u, v)
            top.append((x, y, z))
            bottom.append((x, y, z - thickness(x, y, u, v)))
    layer_count = len(top)
    verts = top + bottom
    faces = []
    for j in range(n_y):
        for i in range(n_x):
            a = j * (n_x + 1) + i
            faces.append((a, a + 1, a + n_x + 2, a + n_x + 1))
            b = a + layer_count
            faces.append((b + n_x + 1, b + n_x + 2, b + 1, b))
    perimeter = []
    for i in range(n_x): perimeter.append(i)
    for j in range(n_y): perimeter.append(j * (n_x + 1) + n_x)
    for i in range(n_x, 0, -1): perimeter.append(n_y * (n_x + 1) + i)
    for j in range(n_y, 0, -1): perimeter.append(j * (n_x + 1))
    for k, a in enumerate(perimeter):
        b = perimeter[(k + 1) % len(perimeter)]
        faces.append((b, a, a + layer_count, b + layer_count))

    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="Fabric UV")
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            idx = mesh.loops[loop_index].vertex_index % layer_count
            uv_layer.data[loop_index].uv = (
                idx % (n_x + 1) / n_x * 3,
                idx // (n_x + 1) / n_y * 3,
            )
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    textiles.objects.link(obj)
    mesh.materials.append(material)
    bevel = obj.modifiers.new("Soft rounded fabric edge", "BEVEL")
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = 0.70
    bevel.width = bevel_width
    bevel.segments = 3
    normal = obj.modifiers.new("Weighted soft normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = False
    return obj

duvet_mat = bpy.data.materials["Washed blush pillow"].copy()
duvet_mat.name = "V2 Pink duvet / brushed cotton"
duvet_principled = duvet_mat.node_tree.nodes.get("Principled BSDF")
duvet_principled.inputs["Roughness"].default_value = 0.92
duvet_principled.inputs["Sheen Weight"].default_value = 0.22

throw_mat = bpy.data.materials["Lavender fleece throw"].copy()
throw_mat.name = "V2 Lavender throw / short-pile fleece"
throw_principled = throw_mat.node_tree.nodes.get("Principled BSDF")
throw_principled.inputs["Roughness"].default_value = 0.96
throw_principled.inputs["Sheen Weight"].default_value = 0.34

duvet = closed_fabric(
    "V2_DUVET_PinkDown", 54, 52, (-0.96, 0.96, -1.16, 0.49),
    lambda x, y, u, v: duvet_height(x, y),
    lambda x, y, u, v: 0.145 + 0.052 * math.sin(math.pi * u) * math.sin(math.pi * v),
    duvet_mat, 0.042,
)

def throw_height(x, y, u, v):
    # The blanket follows the duvet's large shape; only two low-amplitude
    # gravity folds cross it, with a softly rolled front lip.
    major = (
        0.044 * math.exp(-((u - 0.27) / 0.13) ** 2)
        + 0.034 * math.exp(-((u - 0.70) / 0.16) ** 2)
    ) * math.sin(math.pi * v)
    bunch = 0.021 * math.exp(-((u - 0.72) / 0.22) ** 2 - ((v - 0.43) / 0.30) ** 2)
    rolled_front = 0.014 * math.exp(-(v / 0.065) ** 2)
    return duvet_height(x, y) + 0.038 + major + bunch + rolled_front

throw = closed_fabric(
    "V2_THROW_LavenderFleece", 48, 24, (-0.87, 0.87, -1.11, -0.55),
    throw_height,
    lambda x, y, u, v: 0.036 + 0.009 * math.sin(math.pi * u) * math.sin(math.pi * v),
    throw_mat, 0.024,
)

# Keep the original pillow meshes and materials. The two small accent pillows
# need the preview's visible placement above the new duvet, without remeshing.
for obj in bpy.data.objects:
    if obj.type == "MESH" and "Accent pillow" in obj.name:
        obj.location.y += 0.15
        obj.location.z += 0.16

def diagnose_mesh(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    non_manifold = sum(not e.is_manifold for e in bm.edges)
    degenerate = sum(f.calc_area() < 1e-9 for f in bm.faces)
    result = (obj.name, len(bm.verts), len(bm.faces), non_manifold, degenerate)
    bm.free()
    return result

for obj in (duvet, throw):
    print("V2_GEOMETRY", diagnose_mesh(obj))

# Temporary review studio, never exported to the game.
preview = bpy.data.collections.get("PREVIEW_ONLY")
for obj in list(preview.objects):
    if obj.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(obj, do_unlink=True)

def softbox(name, location, power, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.size, data.color = power, size, color
    light = bpy.data.objects.new(name, data)
    preview.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 0.55)) - light.location).to_track_quat("-Z", "Y").to_euler()

softbox("V2 neutral key", (2.6, -3.5, 4.4), 720, 2.4, (1, 0.94, 0.87))
softbox("V2 soft fill", (-3.0, 1.8, 3.4), 225, 4, (0.87, 0.9, 1))
softbox("V2 rim", (0, 3.1, 3.2), 160, 3, (1, 0.81, 0.74))

cam_data = bpy.data.cameras.new("V2 review camera")
camera = bpy.data.objects.new("V2 review camera", cam_data)
preview.objects.link(camera)
cam_data.type = "ORTHO"
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 1180
scene.render.resolution_y = 820
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = -0.25
scene.world.use_nodes = True
world_background = scene.world.node_tree.nodes.get("Background")
world_background.inputs["Color"].default_value = (0.32, 0.32, 0.35, 1)
world_background.inputs["Strength"].default_value = 0.35

def render(name, location, target, scale, clay=False):
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.ortho_scale = scale
    scene.render.filepath = str(SHOTS / (name + ".png"))
    scene.view_layers[0].material_override = clay_mat if clay else None
    bpy.ops.render.render(write_still=True)

clay_mat = bpy.data.materials.new("Temporary neutral clay")
clay_mat.diffuse_color = (0.73, 0.70, 0.68, 1)
clay_mat.use_nodes = True
clay_p = clay_mat.node_tree.nodes.get("Principled BSDF")
clay_p.inputs["Base Color"].default_value = (0.73, 0.70, 0.68, 1)
clay_p.inputs["Roughness"].default_value = 0.78

render("02-full-45-pbr", (3.25, -3.8, 2.55), (0, -0.12, 0.46), 3.9)
scene.view_layers[0].material_override = None
scene.render.filepath = str(SHOTS / "02-full-45-pbr.png")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
print("V2_PREVIEW", str(OUT), str(SHOTS))
