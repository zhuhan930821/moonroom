"""Build an independent 49-key C05 MIDI keyboard candidate for Moonroom."""
import bpy
import math
import os
import shutil
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets/workstation/C05_midi_keyboard"
PUBLIC=ROOT/"public/assets/models/candidates"
for path in (OUT,OUT/"textures",OUT/"previews",PUBLIC): path.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
asset=bpy.data.collections.new("C05__MoonroomMidiKeyboard")
scene.collection.children.link(asset)
preview=bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(preview)

def move(o,collection=asset):
    for old in tuple(o.users_collection): old.objects.unlink(o)
    collection.objects.link(o)
    return o

def mat(name,color,rough=.6,metallic=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    s=m.node_tree.nodes.get("Principled BSDF")
    s.inputs["Base Color"].default_value=(*color,1)
    s.inputs["Roughness"].default_value=rough
    s.inputs["Metallic"].default_value=metallic
    return m

case=mat("C05_DustyPlumPolymer",(.16,.105,.175),.69)
ivory=mat("C05_WarmIvoryKeys",(.78,.73,.65),.54)
black=mat("C05_SatinBlackKeys",(.035,.032,.049),.46)
pad=mat("C05_MauveRubberPads",(.30,.19,.32),.92)
brass=mat("C05_ChampagneControls",(.52,.34,.21),.36,.62)
screen=mat("C05_OLEDDisplay",(.035,.14,.16),.24)
screen.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value=(.04,.65,.63,1)
screen.node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value=.5

def box(name,loc,dims,material,bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=move(bpy.context.object)
    o.name=name
    o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new("Softened edge","BEVEL")
        m.width,m.segments=bevel,2
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def cylinder(name,loc,radius,depth,material,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=move(bpy.context.object)
    o.name=name
    o.data.materials.append(material)
    for face in o.data.polygons: face.use_smooth=True
    return o

# Y-up local coordinates. Negative Z is the player-facing front, matching the
# C02 laptop/CRT mounting convention after the existing R3F import correction.
box("C05_SculptedCase",(0,.064,0),(1.55,.128,.47),case,.026)
box("C05_RecessedKeybed",(.12,.133,-.046),(1.30,.02,.343),black,.01)
box("C05_RearControlBar",(.13,.137,.187),(1.26,.026,.058),case,.009)

white_count=29
white_width=.043
white_start=-.49
for i in range(white_count):
    x=white_start+i*white_width
    box(f"C05_WhiteKey_{i+1:02d}",(x,.15,-.067),(.041,.035,.275),ivory,.003)

# Piano semitone order, four complete octaves: 5 black keys per octave.
for octave in range(4):
    for offset in (0,1,3,4,5):
        i=octave*7+offset
        x=white_start+(i+.5)*white_width
        box(f"C05_BlackKey_O{octave+1}_{offset}",(x,.172,.008),(.025,.047,.142),black,.003)

for row in range(2):
    for col in range(2):
        x=-.664+col*.083
        z=-.09+row*.095
        box(f"C05_VelocityPad_{row}_{col}",(x,.144,z),(.066,.02,.066),pad,.012)
for x,label in ((-.68,"Pitch"),(-.595,"Mod")):
    box(f"C05_{label}WheelPocket",(x,.14,.126),(.055,.012,.12),black,.009)
    wheel=cylinder(f"C05_{label}Wheel",(x,.161,.126),.029,.04,brass,32)
    wheel.rotation_euler[0]=math.pi/2
for i in range(8):
    x=-.35+i*.14
    cylinder(f"C05_Knob_{i+1}",(x,.168,.187),.018,.045,brass,24)
box("C05_OLEDInset",(.565,.162,.184),(.18,.004,.037),screen,.003)
for x in (-.69,.69):
    for z in (-.19,.19):
        box(f"C05_RubberFoot_{x}_{z}",(x,.006,z),(.11,.012,.052),black,.006)

root=bpy.data.objects.new("C05__MidiKeyboard_ROOT",None)
asset.objects.link(root)
for o in tuple(asset.objects):
    if o!=root: o.parent=root

def camera(name,loc,target,lens):
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

def area(name,loc,power,size,color):
    d=bpy.data.lights.new(name,"AREA")
    d.energy,d.shape,d.size,d.color=power,"DISK",size,color
    o=bpy.data.objects.new(name,d)
    preview.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector((0,.1,0))-o.location).to_track_quat("-Z","Y").to_euler()

area("Warm key",(-2,3,-2),650,4,(1,.84,.72))
area("Cool fill",(2,2,2),400,3,(.78,.83,1))
hero=camera("C05_ThreeQuarter",(1.75,1.3,-2.25),(0,.1,0),62)
front=camera("C05_Front",(0,.7,-2.6),(0,.1,0),60)
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.render.resolution_x=1100
scene.render.resolution_y=700
scene.view_settings.view_transform="AgX"
scene.world.color=(.5,.5,.5)
if os.environ.get("MOONROOM_C05_EXPORT_ONLY")!="1":
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

for material in (case,ivory,black,pad,brass,screen):
    objects=[o for o in asset.objects if o.type=="MESH" and o.data.materials and o.data.materials[0]==material]
    if len(objects)<2: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    objects[0].name="C05_Batched_"+material.name
bpy.ops.object.select_all(action="DESELECT")
for o in asset.objects: o.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/"optimized.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,
                          export_yup=True,export_apply=True,export_materials="EXPORT")
shutil.copyfile(glb,PUBLIC/"C05-midi-keyboard-review.glb")
print("C05_COMPLETE",glb)
