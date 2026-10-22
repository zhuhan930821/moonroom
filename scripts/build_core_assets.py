import bpy
import math
import os
import random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'models')
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.materials: bpy.data.materials.remove(block)

def mat(name, color, metallic=0, rough=.55, emission=None):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=.5
    if name == 'Dusty_Plum_Lacquer':
        p.inputs['Coat Weight'].default_value=.42; p.inputs['Coat Roughness'].default_value=.17
    return m

def cube(name, loc, scale, material, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Soft bevel','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(material); return o

def cyl(name, loc, radius, depth, material, rotation=(0,0,0), vertices=48, bevel=.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    o=bpy.context.object;o.name=name
    if bevel:
        mod=o.modifiers.new('Edge roll','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(material);bpy.ops.object.shade_smooth();return o

def uv(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=loc);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);bpy.ops.object.shade_smooth();return o

def torus(name, loc, major, minor, material, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=10,location=loc,rotation=rotation)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);bpy.ops.object.shade_smooth();return o

def empty(name, loc, scale=(1,1,1)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.scale=scale;return o

def add_head_texture(material):
    size=128; image=bpy.data.images.new('Cream_Head_Weave',width=size,height=size)
    pixels=[]; random.seed(41)
    for y in range(size):
        for x in range(size):
            weave=(math.sin(x*.72)+math.sin(y*.61))*.008
            grain=(random.random()-.5)*.018
            value=max(.72,min(.96,.86+weave+grain))
            pixels.extend((value,value*.94,value*.82,1))
    image.pixels.foreach_set(pixels); image.update(); image.pack()
    nodes=material.node_tree.nodes; links=material.node_tree.links; shader=nodes.get('Principled BSDF')
    texture=nodes.new('ShaderNodeTexImage'); texture.image=image; texture.interpolation='Linear'
    links.new(texture.outputs['Color'],shader.inputs['Base Color'])
    shader.inputs['Roughness'].default_value=.58
    shader.inputs['Sheen Weight'].default_value=.12

def cymbal_mesh(name, radius, material, segments=72, rings=16):
    verts=[]; faces=[]
    for side in (1,-1):
        for ring in range(rings+1):
            t=ring/rings; r=max(.035,radius*t)
            bell=.115*math.exp(-((t)/.17)**2)
            bow=.042*(t**1.6)-.020*(t**4)
            edge=-.018*max(0,(t-.88)/.12)**2
            y=bell+bow+edge+side*(.012-.007*t)
            for index in range(segments):
                angle=index*math.tau/segments
                verts.append((math.cos(angle)*r,y,math.sin(angle)*r))
    stride=segments; side_count=(rings+1)*segments
    for side in range(2):
        offset=side*side_count
        for ring in range(rings):
            for index in range(segments):
                nxt=(index+1)%segments; a=offset+ring*stride+index; b=offset+ring*stride+nxt; c=offset+(ring+1)*stride+nxt; d=offset+(ring+1)*stride+index
                faces.append((a,b,c,d) if side==0 else (d,c,b,a))
    for index in range(segments):
        nxt=(index+1)%segments
        faces.append((rings*stride+index,rings*stride+nxt,side_count+rings*stride+nxt,side_count+rings*stride+index))
    mesh=bpy.data.meshes.new(name+'_ProfileMesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(material)
    obj=bpy.data.objects.new(name+'_Disc',mesh); bpy.context.collection.objects.link(obj)
    bevel=obj.modifiers.new('Cymbal micro edge','BEVEL');bevel.width=.006;bevel.segments=2
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.shade_smooth();return obj

def export(name):
    path=os.path.join(OUT,name)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, export_extras=True)
    print('EXPORT',path)

def batch_drum_meshes():
    interactive={'Kick','Snare','Tom_One','Tom_Two','Floor_Tom','HiHat_Top','Crash','Ride'}
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH': continue
        bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):
            try: bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError: pass
    groups={}
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or not obj.data.materials: continue
        ancestor=obj.parent; root='Static'
        while ancestor:
            if ancestor.name in interactive: root=ancestor.name; break
            ancestor=ancestor.parent
        groups.setdefault((root,obj.data.materials[0].name),[]).append(obj)
    for (root,material),objects in groups.items():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        objects[0].name=f'{root}_{material}_Batch'

def build_crt():
    reset(); ivory=mat('CRT_Ivory',(0.72,.65,.51),0,.52); trim=mat('CRT_Trim',(.34,.30,.27),0,.45); dark=mat('CRT_Vents',(.10,.085,.08),0,.45); glass=mat('CRT_Glass',(.035,.09,.12),.05,.16,emission=(.08,.25,.3)); green=mat('Power_LED',(.15,.8,.42),0,.25,emission=(.1,1,.4))
    cube('CRT_Body',(0,1.18,0),(0.92,.76,.62),ivory,.12)
    cube('CRT_Face',(0,1.22,-.635),(.77,.61,.035),trim,.08)
    screen=cube('CRT_Screen',(0,1.25,-.681),(.66,.50,.012),glass,.12);screen['dynamic_screen']=True
    cube('CRT_Chin',(0,.64,-.58),(.83,.12,.13),ivory,.04)
    for x in (-.53,-.42,-.31): cyl('Button_'+str(x),(x,.65,-.72),.035,.025,dark,(0,0,0),24,.005)
    cyl('Power_LED_Node',(.62,.65,-.72),.032,.028,green,(0,0,0),24,.004)
    for i in range(8): cube('Vent_'+str(i),(-.55+i*.16,1.83,.32),(.052,.012,.32),dark,.008)
    cube('CRT_Stand',(0,.35,.05),(.48,.18,.38),ivory,.06); cube('CRT_Foot',(0,.13,.07),(.66,.07,.48),ivory,.04)
    cube('Tower',(1.65,.64,.05),(.57,.64,.56),ivory,.07); cube('TowerFront',(1.65,.64,-.52),(.48,.56,.025),trim,.035)
    cube('FloppySlot',(1.65,.82,-.555),(.32,.035,.012),dark,.008); cube('DriveSlot',(1.65,.51,-.555),(.30,.055,.012),dark,.008)
    cube('Keyboard',(0,.10,-1.28),(1.0,.07,.37),ivory,.055)
    for row in range(4):
        for col in range(13): cube(f'Key_{row}_{col}',(-.75+col*.125,.18,-1.48+row*.13),(.052,.025,.047),trim,.009)
    empty('Anchor_Computer',(0,1.25,-.72));empty('Collision_CRT',(0,1.0,0),(.95,1,.7)); export('vintage-crt.glb')

def drum_shell(name, loc, radius, depth, shell, chrome, skin, kind, rotation=(0,0,0), lugs=10):
    root=empty(name,loc)
    root.rotation_euler=rotation
    body=cyl(name+'_Shell',(0,0,0),radius,depth,shell,(0,0,0),64,.034);body.parent=root
    inner=torus(name+'_Bearing_Edge',(0,0,depth/2-.018),radius-.055,.022,chrome);inner.parent=root
    for z in (-depth/2,depth/2):
        hoop=torus(name+'_Hoop', (0,0,z),radius+.018,.018,chrome);hoop.parent=root
        head=cyl(name+'_Head_'+('Front' if z>0 else 'Back'),(0,0,z),radius-.035,.018,skin,(0,0,0),64,.004);head.parent=root
    for i in range(lugs):
        a=i*math.tau/lugs
        lug=cube(name+'_Lug_'+str(i),(math.sin(a)*radius,math.cos(a)*radius,0),(.028,.05,depth*.37),chrome,.009);lug.parent=root
        rod=cyl(name+'_Rod_'+str(i),(math.sin(a)*(radius+.018),math.cos(a)*(radius+.018),0),.009,depth+.07,chrome,(0,0,0),12,.002);rod.parent=root
        for z in (-depth*.34,depth*.34):
            washer=cyl(name+'_Tension_Washer',(math.sin(a)*(radius+.018),math.cos(a)*(radius+.018),z),.019,.018,chrome,(0,0,0),12,.003);washer.parent=root
    root['drum_kind']=kind;return root

def cymbal(name,loc,radius,gold,chrome):
    root=empty(name,loc);disk=cymbal_mesh(name,radius,gold);disk.parent=root
    felt=cyl(name+'_Felt',(0,.13,0),.055,.045,chrome,(math.pi/2,0,0),20,.008);felt.parent=root
    wing=cube(name+'_Wingnut',(0,.18,0),(.075,.018,.025),chrome,.012);wing.parent=root
    # Hardware is deliberately outside the animated cymbal root.
    x,y,z=loc
    cyl(name+'_Stand',(x,.64,z),.022,1.28,chrome,(math.pi/2,0,0),18,.006)
    cyl(name+'_UpperTube',(x,y-.33,z),.016,.64,chrome,(math.pi/2,0,0),16,.004)
    cyl(name+'_BoomArm',(x+( -.27 if x<0 else .27),y-.13,z),.016,.72,chrome,(0,math.pi/2,0),16,.004)
    uv(name+'_Tilter',(x,y-.08,z),(.065,.055,.065),chrome)
    for angle in (0,math.tau/3,2*math.tau/3):
        foot_x=x+math.sin(angle)*.34;foot_z=z+math.cos(angle)*.34
        leg=cyl(name+'_Tripod',(foot_x,.17,foot_z),.014,.72,chrome,(math.pi/2,0,-angle),12,.003);leg.rotation_euler.z+=math.sin(angle)*.16
    return root

def build_drums():
    reset(); shell=mat('Dusty_Plum_Lacquer',(.20,.018,.075),.26,.21); chrome=mat('Dark_Chrome',(.11,.13,.16),.90,.18); skin=mat('Warm_Cream_Heads',(.90,.81,.66),0,.58); add_head_texture(skin); gold=mat('Brushed_Bronze',(.62,.33,.07),.82,.27); seat=mat('Throne_Leather',(.055,.025,.07),0,.3); rubber=mat('Pedal_Rubber',(.035,.028,.04),.1,.65); logo=mat('Moon_Logo',(.12,.025,.15),.08,.42)
    drum_shell('Kick',(0,.72,-.18),.72,.78,shell,chrome,skin,'kick',(0,0,0),12)
    drum_shell('Snare',(-.92,1.00,.48),.46,.30,shell,chrome,skin,'snare',(math.pi/2,0,0),10)
    drum_shell('Tom_One',(-.43,1.49,-.12),.37,.40,shell,chrome,skin,'tom1',(-math.radians(76),0,0),8)
    drum_shell('Tom_Two',(.43,1.47,-.10),.41,.44,shell,chrome,skin,'tom2',(-math.radians(76),0,0),8)
    drum_shell('Floor_Tom',(1.15,1.00,.12),.53,.58,shell,chrome,skin,'floor',(math.pi/2,0,0),10)

    # Rack-tom mounting bridge above the bass drum.
    cyl('Tom_Mount_Bar',(0,1.18,-.18),.027,1.10,chrome,(0,0,0),18,.006)
    cyl('Tom_Mount_Left',(-.31,1.37,-.17),.024,.52,chrome,(math.pi/2,0,0),18,.005)
    cyl('Tom_Mount_Right',(.31,1.37,-.17),.024,.52,chrome,(math.pi/2,0,0),18,.005)

    # Floor-tom legs and snare basket make the kit read as supported hardware.
    for x,z in ((.78,-.1),(1.52,-.1),(1.16,.55)):
        leg=cyl('FloorTom_Leg',(x,.48,z),.018,.92,chrome,(math.pi/2,0,0),14,.004)
        leg.rotation_euler.z=(x-1.15)*.18
    cyl('Snare_Stand',(-.92,.52,.52),.024,.78,chrome,(math.pi/2,0,0),16,.005)
    for a in (0,math.tau/3,2*math.tau/3):
        cyl('Snare_Tripod',(-.92+math.sin(a)*.24,.16,.52+math.cos(a)*.24),.014,.52,chrome,(math.pi/2,0,-a),12,.003)

    cymbal('HiHat_Top',(-1.55,1.55,.12),.52,gold,chrome)
    # Bottom hi-hat cymbal, separated just enough to read as a pair.
    bottom=cymbal_mesh('HiHat_Bottom',.51,gold);bottom.location.y=-.075;bottom.rotation_euler.z=math.pi;bottom.parent=bpy.data.objects['HiHat_Top']
    cymbal('Crash',(-1.18,1.98,-.48),.66,gold,chrome)
    cymbal('Ride',(1.60,1.78,-.18),.73,gold,chrome)
    # Hi-hat pull rod, clutch and paired-cymbal spacer.
    cyl('HiHat_Pull_Rod',(-1.55,1.02,.12),.009,1.18,chrome,(math.pi/2,0,0),12,.002)
    cyl('HiHat_Clutch',(-1.55,1.61,.12),.045,.095,chrome,(math.pi/2,0,0),20,.008)

    # Moonroom emblem on the audience-facing bass-drum head.
    cyl('Kick_Moon_Logo',(0,.72,-.584),.27,.012,logo,(0,0,0),64,.003)
    cyl('Kick_Moon_Cut',(.11,.75,-.594),.235,.014,skin,(0,0,0),64,.003)
    for index,(x,y,s) in enumerate(((.28,.88,.055),(.38,.75,.038),(.25,.63,.032))):
        emblem=cube('Kick_Logo_Star_'+str(index),(x,y,-.605),(s,s,.012),logo,.006)
        emblem.rotation_euler.z=math.pi/4

    # Bass and hi-hat pedals with hinges, footboards and beaters.
    cube('Kick_Pedal_Base',(0,.08,.72),(.18,.025,.34),chrome,.025)
    cube('Kick_Pedal_Footboard',(0,.13,.80),(.13,.025,.25),rubber,.02)
    cube('Kick_Pedal_Heel',(0,.10,1.02),(.15,.045,.10),chrome,.025)
    cyl('Kick_Pedal_Axle',(0,.25,.50),.025,.42,chrome,(0,math.pi/2,0),16,.005)
    cyl('Kick_Pedal_Cam',(0,.29,.50),.095,.05,chrome,(0,math.pi/2,0),28,.01)
    for link in range(8): cube('Kick_Pedal_Chain',(0,.19+link*.025,.58+link*.026),(.025,.011,.016),chrome,.004)
    cyl('Kick_Pedal_Beater_Arm',(0,.48,.48),.015,.48,chrome,(math.pi/2,0,0),12,.003)
    uv('Kick_Pedal_Beater',(0,.72,.46),(.10,.055,.10),skin)
    cube('HiHat_Pedal',(-1.55,.10,.62),(.13,.025,.28),rubber,.022)
    cube('HiHat_Heel',(-1.55,.08,.87),(.145,.04,.09),chrome,.02)
    cyl('HiHat_Link',(-1.55,.38,.37),.012,.62,chrome,(math.pi/2,0,0),12,.003)

    cyl('Throne_Seat',(-.22,.52,1.38),.43,.16,seat,(math.pi/2,0,0),48,.05)
    cyl('Throne_Post',(-.22,.27,1.38),.045,.45,chrome,(math.pi/2,0,0),18,.008)
    for a in (0,math.tau/3,2*math.tau/3):
        leg=cyl('Throne_Leg',(-.22+math.sin(a)*.22,.08,1.38+math.cos(a)*.22),.022,.55,chrome,(math.pi/2,0,-a),18,.006)
    empty('Anchor_Drums',(-.22,1.2,1.0));empty('Collision_Drums',(0,1.1,0),(2.1,1.1,1.9)); batch_drum_meshes(); export('acoustic-drum-kit.glb')

def build_lounge():
    reset(); lavender=mat('Lavender_Fabric',(.48,.31,.58),0,.92); light=mat('Soft_Lilac',(.68,.49,.73),0,.96); pale=mat('Pearl_Pillow',(.82,.67,.82),0,.98); seam=mat('Piping',(.30,.16,.40),0,.8)
    parts=[('Lounge_Base',(0,.42,0),(1.65,.48,1.60),lavender),('Lounge_Seat',(0,.78,.20),(1.42,.42,1.25),light),('Lounge_Back',(0,1.25,-.92),(1.42,.72,.54),light),('Arm_Left',(-1.35,.78,.05),(.34,.45,1.28),lavender),('Arm_Right',(1.35,.78,.05),(.34,.45,1.28),lavender)]
    for name,loc,scale,material in parts:
        o=uv(name,loc,scale,material);o.rotation_euler.x=-.20 if name=='Lounge_Back' else 0
    for x in (-.62,.62):
        pillow=uv('Pillow', (x,.98,-.62),(.48,.27,.46),pale if x<0 else lavender);pillow.rotation_euler.z=.14*(-1 if x<0 else 1)
    for z in (-1.27,1.18): torus('Seat_Piping',(0,.72,z),1.17,.025,seam,(math.pi/2,0,0))
    for x in (-.72,0,.72):
        btn=uv('Tuft_Button',(x,1.27,-1.42),(.055,.055,.035),seam)
    empty('Anchor_Lounge',(0,1.0,.2));empty('Collision_Lounge',(0,.75,0),(1.68,.8,1.72)); export('reclining-lounge.glb')

target=os.environ.get('MOONROOM_ASSET_TARGET','all')
if target in ('all','crt'): build_crt()
if target in ('all','drums'): build_drums()
if target in ('all','lounge'): build_lounge()
