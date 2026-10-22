"""Build one editable Moonroom near-field speaker; never touches active scene assets."""
import bpy
import math
import os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "workstation" / "C04_studio_speaker"
PUBLIC = ROOT / "public" / "assets" / "models" / "candidates"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "textures").mkdir(exist_ok=True)
(OUT / "previews").mkdir(exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in tuple(bpy.data.materials):
    bpy.data.materials.remove(material)

scene = bpy.context.scene
asset_collection = bpy.data.collections.new("C04__studio_speaker")
scene.collection.children.link(asset_collection)
preview_collection = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(preview_collection)

def move_to(obj, collection=asset_collection):
    for collection_old in tuple(obj.users_collection):
        collection_old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def material(name, color, roughness, metallic=0, coat=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Coat Weight"].default_value = coat
    return mat

cabinet = material("C04_Cabinet_PlumCharcoal", (.055, .041, .069), .52, 0, .08)
front = material("C04_Baffle_BlackVelvet", (.026, .022, .034), .82)
rim = material("C04_DarkBrushedMetal", (.095, .082, .106), .36, .68)
cone = material("C04_Woofer_WarmGraphite", (.135, .111, .129), .78)
cone_inner = material("C04_Woofer_DustCap", (.09, .069, .081), .7)
tweeter = material("C04_Tweeter_SilkDome", (.16, .143, .167), .49)
bronze = material("C04_ChampagneAccent", (.55, .36, .21), .32, .65)
port_dark = material("C04_PortInterior", (.008, .007, .012), .9)
rubber = material("C04_RubberFeet", (.02, .018, .025), .9)

# A small seamless colour map makes side veneers less flat in the exported GLB.
size = 256
image = bpy.data.images.new("C04_Veneer_Grain", width=size, height=size, alpha=True)
pixels = []
for y in range(size):
    for x in range(size):
        wave = math.sin(y * .57 + math.sin(x * .095) * 2.6) * .018
        fine = math.sin(y * 2.9 + x * .23) * .007
        v = wave + fine
        pixels.extend((max(.0, .105+v), max(.0, .071+v*.62), max(.0, .105+v*.9), 1))
image.pixels.foreach_set(pixels)
image.filepath_raw = str(OUT / "textures" / "C04_veneer_basecolor.png")
image.file_format = "PNG"
image.save()
veneer = material("C04_DeepPlumVeneer", (.12, .07, .12), .59, 0, .12)
nodes = veneer.node_tree.nodes
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
veneer.node_tree.links.new(tex.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])

def box(name, loc, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = move_to(bpy.context.object)
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Manufactured edge radius", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        normal = obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj

def lathe(name, center_z, profile, mat, segments=48):
    """Revolve a radial profile around Blender Y; face points toward -Y."""
    verts = []
    faces = []
    for radius, depth in profile:
        for i in range(segments):
            a = math.tau*i/segments
            verts.append((radius*math.cos(a), depth, center_z+radius*math.sin(a)))
    for ring in range(len(profile)-1):
        for i in range(segments):
            j = (i+1)%segments
            faces.append((ring*segments+i, ring*segments+j, (ring+1)*segments+j, (ring+1)*segments+i))
    mesh = bpy.data.meshes.new(name+"_profile")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    asset_collection.objects.link(obj)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def torus(name, loc, radius, tube, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=tube,
        major_segments=48, minor_segments=8, location=loc, rotation=(math.pi/2,0,0))
    obj = move_to(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def cylinder(name, loc, radius, depth, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=loc, rotation=(math.pi/2,0,0))
    obj = move_to(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

# Metres, local origin = underside centre. Blender front is -Y, exported Three.js front is +Z.
box("C04_Cabinet_RoundedShell", (0, 0, .41), (.42, .38, .82), cabinet, .027)
box("C04_LeftVeneer", (-.209, 0, .41), (.006, .335, .765), veneer, .002)
box("C04_RightVeneer", (.209, 0, .41), (.006, .335, .765), veneer, .002)
box("C04_FrontBaffle", (0, -.188, .41), (.383, .012, .77), front, .015)
box("C04_BaffleInset", (0, -.197, .41), (.358, .006, .743), front, .012)

# Two-way monitor: hornless silk dome, rubber-surrounded woven woofer, front reflex port.
tweeter_z = .624
woofer_z = .345
lathe("C04_Tweeter_Bezel", tweeter_z,
    [(0.075,-.21),(.075,-.218),(.065,-.224),(.052,-.220),(.049,-.212)], rim)
lathe("C04_Tweeter_Dome", tweeter_z,
    [(.001,-.239),(.018,-.237),(.034,-.231),(.047,-.219),(.049,-.212)], tweeter)
torus("C04_Tweeter_SilkSurround", (0,-.219,tweeter_z), .053, .0035, cone_inner)

lathe("C04_Woofer_MountingRing", woofer_z,
    [(.146,-.209),(.149,-.217),(.143,-.229),(.127,-.229),(.121,-.211)], rim)
torus("C04_Woofer_RubberSurround", (0,-.226,woofer_z), .119, .013, rubber)
lathe("C04_Woofer_Cone_DishedProfile", woofer_z,
    [(.105,-.223),(.094,-.220),(.078,-.205),(.052,-.184),(.032,-.181),(.001,-.188)], cone)
lathe("C04_Woofer_DustCap", woofer_z,
    [(.001,-.205),(.016,-.204),(.030,-.198),(.038,-.184)], cone_inner)
torus("C04_Woofer_ChampagneHairline", (0,-.217,woofer_z), .145, .0018, bronze)

port_z = .108
lathe("C04_BassReflex_PortLip", port_z,
    [(.056,-.204),(.058,-.217),(.052,-.224),(.044,-.224),(.043,-.204)], rim)
cylinder("C04_BassReflex_DarkOpening", (0,-.221,port_z), .043, .003, port_dark)
torus("C04_Port_InnerLip", (0,-.224,port_z), .042, .0018, bronze)

for side in (-1, 1):
    for z in (.198, .493):
        x = side * .165
        cylinder(f"C04_MountScrew_{side}_{z}", (x,-.211,z), .005, .003, bronze, 16)
for x in (-.148,.148):
    for y in (-.12,.12):
        box(f"C04_IsolationFoot_{x}_{y}", (x,y,.008), (.047,.045,.016), rubber, .004)
box("C04_RearTerminalPlate", (0,.192,.142), (.13,.005,.105), rim, .008)
for x in (-.032,.032):
    cylinder(f"C04_RearBindingPost_{x}", (x,.205,.145), .014, .026, bronze, 24)

# Single asset root: exported GLB contains all visible children but no preview scenery.
root = bpy.data.objects.new("C04__StudioSpeaker_ROOT", None)
asset_collection.objects.link(root)
for obj in tuple(asset_collection.objects):
    if obj != root:
        obj.parent = root

def camera(name, loc, target, lens=48):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    preview_collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()
    data.lens = lens
    return obj

def area(name, loc, power, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    preview_collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0,0,.4))-obj.location).to_track_quat("-Z", "Y").to_euler()

floor_mat = material("PREVIEW_NeutralFloor", (.34,.34,.36), .9)
box("PREVIEW_Floor", (0,0,-.035), (2.4,2.4,.06), floor_mat, .005)
floor = bpy.data.objects["PREVIEW_Floor"]
move_to(floor, preview_collection)
cam_hero = camera("PREVIEW_45deg", (.98,-1.47,1.12), (0,0,.41), 50)
cam_front = camera("PREVIEW_front", (0,-1.75,.60), (0,0,.42), 55)
cam_rear = camera("PREVIEW_side_rear", (-1.05,1.1,1.0), (0,0,.43), 50)
area("PREVIEW_Key", (-1.0,-1.1,2.1), 250, 1.8, (1,.82,.68))
area("PREVIEW_Fill", (1.1,-.25,1.45), 120, 1.4, (.72,.76,1))
area("PREVIEW_Rim", (.5,1.2,1.7), 300, 1.0, (1,.68,.55))
scene.world.color = (.25,.25,.25)
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.render.resolution_x = 1200
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
if os.environ.get("MOONROOM_C04_EXPORT_ONLY") != "1":
    scene.camera = cam_hero
    scene.render.filepath = str(OUT / "previews" / "01_pbr_45deg.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = cam_front
    scene.render.filepath = str(OUT / "previews" / "02_pbr_front.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = cam_rear
    scene.render.filepath = str(OUT / "previews" / "03_pbr_side_rear.png")
    bpy.ops.render.render(write_still=True)

    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (.72,.72,.72)
    scene.display.shading.show_cavity = True
    scene.camera = cam_hero
    scene.render.filepath = str(OUT / "previews" / "04_clay_45deg.png")
    bpy.ops.render.render(write_still=True)

    scene.render.engine = "CYCLES"
    scene.camera = cam_hero
    scene.render.filepath = str(OUT / "previews" / "01_pbr_45deg.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "source.blend"))
else:
    scene.camera = cam_hero
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "source.blend"))

# The source retains editable parts. The runtime copy batches non-interactive
# meshes by material; each speaker still has a stable C04 root.
for mat in (cabinet, front, rim, cone, cone_inner, tweeter, bronze, port_dark, rubber, veneer):
    matches = [obj for obj in asset_collection.objects
        if obj.type == "MESH" and obj.data.materials and obj.data.materials[0] == mat]
    if len(matches) < 2:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in matches:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = matches[0]
    bpy.ops.object.join()
    matches[0].name = "C04_Batched_" + mat.name

bpy.ops.object.select_all(action="DESELECT")
for obj in asset_collection.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
glb = OUT / "optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
    export_yup=True, export_apply=True, export_materials="EXPORT")
public = PUBLIC / "C04-studio-speaker-review.glb"
public.write_bytes(glb.read_bytes())
print("C04_COMPLETE", glb, public)
