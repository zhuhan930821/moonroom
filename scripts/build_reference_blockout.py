"""Independent, editable Moonroom whole-room white model.

The reference images are concept art, not orthographic drawings. This scene
tests their broad spatial composition without changing the live room assets.
Run: blender -b -t 4 --python scripts/build_reference_blockout.py
"""
import bpy
import math
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/blockout/moonroom-reference-blockout.blend"
GLB = ROOT / "public/assets/models/review/moonroom-reference-blockout.glb"
SHOTS = ROOT / "screenshots/white-model"
for path in (SOURCE.parent, GLB.parent, SHOTS):
    path.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)

def group(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result

zones = {name: group(name) for name in (
    "BLOCKOUT_01_SHELL", "BLOCKOUT_02_WINDOW_WALL", "BLOCKOUT_03_MUSIC",
    "BLOCKOUT_04_WORK", "BLOCKOUT_05_LOUNGE", "BLOCKOUT_06_SPATIAL_CUES",
    "PREVIEW_ONLY",
)}

def mat(name, value):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (value, value, value, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (value, value, value, 1)
    shader.inputs["Roughness"].default_value = 0.94
    return material

ivory = mat("Blockout ivory / architecture", .83)
white = mat("Blockout white / furniture", .94)
mid = mat("Blockout warm gray / secondary volume", .69)
dark = mat("Blockout gray / negative space", .48)

def link(obj, zone, asset_id, material):
    obj.name = asset_id
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    zones[zone].objects.link(obj)
    obj["asset_id"] = asset_id
    obj.data.materials.append(material)
    return obj

def cube(name, center, size, zone, material=white, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Readable soft silhouette", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal = obj.modifiers.new("Weighted normal", "WEIGHTED_NORMAL")
    return link(obj, zone, name, material)

def cylinder(name, center, radius, depth, zone, material=white, vertical=True):
    rotation = (math.pi / 2, 0, 0) if vertical else (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth,
                                        end_fill_type="NGON", location=center, rotation=rotation)
    return link(bpy.context.object, zone, name, material)

def tube(name, points, radius, zone, material=ivory):
    curve = bpy.data.curves.new(name + " curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    zones[zone].objects.link(obj)
    obj["asset_id"] = name
    obj.data.materials.append(material)
    return obj

# Keep the current 20 x 16 m room scale, but remove the opaque window wall.
# A full ceiling slab is intentionally omitted to permit a true layout review.
cube("SHELL_Floor", (0, -.12, 0), (20, .24, 16), "BLOCKOUT_01_SHELL", ivory)
cube("SHELL_WestWall", (-10.05, 4, 0), (.1, 8, 16), "BLOCKOUT_01_SHELL", ivory)
cube("SHELL_EastWall", (10.05, 4, 0), (.1, 8, 16), "BLOCKOUT_01_SHELL", ivory)
cube("SHELL_EntryWall", (0, 4, 8.04), (20, 8, .1), "BLOCKOUT_01_SHELL", ivory)
for x in (-8.9, -4.4, 0, 4.4, 8.9):
    cube(f"SHELL_CeilingBeam_{x}", (x, 7.84, 0), (.16, .28, 15.8), "BLOCKOUT_01_SHELL", mid)
cube("SHELL_WindowHeader", (0, 7.87, -7.72), (19.7, .2, .24), "BLOCKOUT_02_WINDOW_WALL", ivory)
cube("SHELL_WindowFoot", (0, .17, -7.72), (19.7, .34, .3), "BLOCKOUT_02_WINDOW_WALL", ivory)
for index, (x, width) in enumerate(((-5.25, 4.6), (0, 4.85), (5.25, 4.6))):
    left, right = x - width / 2, x + width / 2
    for side, xx in (("L", left), ("R", right)):
        cube(f"WINDOW_{index}_Jamb_{side}", (xx, 2.2, -7.65), (.23, 4.4, .34),
             "BLOCKOUT_02_WINDOW_WALL", white, .04)
    arch = [(x + (width / 2) * math.cos(math.pi - i * math.pi / 32),
             4.05 + 3.45 * math.sin(math.pi - i * math.pi / 32), -7.65)
            for i in range(33)]
    tube(f"WINDOW_{index}_Arch", arch, .13, "BLOCKOUT_02_WINDOW_WALL", white)

# The loft creates the high, occupied left-hand mass visible in reference 3.
cube("MUSIC_LoftDeck", (-7.8, 4.18, 3.65), (3.8, .22, 7.2), "BLOCKOUT_03_MUSIC", mid)
cube("MUSIC_LoftGuard", (-5.92, 4.82, 3.65), (.12, 1.12, 7.2), "BLOCKOUT_03_MUSIC", mid)
for z in (.7, 2.6, 4.5, 6.5):
    cube(f"MUSIC_LoftPost_{z}", (-9.25, 2.04, z), (.16, 4.08, .16), "BLOCKOUT_03_MUSIC", mid)
cube("MUSIC_UnderLoftShelf", (-9.06, 2.25, -1.6), (1.25, 4.5, 4.4), "BLOCKOUT_03_MUSIC", mid)

# Five-piece-kit occupancy proxy, not a replacement for the approved drum GLB.
cylinder("MUSIC_KickFootprint", (-7.1, .78, -2.85), .72, .95, "BLOCKOUT_03_MUSIC", white, False)
for name, x, z, radius in (("Snare", -7.8, -1.6, .35),
                           ("RackTomL", -7.45, -3.35, .33),
                           ("RackTomR", -6.75, -3.35, .35),
                           ("FloorTom", -5.9, -2.1, .4)):
    cylinder(f"MUSIC_{name}", (x, 1.22, z), radius, .28, "BLOCKOUT_03_MUSIC")
for name, x, z in (("Hihat", -8.5, -2.2), ("Crash", -8.65, -3.75), ("Ride", -5.55, -3.8)):
    cylinder(f"MUSIC_{name}", (x, 1.63, z), .48, .04, "BLOCKOUT_03_MUSIC", mid)
cylinder("MUSIC_Throne", (-7.1, .62, -.7), .36, .18, "BLOCKOUT_03_MUSIC", mid)

# Long, shared creative work surface: CRT left, modern equipment central.
cube("WORK_DeskSurface", (.05, 1.10, -4.45), (8.15, .16, 1.85), "BLOCKOUT_04_WORK", white, .07)
for x in (-3.8, 3.9):
    cube(f"WORK_DeskSupport_{x}", (x, .53, -4.45), (.22, 1.06, 1.65), "BLOCKOUT_04_WORK", mid)
cube("WORK_CRTMonitor", (-3.12, 1.55, -4.8), (.92, .72, .8), "BLOCKOUT_04_WORK", white, .09)
cube("WORK_CRTTower", (-1.9, 1.53, -4.9), (.38, .66, .57), "BLOCKOUT_04_WORK", white, .05)
cube("WORK_ModernMonitor", (.55, 1.67, -4.8), (1.22, .72, .10), "BLOCKOUT_04_WORK", mid, .03)
cube("WORK_Laptop", (2.1, 1.24, -4.1), (.82, .10, .55), "BLOCKOUT_04_WORK", white, .03)
cube("WORK_Keyboard", (.5, 1.22, -3.72), (1.25, .07, .28), "BLOCKOUT_04_WORK", mid, .02)
cube("WORK_Chair", (-.42, .67, -2.68), (.9, 1.34, .78), "BLOCKOUT_04_WORK", mid, .14)

# Right sanctuary uses the current bed collision footprint and keeps a
# walkable lane to the desk. Head is toward the east wall at x ~= 9.9.
cube("LOUNGE_BedBase", (7.0, .34, 3.0), (5.75, .68, 4.42), "BLOCKOUT_05_LOUNGE", mid, .19)
cube("LOUNGE_Mattress", (7.0, .77, 3.0), (5.65, .3, 4.30), "BLOCKOUT_05_LOUNGE", white, .13)
cube("LOUNGE_DuvetVolume", (6.0, 1.03, 3.0), (3.7, .24, 4.1), "BLOCKOUT_05_LOUNGE", white, .14)
for z in (2.0, 4.0):
    cube(f"LOUNGE_BedPillow_{z}", (9.05, 1.08, z), (.82, .28, 1.22),
         "BLOCKOUT_05_LOUNGE", white, .12)
cube("LOUNGE_SofaBase", (1.3, .33, 3.0), (3.15, .66, 2.6), "BLOCKOUT_05_LOUNGE", mid, .25)
cube("LOUNGE_SofaSeat", (1.3, .69, 3.1), (3.0, .30, 2.45), "BLOCKOUT_05_LOUNGE", white, .18)
for x in (.36, 1.3, 2.24):
    cube(f"LOUNGE_SofaBack_{x}", (x, 1.13, 2.1), (.95, .68, .54),
         "BLOCKOUT_05_LOUNGE", white, .18)
cube("LOUNGE_SideBooks", (9.13, 2.27, -3.05), (1.26, 4.54, 4.8), "BLOCKOUT_05_LOUNGE", mid)
cylinder("LOUNGE_CoffeeTable", (3.25, .48, 5.30), .7, .20, "BLOCKOUT_05_LOUNGE", mid)

# These are deliberately sparse: only the spatial masses that affect reading.
cube("CUE_CentralRug", (-.7, .025, 2.1), (7.2, .05, 5.25), "BLOCKOUT_06_SPATIAL_CUES", dark, .12)
for name, x, z, radius in (("DrumPlant", -4.45, -4.7, .42),
                            ("DeskPlant", 4.45, -5.3, .32),
                            ("BedPlant", 5.2, -.15, .34)):
    cylinder(f"CUE_{name}", (x, .34, z), radius, .68, "BLOCKOUT_06_SPATIAL_CUES", mid)
cylinder("CUE_DrumFloorLamp", (-8.92, 1.54, -.15), .34, .50, "BLOCKOUT_06_SPATIAL_CUES", white)
cylinder("CUE_BedLamp", (8.85, 1.25, .28), .27, .42, "BLOCKOUT_06_SPATIAL_CUES", white)

# Workbench renders evaluate silhouette and circulation without seductive
# material/lighting effects. Both the .blend and GLB keep stable asset IDs.
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.studio_light = "paint.sl"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "BOTH"
scene.display.shading.background_type = "VIEWPORT"
scene.display.shading.background_color = (.25, .27, .31)
scene.render.resolution_x = 1440
scene.render.resolution_y = 810
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"

def camera(name, location, target=None, lens=27, ortho=None):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    zones["PREVIEW_ONLY"].objects.link(obj)
    obj.location = location
    aim = Vector(target if target is not None else (0, 0, 0)) - obj.location
    forward = aim.normalized()
    world_up = Vector((0, 0, -1)) if ortho else Vector((0, 1, 0))
    right = forward.cross(world_up).normalized()
    up = right.cross(forward).normalized()
    obj.rotation_euler = Matrix((right, up, -forward)).transposed().to_quaternion().to_euler()
    if ortho:
        data.type = "ORTHO"
        data.ortho_scale = ortho
    else:
        data.lens = lens
    return obj

views = (
    ("01-reference-wide", camera("CAM_ReferenceWide", (-1.0, 3.45, 7.05), (0, 1.7, -4.5), 19)),
    ("02-bed-and-lounge", camera("CAM_BedLounge", (2.55, 3.65, 7.15), (6.3, .8, 2.1), 27)),
    ("03-drum-and-work", camera("CAM_DrumWork", (-3.45, 2.35, 5.9), (-4.4, 1.5, -3.9), 24)),
    ("04-top-down", camera("CAM_TopDown", (0, 20, 0), ortho=24)),
)
for name, cam in views:
    scene.camera = cam
    scene.render.filepath = str(SHOTS / (name + ".png"))
    bpy.ops.render.render(write_still=True)
    print("BLOCKOUT_RENDER", name, scene.render.filepath)

bpy.ops.object.select_all(action="DESELECT")
for name, zone in zones.items():
    if name == "PREVIEW_ONLY":
        continue
    for obj in zone.objects:
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True, export_extras=True)
scene.camera = views[0][1]
scene.render.filepath = str(SHOTS / "01-reference-wide.png")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
print("BLOCKOUT_COMPLETE", SOURCE, GLB)
