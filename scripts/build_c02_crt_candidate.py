"""Independent C02 CRT candidate. Uses legacy numeric Y-up coordinates on purpose."""
import bpy
import math
import os
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "workstation" / "C02_crt_candidate"
PUBLIC = ROOT / "public" / "assets" / "models" / "candidates"
for path in (OUT, OUT / "textures", OUT / "previews", PUBLIC):
    path.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for mat in tuple(bpy.data.materials):
    bpy.data.materials.remove(mat)
scene = bpy.context.scene
asset = bpy.data.collections.new("C02__IvoryDreamCRT")
scene.collection.children.link(asset)
preview = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(preview)

def move(obj, collection=asset):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def mat(name, rgb, rough, metallic=0, coat=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb,1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb,1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Coat Weight"].default_value = coat
    return m

ivory = mat("C02_AgedIvoryABS", (.65,.57,.47), .68, coat=.12)
warm_edge = mat("C02_SatinIvoryEdge", (.76,.68,.56), .52, coat=.15)
recess = mat("C02_RecessShadow", (.14,.12,.115), .88)
charcoal = mat("C02_DarkVentGraphite", (.07,.064,.069), .8)
rose_metal = mat("C02_BrushedChampagneMetal", (.52,.35,.26), .43, .55)
keytop = mat("C02_KeycapWarmIvory", (.77,.72,.63), .73)
keymark = mat("C02_KeyLegendCharcoal", (.12,.11,.11), .85)
glass = mat("C02_CRTGlassPlaceholder", (.07,.16,.19), .2, 0, .2)
led = mat("C02_PowerMint", (.28,.85,.67), .2)
led.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value = (.18,.8,.55,1)
led.node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value = 1.2

# Tiny repeatable case colour variation; meshes retain ordinary UVs on export.
texture = bpy.data.images.new("C02_IvoryMicrograin", width=256, height=256, alpha=True)
pixels = []
for y in range(256):
    for x in range(256):
        n = .009*math.sin(x*.63+y*.21) + .006*math.sin(x*1.77-y*.49)
        n += .004*math.sin(x*.12+y*1.12)
        pixels.extend((.65+n,.57+n*.92,.47+n*.8,1))
texture.pixels.foreach_set(pixels)
texture.filepath_raw = str(OUT / "textures" / "C02_ivory_basecolor.png")
texture.file_format = "PNG"
texture.save()
tex_node = ivory.node_tree.nodes.new("ShaderNodeTexImage")
tex_node.image = texture
ivory.node_tree.links.new(tex_node.outputs["Color"], ivory.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])

