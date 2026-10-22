"""Build C03 Moonroom laptop candidate; independent from the desk and CRT."""
import bpy
import math
import os
import shutil
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/workstation/C03_laptop"
PUBLIC = ROOT / "public/assets/models/candidates"
for p in (OUT, OUT / "textures", OUT / "previews", PUBLIC):
    p.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
asset = bpy.data.collections.new("C03__ModernLaptop")
scene.collection.children.link(asset)
preview = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(preview)

def move(obj, collection=asset):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def mat(name, rgb, rough=.5, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    return m

aluminium = mat("C03_ChampagneGraphiteAluminium", (.29,.26,.31), .35, .68)
edge = mat("C03_SatinSilverEdge", (.55,.53,.59), .3, .72)
deck = mat("C03_DeepPlumKeyboardDeck", (.085,.066,.105), .72)
key = mat("C03_CharcoalKeys", (.045,.04,.055), .85)
legend = mat("C03_KeyLegends", (.64,.61,.67), .8)
rubber = mat("C03_DarkHingeAndFeet", (.025,.022,.035), .88)
glass = mat("C03_DisplayGlass", (.08,.12,.22), .18)
camera_mat = mat("C03_Webcam", (.012,.016,.03), .16)

def box(name, loc, dims, material, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = move(bpy.context.object)
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        m = o.modifiers.new("Machined softened edge", "BEVEL")
        m.width, m.segments = bevel, 3
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
        m = o.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def cylinder(name, loc, radius, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = move(bpy.context.object)
    o.name = name
    o.data.materials.append(material)
    for polygon in o.data.polygons:
        polygon.use_smooth = True
    return o

# Numeric Y-up coordinates match C02. The outer R3F GLBAsset applies its
# established axisCorrection and rotates 180 degrees to face the player.
box("C03_BaseMachinedShell", (0,.062,0), (1.60,.085,.96), aluminium, .038)
box("C03_FrontTaperLip", (0,.035,-.445), (1.49,.025,.05), edge, .011)
box("C03_KeyboardInset", (0,.111,-.09), (1.40,.018,.66), deck, .027)
box("C03_Trackpad", (0,.122,-.354), (.41,.004,.17), aluminium, .018)
box("C03_TrackpadRim", (0,.124,-.354), (.43,.003,.19), edge, .018)

# 5-row compact keyboard; keys remain individual in source.blend, batched in GLB.
for row in range(5):
    count = (15,15,14,13,11)[row]
    step = 1.31/(count-1)
    for col in range(count):
        x = -.655 + col*step + (row % 2)*.015
        z = -.20 + row*.105
        width = .075 if row<4 else .082
        if row == 0 and col == 7:
            width = .23
        box(f"C03_Key_R{row}_C{col}", (x,.133,z), (width,.017,.075), key, .006)
        if (row+col)%3 == 0 and row<4:
            box(f"C03_Legend_R{row}_C{col}", (x-.013,.143,z-.013), (.018,.0015,.005), legend, .0005)
box("C03_Spacebar", (0,.135,-.215), (.31,.017,.065), key, .006)
for x in (-.57,.57):
    for z in (-.38,.38):
        box(f"C03_NonslipFoot_{x}_{z}", (x,.006,z), (.14,.012,.035), rubber, .005)

# Hinge bars are visible at the two ends, not a floating display slab.
for x in (-.61,.61):
    h = cylinder(f"C03_HingeBar_{x}", (x,.155,.444), .037, .22, edge, 36)
    h.rotation_euler[1] = math.pi/2
box("C03_DisplayRearShell", (0,.645,.478), (1.56,.99,.064), aluminium, .034)
box("C03_DisplayBezel", (0,.645,.432), (1.50,.93,.025), rubber, .018)
box("C03_Screen", (0,.65,.416), (1.42,.825,.006), glass, .009)
cylinder("C03_WebcamLens", (0,1.091,.413), .012, .008, camera_mat, 20)
box("C03_RearMoonEmblem", (0,.67,.515), (.12,.12,.003), edge, .024)

root = bpy.data.objects.new("C03__ModernLaptop_ROOT", None)
asset.objects.link(root)
for o in tuple(asset.objects):
    if o != root:
        o.parent = root

def camera(name, loc, target, lens):
    d=bpy.data.cameras.new(name)
    o=bpy.data.objects.new(name,d)
    preview.objects.link(o)
    o.location=loc
    forward=(Vector(target)-o.location).normalized()
    right=forward.cross(Vector((0,1,0))).normalized()
    up=right.cross(forward).normalized()
    o.rotation_euler=Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
    d.lens=lens
    return o

def light(name, loc, energy, size, color):
    d=bpy.data.lights.new(name,"AREA")
    d.energy,d.shape,d.size,d.color=energy,"DISK",size,color
    o=bpy.data.objects.new(name,d)
    preview.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector((0,.4,0))-o.location).to_track_quat("-Z","Y").to_euler()

light("Warm studio key",(-2,3,-2),580,4,(1,.83,.74))
light("Cool glass reflection",(2,2,2),420,3,(.75,.82,1))
hero=camera("C03_ThreeQuarter",(2.7,1.75,-3),(0,.5,0),55)
front=camera("C03_Front",(0,1.2,-3.4),(0,.55,0),58)
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.render.resolution_x=1100
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.view_settings.view_transform="AgX"
scene.world.color=(.5,.5,.5)
if os.environ.get("MOONROOM_C03_EXPORT_ONLY")!="1":
    for name,cam in (("01_pbr_45deg",hero),("02_pbr_front",front)):
        scene.camera=cam
        scene.render.filepath=str(OUT/"previews"/(name+".png"))
        bpy.ops.render.render(write_still=True)
    scene.render.engine="BLENDER_WORKBENCH"
    scene.display.shading.light="STUDIO"
    scene.display.shading.color_type="SINGLE"
    scene.display.shading.single_color=(.7,.7,.7)
    scene.display.shading.show_cavity=True
    scene.camera=hero
    scene.render.filepath=str(OUT/"previews/03_clay_45deg.png")
    bpy.ops.render.render(write_still=True)
    scene.render.engine="CYCLES"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"source.blend"))

# Keep the screen as an independent override target for a future dynamic view.
for material in (aluminium,edge,deck,key,legend,rubber,glass,camera_mat):
    objects=[o for o in asset.objects if o.type=="MESH" and o.name!="C03_Screen" and o.data.materials and o.data.materials[0]==material]
    if len(objects)<2: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    objects[0].name="C03_Batched_"+material.name
bpy.ops.object.select_all(action="DESELECT")
for o in asset.objects: o.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/"optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,
                          export_yup=True,export_apply=True,export_materials="EXPORT")
shutil.copyfile(glb,PUBLIC/"C03-modern-laptop-review.glb")
print("C03_COMPLETE",glb)
