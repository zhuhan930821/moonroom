"""Build the standalone C01 workstation desk candidate in Blender (metres, Z-up).

The room keeps its existing desk until this candidate has been visually approved.
Run: blender -b --python scripts/build_c01_workstation_desk.py
"""
import bpy
import math
import os
import shutil
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "workstation" / "C01_desk"
PUBLIC = ROOT / "public" / "assets" / "models" / "candidates"
for path in (OUT, OUT / "textures", OUT / "previews", PUBLIC):
    path.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
desk = bpy.data.collections.new("C01__LongWoodWorkstation")
scene.collection.children.link(desk)
studio = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(studio)

def move(obj, collection=desk):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def material(name, color, roughness=.62, metallic=0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, 1)
    item.use_nodes = True
    shader = item.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return item

oak = material("C01_WarmSmokedOak", (.35, .19, .14), .57)
edge = material("C01_EndGrainOak", (.28, .14, .10), .68)
dark = material("C01_UnderframeWalnut", (.19, .105, .085), .72)
brass = material("C01_SatinChampagneBrass", (.49, .32, .19), .36, .72)
felt = material("C01_CharcoalCableTray", (.055, .045, .06), .85)

# Subtle baked grain survives GLB export. Broad plank variation comes from the
# model's individual boards, while this small map carries only fine texture.
image = bpy.data.images.new("C01_OakFineGrain", width=512, height=512, alpha=True)
pixels = []
for y in range(512):
    for x in range(512):
        wave = math.sin(y * .13 + math.sin(x * .015) * 2.5) * .022
        line = math.sin(y * .68 + x * .035) * .006
        pore = math.sin(x * .41 + y * 1.73) * .003
        n = wave + line + pore
        pixels.extend((.36+n, .205+n*.61, .15+n*.42, 1))
image.pixels.foreach_set(pixels)
image.filepath_raw = str(OUT / "textures" / "C01_oak_basecolor.png")
image.file_format = "PNG"
image.save()
texture = oak.node_tree.nodes.new("ShaderNodeTexImage")
texture.image = image
oak.node_tree.links.new(texture.outputs["Color"], oak.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])

def box(name, location, dimensions, material_ref, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = move(bpy.context.object)
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material_ref)
    if bevel:
        mod = obj.modifiers.new("Soft dressed edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        weighted = obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=weighted.name)
    return obj

def cylinder(name, location, radius, depth, material_ref, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = move(bpy.context.object)
    obj.name = name
    obj.data.materials.append(material_ref)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

# Local origin: floor beneath the centre of the desk. Its slab top is 1.29 m,
# nearly identical to the active 1.31 m top; CRT/keyboard remain on their old
# world transforms, with a maximum 2 cm contact discrepancy for later tuning.
box("C01_TopCore", (0, 0, 1.207), (8.25, 1.80, .166), oak, .065)
for index, x in enumerate((-2.76, 0, 2.76)):
    box(f"C01_TopPlank_{index+1}", (x, -.006, 1.283), (2.70, 1.72, .017), oak, .008)
for z in (-.885, .885):
    box(f"C01_EasedLongEdge_{'Front' if z>0 else 'Rear'}", (0, z, 1.215), (8.04, .035, .055), edge, .015)
for x in (-4.095, 4.095):
    box(f"C01_EndGrainBand_{'L' if x<0 else 'R'}", (x, 0, 1.216), (.045, 1.72, .095), edge, .012)

# Two sturdy paired trestles replace the placeholder's needle-thin legs. The
# open centre remains clear for the chair; drawer units are intentionally C09.
for side, x in (("L", -3.52), ("R", 3.52)):
    for depth, z in (("Front", .68), ("Rear", -.68)):
        box(f"C01_{side}_{depth}_Leg", (x, z, .595), (.19, .17, 1.19), dark, .025)
        box(f"C01_{side}_{depth}_Foot", (x, z, .045), (.225, .22, .085), brass, .015)
        box(f"C01_{side}_{depth}_HeadCollar", (x, z, 1.12), (.235, .21, .035), brass, .008)
    box(f"C01_{side}_TopCrossRail", (x, 0, 1.085), (.16, 1.43, .12), dark, .02)
    box(f"C01_{side}_LowerCrossRail", (x, 0, .225), (.12, 1.42, .13), dark, .014)
    for z in (-.64, .64):
        cylinder(f"C01_{side}_JoinPin_{z}", (x, z, .92), .024, .013, brass, 20)

# Restrained apron/stretcher geometry gives depth under the long top without
# making a visual wall or blocking knees and the existing movement corridor.
for z, label in ((-.73, "Rear"), (.73, "Front")):
    box(f"C01_{label}_Apron", (0, z, 1.086), (7.20, .075, .19), dark, .015)
box("C01_RearCableChannel", (0, -.73, .945), (5.1, .19, .045), felt, .012)
for x in (-2.3, 2.3):
    box(f"C01_InnerSupport_{x}", (x, -.44, 1.06), (.07, .56, .21), dark, .012)

root = bpy.data.objects.new("C01__LongWoodWorkstation_ROOT", None)
desk.objects.link(root)
for obj in tuple(desk.objects):
    if obj != root:
        obj.parent = root

def area(name, location, power, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = power, "DISK", size, color
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = location
    direction = Vector((0, 0, .75)) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

area("Warm softbox", (-3, 1.5, 4.4), 1600, 6, (1, .83, .7))
area("Cool fill", (3, -2.2, 3.4), 850, 5, (.77, .82, 1))
area("Front rim", (1, 4.3, 3.1), 700, 4, (1, .76, .6))

def camera(name, location, target, lens):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    data.lens = lens
    return obj

hero = camera("C01_ThreeQuarter", (10.8, 7.8, 5.6), (0, 0, .69), 42)
front = camera("C01_Front", (0, 10.2, 2.75), (0, 0, .67), 46)
detail = camera("C01_TopAndJoinery", (-2.85, 2.15, 2.5), (-3.45, .3, 1.0), 65)
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.render.resolution_x = 1400
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
scene.world.color = (.45, .45, .45)
if os.environ.get("MOONROOM_C01_EXPORT_ONLY") != "1":
    for name, cam in (("01_pbr_three_quarter", hero), ("02_pbr_front", front), ("03_pbr_joinery", detail)):
        scene.camera = cam
        scene.render.filepath = str(OUT / "previews" / f"{name}.png")
        bpy.ops.render.render(write_still=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (.7, .7, .7)
    scene.display.shading.show_cavity = True
    scene.camera = hero
    scene.render.filepath = str(OUT / "previews" / "04_clay_three_quarter.png")
    bpy.ops.render.render(write_still=True)
    scene.render.engine = "CYCLES"
    bpy.ops.wm.save_as_mainfile(filepath = str(OUT / "source.blend"))

# The editable .blend keeps individual joinery objects. Only the browser GLB
# batches pieces sharing one material, so this desk costs five draw calls.
for mat in (oak, edge, dark, brass, felt):
    meshes = [obj for obj in desk.objects if obj.type == "MESH" and obj.data.materials and obj.data.materials[0] == mat]
    if len(meshes) < 2:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes[0].name = "C01_Batched_" + mat.name

bpy.ops.object.select_all(action="DESELECT")
for obj in desk.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
glb = OUT / "optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                          export_yup=True, export_apply=True, export_materials="EXPORT")
shutil.copyfile(glb, PUBLIC / "C01-workstation-desk-review.glb")
print("C01_COMPLETE", glb)