def box(name, loc, dims, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = move(bpy.context.object)
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Soft manufacturing radius", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        normal = obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj

def cylinder(name, loc, radius, depth, material, vertices=32):
    # Cylinder local Z becomes front-back Z after rotation is left at identity.
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = move(bpy.context.object)
    obj.name = name
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj

def tapered_shell(name, x0, x1, y0, y1, zfront, zback, xb, yb, material):
    verts = [(-x0,y0,zfront),(x0,y0,zfront),(x0,y1,zfront),(-x0,y1,zfront),
             (-xb,y0+yb,zback),(xb,y0+yb,zback),(xb,y1-yb,zback),(-xb,y1-yb,zback)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh = bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    asset.objects.link(obj)
    mesh.materials.append(material)
    bev = obj.modifiers.new("Injection shell rounded edges","BEVEL")
    bev.width=.065
    bev.segments=3
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=bev.name)
    return obj

# Existing world transform and dynamic-screen plane require these local bounds.
tapered_shell("CRT_SculptedDeepCabinet", .91, .79, .43, 1.97, -.53, .72, .73, .09, ivory)
box("CRT_FrontGasket", (0,1.21,-.568), (1.70,1.31,.13), warm_edge, .09)
box("CRT_FaceInner", (0,1.24,-.646), (1.53,1.11,.045), ivory, .065)

# A recessed window made from separate bevel rails; the screen itself stays
# separately named and under the untouched Three.js dynamic-screen layer.
box("CRT_DisplayShadow", (0,1.25,-.680), (1.35,1.01,.012), recess, .036)
box("CRT_Screen", (0,1.25,-.690), (1.30,.96,.008), glass, .018)
box("CRT_BezelTop", (0,1.765,-.676), (1.47,.072,.045), warm_edge, .015)
box("CRT_BezelBottom", (0,.735,-.676), (1.47,.082,.045), warm_edge, .015)
for side in (-1,1):
    box(f"CRT_BezelSide_{side}", (side*.704,1.25,-.676), (.065,.97,.045), warm_edge, .015)
box("CRT_ControlChin", (0,.621,-.658), (1.58,.165,.12), ivory, .048)
box("CRT_ChinInset", (0,.606,-.723), (1.42,.052,.011), warm_edge, .012)
for i in range(3):
    cylinder(f"CRT_Button_{i}", (-.53+i*.115,.625,-.744), .025, .023, rose_metal, 32)
cylinder("CRT_PowerRing", (.565,.625,-.746), .037, .024, rose_metal)
cylinder("CRT_PowerLED", (.565,.625,-.763), .020, .012, led)

# Side ventilation uses repeated slots but is batched by material in the GLB.
for side in (-1,1):
    for row in range(4):
        for i in range(7):
            box(f"CRT_SideVent_{side}_{row}_{i}",
                (side*.808,1.04+row*.105,.18+i*.065), (.008,.035,.042), charcoal, .006)
for row in range(3):
    for i in range(8):
        box(f"CRT_TopVent_{row}_{i}", (-.50+i*.14,1.935,.09+row*.12), (.072,.008,.033), charcoal, .004)
box("CRT_RearAccessPanel", (0,1.17,.736), (1.18,1.08,.014), warm_edge, .04)
for y in (.88,1.11,1.34):
    box(f"CRT_RearVent_{y}", (0,y,.747), (.48,.028,.006), charcoal, .008)
box("CRT_Neck", (0,.39,.05), (.49,.2,.42), ivory, .07)
box("CRT_Base", (0,.16,.07), (.91,.11,.67), ivory, .055)
box("CRT_BaseFootPad", (0,.095,.07), (.78,.02,.57), charcoal, .012)

# Companion beige desktop tower, separated visually but kept in the C02
# workstation assembly as in the current active GLB.
box("CRT_TowerCase", (1.65,.69,.035), (1.12,1.28,1.1), ivory, .064)
box("CRT_TowerFront", (1.65,.69,-.528), (.98,1.16,.042), warm_edge, .032)
box("CRT_TowerPanel", (1.65,.69,-.557), (.84,1.03,.012), ivory, .018)
box("CRT_OpticalDrive", (1.65,.98,-.571), (.70,.19,.024), warm_edge, .014)
box("CRT_OpticalSlot", (1.65,.985,-.585), (.53,.012,.007), recess, .002)
box("CRT_FloppyBezel", (1.65,.70,-.574), (.68,.13,.02), warm_edge, .012)
box("CRT_FloppySlot", (1.65,.71,-.586), (.44,.015,.008), charcoal, .003)
for i in range(5):
    box(f"CRT_TowerVent_{i}", (1.38+i*.13,.44,-.58), (.045,.1,.012), charcoal, .007)
cylinder("CRT_TowerPower", (1.89,.26,-.58), .028, .018, rose_metal)

# Typable silhouette with distinct rows; legends are restrained and not one
# separate runtime draw call each. A few long keys break the repetitive grid.
box("CRT_KeyboardBase", (0,.115,-1.29), (1.70,.12,.57), ivory, .055)
box("CRT_KeyboardWell", (0,.185,-1.29), (1.52,.016,.43), warm_edge, .016)
for row in range(4):
    count = (14,14,13,12)[row]
    step = 1.37/(count-1)
    for col in range(count):
        x = -.685+col*step+(row%2)*.01
        z = -1.455+row*.113
        key = box(f"CRT_Key_{row}_{col}", (x,.217,z), (.081,.042,.077), keytop, .009)
        if row<3 and col in (1,4,7,10):
            box(f"CRT_KeyLegend_{row}_{col}", (x,.241,z-.014), (.019,.002,.006), keymark, .001)
box("CRT_Spacebar", (0,.22,-1.091), (.51,.036,.071), keytop, .01)
box("CRT_Cable", (.79,.122,-.98), (.33,.022,.024), charcoal, .01)

root = bpy.data.objects.new("C02__DreamCRT_ROOT",None)
asset.objects.link(root)
for obj in tuple(asset.objects):
    if obj != root:
        obj.parent = root

def set_y_up_camera(obj, target):
    forward = (Vector(target)-obj.location).normalized()
    right = forward.cross(Vector((0,1,0))).normalized()
    up = right.cross(forward).normalized()
    obj.rotation_euler = Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()

def camera(name, loc, target, lens=48):
    data=bpy.data.cameras.new(name)
    obj=bpy.data.objects.new(name,data)
    preview.objects.link(obj)
    obj.location=loc
    set_y_up_camera(obj,target)
    data.lens=lens
    return obj

def light(name, loc, power, size, color):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=power
    data.shape="DISK"
    data.size=size
    data.color=color
    obj=bpy.data.objects.new(name,data)
    preview.objects.link(obj)
    obj.location=loc
    set_y_up_camera(obj,(.55,.8,-.3))

floor = box("PREVIEW_NeutralFloor",(.55,-.035,-.3),(4.2,.06,4.0),mat("PREVIEW_Floor",(.34,.33,.35),.9),.005)
move(floor,preview)
hero = camera("PREVIEW_Hero",(-1.18,2.18,-5.0),(.48,.89,-.58),44)
frontcam = camera("PREVIEW_Front",(.42,1.85,-4.75),(.42,.95,-.55),49)
sidecam = camera("PREVIEW_Side",(-2.15,1.8,-2.15),(.35,1.08,-.1),48)
light("PREVIEW_Key",(-1.5,3.5,-2.4),430,3,(1,.86,.75))
light("PREVIEW_Fill",(2.6,2.8,-1.2),270,2.5,(.75,.81,1))
light("PREVIEW_Rim",(.7,3.3,1.7),500,2,(1,.73,.56))

# The preview-only image provides the visual landscape. Runtime continues to
# draw its existing interactive screen plane; no picture plane is exported.
screen_art_path = ROOT / "public" / "assets" / "textures" / "moon-river-sky.png"
if screen_art_path.exists():
    image=bpy.data.images.load(str(screen_art_path),check_existing=True)
    artmat=mat("PREVIEW_DreamScreen",(.8,.8,.8),.6)
    nodes=artmat.node_tree.nodes
    tex=nodes.new("ShaderNodeTexImage")
    tex.image=image
    artmat.node_tree.links.new(tex.outputs["Color"],nodes.get("Principled BSDF").inputs["Base Color"])
    mesh=bpy.data.meshes.new("PREVIEW_ScreenArtwork_mesh")
    mesh.from_pydata([(-.6425,.7775,-.712),(.6425,.7775,-.712),
        (.6425,1.7225,-.712),(-.6425,1.7225,-.712)],[],[(0,1,2,3)])
    mesh.materials.append(artmat)
    uv=mesh.uv_layers.new(name="DreamLandscapeUV")
    for loop,coord in zip(mesh.polygons[0].loop_indices,((0,0),(1,0),(1,1),(0,1))):
        uv.data[loop].uv=coord
    screen_art=bpy.data.objects.new("PREVIEW_ScreenArtwork",mesh)
    preview.objects.link(screen_art)

scene.world.color=(.35,.35,.35)
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.render.resolution_x=1200
scene.render.resolution_y=860
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
if os.environ.get("MOONROOM_C02_EXPORT_ONLY")!="1":
    for name,cam in (("01_pbr_45deg",hero),("02_pbr_front",frontcam),("03_pbr_side",sidecam)):
        scene.camera=cam
        scene.render.filepath=str(OUT/"previews"/(name+".png"))
        bpy.ops.render.render(write_still=True)
    scene.render.engine="BLENDER_WORKBENCH"
    scene.display.shading.light="STUDIO"
    scene.display.shading.color_type="SINGLE"
    scene.display.shading.single_color=(.7,.7,.7)
    scene.display.shading.show_cavity=True
    scene.camera=hero
    scene.render.filepath=str(OUT/"previews"/"04_clay_45deg.png")
    bpy.ops.render.render(write_still=True)
scene.render.engine="CYCLES"
scene.camera=hero
scene.render.filepath=str(OUT/"previews"/"01_pbr_45deg.png")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"source.blend"))

# Batch all non-interactive parts; the screen remains a distinct named mesh.
for material in (ivory,warm_edge,recess,charcoal,rose_metal,keytop,keymark,glass,led):
    meshes=[o for o in asset.objects if o.type=="MESH" and o.data.materials and o.data.materials[0]==material and o.name!="CRT_Screen"]
    if len(meshes)<2:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join()
    meshes[0].name="C02_Batched_"+material.name

bpy.ops.object.select_all(action="DESELECT")
for obj in asset.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/"optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,
    export_yup=True,export_apply=True,export_materials="EXPORT")
public=PUBLIC/"C02-dream-crt-review.glb"
public.write_bytes(glb.read_bytes())
print("C02_COMPLETE",glb,public)
