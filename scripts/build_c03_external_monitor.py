"""C03 companion display: a separate editable Blender asset for the laptop setup."""
import bpy
import math
import os
import shutil
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/workstation/C03_external_monitor"
PUBLIC = ROOT / "public/assets/models/candidates"
for path in (OUT, OUT / "textures", OUT / "previews", PUBLIC):
    path.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
asset = bpy.data.collections.new("C03M__CompanionMonitor")
scene.collection.children.link(asset)
preview = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(preview)

def move(obj, collection=asset):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def material(name, color, rough=.55, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

housing = material("C03M_SatinPlumGraphite", (.105,.079,.12), .56)
bezel = material("C03M_DarkDisplayBezel", (.024,.021,.032), .75)
metal = material("C03M_ChampagneMetalStand", (.45,.34,.30), .38, .67)
glass = material("C03M_NeutralScreenGlass", (.12,.18,.23), .2)
port = material("C03M_PortRecess", (.013,.012,.022), .88)
led = material("C03M_MintPowerLED", (.22,.75,.67), .24)
led.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value = (.12,.8,.7,1)
led.node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value = .45

def box(name, loc, dims, mat, bevel=.009):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = move(bpy.context.object)
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured radius", "BEVEL")
        mod.width, mod.segments = bevel, 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def cylinder(name, loc, radius, depth, mat, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = move(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

# Same numeric Y-up convention as C02 and the C03 laptop. Front is local -Z;
# R3F applies axisCorrection plus PI rotation, pointing both screens at the room.
box("C03M_SculptedDisplayShell", (0,.72,.055), (1.27,.84,.083), housing, .027)
box("C03M_FrontBezel", (0,.72,-.001), (1.22,.795,.018), bezel, .014)
box("C03M_ScreenShadow", (0,.735,-.013), (1.17,.735,.008), port, .006)
box("C03M_Screen", (0,.735,-.021), (1.15,.715,.005), glass, .004)
box("C03M_LogoChin", (0,.322,-.012), (.10,.013,.003), metal, .004)
cylinder("C03M_PowerLED", (.55,.328,-.019), .012, .008, led, 20)

# Real stand/foot contact, with articulated joint and cable routing.
box("C03M_SwanNeck", (0,.245,.14), (.085,.39,.085), metal, .025)
hinge = cylinder("C03M_TiltPivot", (0,.44,.12), .046, .18, metal)
hinge.rotation_euler[1] = math.pi/2
box("C03M_WeightedFoot", (0,.035,.13), (.52,.07,.31), metal, .033)
box("C03M_FootRubber", (0,.006,.13), (.46,.012,.25), port, .01)
box("C03M_RearVesaInset", (0,.70,.106), (.27,.27,.011), bezel, .02)
for row in range(2):
    for col in range(10):
        x = -.38 + col*.084
        y = .68 + row*.14
        box(f"C03M_RearVent_{row}_{col}", (x,y,.104), (.046,.014,.004), port, .003)
for x in (-.14, 0, .14):
    box(f"C03M_RearPort_{x}", (x,.363,.103), (.08,.037,.005), port, .004)

root = bpy.data.objects.new("C03M__CompanionMonitor_ROOT", None)
asset.objects.link(root)
for obj in tuple(asset.objects):
    if obj != root:
        obj.parent = root

def camera(name, loc, target, lens):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    preview.objects.link(obj)
    obj.location = loc
    forward = (Vector(target)-obj.location).normalized()
    right = forward.cross(Vector((0,1,0))).normalized()
    up = right.cross(forward).normalized()
    obj.rotation_euler = Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
    data.lens = lens
    return obj

def area(name, loc, power, size, color):
    data = bpy.data.lights.new(name,"AREA")
    data.energy,data.shape,data.size,data.color = power,"DISK",size,color
    obj = bpy.data.objects.new(name,data)
    preview.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0,.65,0))-obj.location).to_track_quat("-Z","Y").to_euler()

area("Warm studio key",(-2,2,-2),680,4,(1,.84,.73))
area("Cool rim",(2,2,1.8),470,3,(.77,.84,1))
hero = camera("C03M_ThreeQuarter",(2.2,1.6,-2.7),(0,.58,0),54)
rear = camera("C03M_Rear",(-1.8,1.4,2.6),(0,.59,0),54)
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 1050
scene.render.resolution_y = 800
scene.view_settings.view_transform = "AgX"
scene.world.color = (.5,.5,.5)
if os.environ.get("MOONROOM_C03M_EXPORT_ONLY") != "1":
    for name,cam in (("01_pbr_front",hero),("02_pbr_rear",rear)):
        scene.camera = cam
        scene.render.filepath = str(OUT/"previews"/(name+".png"))
        bpy.ops.render.render(write_still=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (.7,.7,.7)
    scene.display.shading.show_cavity = True
    scene.camera = hero
    scene.render.filepath = str(OUT/"previews/03_clay_front.png")
    bpy.ops.render.render(write_still=True)
    scene.render.engine = "CYCLES"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"source.blend"))

# Editable source keeps joinery; runtime batches by material. Screen stays a
# separate node so the Three.js dream landscape can override it dynamically.
for mat in (housing,bezel,metal,glass,port,led):
    meshes=[obj for obj in asset.objects if obj.type=="MESH" and obj.name!="C03M_Screen" and obj.data.materials and obj.data.materials[0]==mat]
    if len(meshes)<2: continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes: obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes[0].name = "C03M_Batched_" + mat.name
bpy.ops.object.select_all(action="DESELECT")
for obj in asset.objects: obj.select_set(True)
bpy.context.view_layer.objects.active = root
glb = OUT/"optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,
                          export_yup=True,export_apply=True,export_materials="EXPORT")
shutil.copyfile(glb,PUBLIC/"C03-companion-monitor-review.glb")
print("C03M_COMPLETE",glb)
