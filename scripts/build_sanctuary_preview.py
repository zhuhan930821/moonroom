"""Standalone Blender preview of the proposed sofa/bed; does not export to the game."""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots/sanctuary-preview';OUT.mkdir(parents=True,exist_ok=True)
BLEND=ROOT/'assets-source/lounge/moonroom-sanctuary-preview.blend'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
SOFA=collection('MR_SOFA_LazyCloud');BED=collection('MR_BED_MoonNest');STAGE=collection('PREVIEW_Only')
def move(o,c):
    for old in list(o.users_collection):old.objects.unlink(o)
    c.objects.link(o);return o
def mat(name,color,rough=.94):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if name not in ('Preview_WarmTimber','Tailoring_Seam'):
        tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=165 if name.startswith('Sofa') else 105
        tex.inputs['Detail'].default_value=2
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.11;bump.inputs['Distance'].default_value=.012
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
rose=mat('Sofa_DustyRose_Chenille',(.61,.38,.46));blush=mat('Sofa_WarmBlush_Chenille',(.78,.56,.59));mauve=mat('Sofa_MutedMauve_Chenille',(.60,.45,.60))
throw=mat('Sofa_FuzzyThrow',(.67,.53,.71));ivory=mat('Bed_CreamyIvory_Cotton',(.88,.82,.73));sheet=mat('Bed_PaleBlush_Linen',(.85,.71,.72));duvet=mat('Bed_SoftLavender_Duvet',(.70,.65,.80));knit=mat('Bed_DustyPurple_Knit',(.51,.42,.61));ground=mat('Preview_WarmTimber',(.32,.23,.26));seam=mat('Tailoring_Seam',(.42,.30,.37))

def block(name,loc,dims,material,c,bevel=.16,shape=0,seed=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('Tailored soft corners','BEVEL');b.width=bevel;b.segments=5;bpy.ops.object.modifier_apply(modifier=b.name)
    s=o.modifiers.new('Cloth-soft subdivision','SUBSURF');s.levels=2;bpy.ops.object.modifier_apply(modifier=s.name)
    for v in o.data.vertices:
        x,y,z=v.co
        nx=x/max(.01,dims[0]);nz=z/max(.01,dims[2])
        envelope=max(0,1-2*abs(nx))*max(0,1-2*abs(nz))
        v.co.y += shape*(.58*math.sin(7*nx+seed)+.36*math.cos(9*nz-seed)+.28*math.sin(13*nx+8*nz+seed))*envelope
        v.co.x += .018*math.sin(z*4+y*11+seed)*(1-abs(nx))
        v.co.z += .014*math.sin(x*5+y*8+seed)*(1-abs(nz))
    for p in o.data.polygons:p.use_smooth=True
    o.data.materials.append(material);return move(o,c)
def line(name,points,material,c,r=.006):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for p,xyz in zip(sp.points,points):p.co=(*xyz,1)
    o=bpy.data.objects.new(name,cu);c.objects.link(o);cu.materials.append(material);return o
def cloth(name,origin,width,depth,height,material,c,rows=28,cols=28,phase=0,front_drape=0):
    verts=[];faces=[];ox,oy,oz=origin
    for j in range(rows):
        t=j/(rows-1)
        for i in range(cols):
            u=i/(cols-1)
            x=ox+(u-.5)*width+.022*math.sin(t*11+phase)
            z=oz+(t-.5)*depth
            wrinkle=.035*math.sin(u*26+t*6+phase)+.055*math.sin(u*12-t*17+phase)
            billow=height*(.5+.5*math.sin(u*math.pi))*(.55+.45*math.cos(t*math.pi))
            y=oy+billow+wrinkle
            if front_drape and t>.75:y-=front_drape*((t-.75)/.25)**1.4
            verts.append((x,y,z))
    for j in range(rows-1):
        for i in range(cols-1):
            a=j*cols+i;faces.append((a,a+1,a+cols+1,a+cols))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);c.objects.link(o);mesh.materials.append(material)
    solid=o.modifiers.new('Real fabric thickness','SOLIDIFY');solid.thickness=.055 if 'Duvet' in name else .035
    sub=o.modifiers.new('Relaxed fabric folds','SUBSURF');sub.levels=1
    for p in mesh.polygons:p.use_smooth=True
    return o

# Sofa center (1.3, 0, 3.0), approximate footprint 3.45 x 2.65 m.
sx,sz=1.3,3.0
block('Sofa_Upholstered_Sagging_Frame',(sx,.27,sz),(3.36,.41,2.47),rose,SOFA,.22,.025,2)
block('Sofa_Deep_Seat_Bed',(sx,.54,sz+.14),(3.13,.34,2.17),blush,SOFA,.22,.07,5)
for i,(x,z,w) in enumerate([(-1.03,.13,1.04),(.02,.20,1.05),(1.06,.09,1.04)]):
    o=block(f'Sofa_Slouched_Seat_{i+1}',(sx+x,.72,sz+z),(w,.43,2.00),blush if i!=1 else rose,SOFA,.19,.10,i*4)
    o.rotation_euler.y=(i-1)*.032
    line(f'Sofa_Seat_Crease_{i+1}',[(sx+x-w*.43,.73,sz+z+.76),(sx+x,.69,sz+z+.84),(sx+x+w*.43,.74,sz+z+.75)],seam,SOFA)
for side in (-1,1):
    o=block(f'Sofa_Soft_Outward_Arm_{side}',(sx+side*1.54,.71,sz+.05),(.52,.75,2.35),rose,SOFA,.22,.075,side*3)
    o.rotation_euler.z=-side*.075
block('Sofa_Back_Continuous_Base',(sx,.88,sz-1.06),(3.0,.9,.36),rose,SOFA,.16,.03,3)
for i,(x,y,z,w,h) in enumerate([(-1.11,1.18,-.99,.82,.79),(-.43,1.27,-1.00,.88,.93),(.30,1.14,-.96,.88,.79),(1.03,1.22,-.99,.84,.87)]):
    o=block(f'Sofa_Crowded_Back_Pillow_{i+1}',(sx+x,y,sz+z),(w,h,.48),[blush,rose,mauve,blush][i],SOFA,.19,.095,i*7)
    o.rotation_euler.y=[-.08,.04,-.06,.07][i];o.rotation_euler.x=-.13
# A throw starts on the back, spreads over the seat and hangs over the front.
cloth('Sofa_Fluffy_Throw_Back',(sx+.51,1.57,sz-.69),1.56,.65,.07,throw,SOFA,phase=2)
cloth('Sofa_Fluffy_Throw_Seat',(sx+.55,1.04,sz+.31),1.68,1.74,.10,throw,SOFA,phase=2.7,front_drape=.53)
for i,(x,y,z,d,m) in enumerate([(-1.05,1.04,-.46,(.54,.46,.28),mauve),(.87,1.07,-.48,(.48,.44,.26),blush),(-.16,.99,-.40,(.44,.38,.27),rose),(1.13,.94,.17,(.38,.32,.26),mauve)]):
    o=block(f'Sofa_Buried_Pillow_{i+1}',(sx+x,y,sz+z),d,m,SOFA,.13,.04,i*10);o.rotation_euler.y=.13*(i-1)

# Bed remains in the right zone, behind the sofa in the main-camera composition.
bx,bz=7.15,2.8
block('Bed_Low_Upholstered_Frame',(bx,.28,bz),(4.67,.51,6.06),ivory,BED,.22,.03,31)
block('Bed_Soft_Mattress',(bx,.71,bz),(4.42,.43,5.82),ivory,BED,.20,.05,34)
block('Bed_Enveloping_Headboard',(bx,1.05,bz-2.87),(4.58,1.50,.43),duvet,BED,.20,.06,36)
block('Bed_Visible_Wrinkled_Sheet',(bx,.96,bz+.03),(4.34,.12,5.67),sheet,BED,.09,.055,39)
block('Bed_Airy_Duvet_Core',(bx,1.11,bz+.77),(4.28,.37,4.12),duvet,BED,.22,.15,43)
cloth('Bed_Thick_Duvet_Folds',(bx,1.32,bz+.70),4.15,4.28,.21,duvet,BED,phase=1.8,front_drape=.22)
cloth('Bed_Thin_Thrown_Knit',(bx+.10,1.39,bz+2.06),4.19,1.22,.07,knit,BED,phase=3.4,front_drape=.26)
for i,(x,z,w,h,d,m) in enumerate([(-1.36,-2.08,1.34,.42,.83,ivory),(.05,-2.20,1.34,.44,.85,sheet),(1.36,-2.08,1.27,.42,.82,ivory),(-.76,-1.57,.93,.34,.75,duvet),(.57,-1.51,.95,.36,.74,sheet)]):
    o=block(f'Bed_Nested_Pillow_{i+1}',(bx+x,1.24+i*.015,bz+z),(w,h,d),m,BED,.16,.08,50+i*5)
    o.rotation_euler.y=[-.08,.05,-.04,.12,-.11][i]

# Neutral showroom-free review stage. Existing architecture is not altered.
block('Preview_Floor',(3.4,-.20,2.7),(14,.18,11),ground,STAGE,.05)
world=bpy.data.worlds.new('Warm_Moonlight_Review');bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.16,.24,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
def area(name,loc,color,energy,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);STAGE.objects.link(o);o.location=loc;o.rotation_euler=(Vector((4,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm_large_softbox',(1,8,9),(1,.70,.56),1800,9)
area('Cool_moon_fill',(8,6,-4),(.54,.65,1),1300,8)
def render(name,loc,target,ortho=None):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);STAGE.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=ortho or 10
    bpy.context.scene.camera=o;bpy.context.scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
BLEND.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
render('01_sofa_bed_main',(3.7,5.1,11.9),(4.0,.7,2.1),14)
render('02_sofa_45',(-1.6,2.9,7.1),(1.3,.75,3.0),6.8)
render('03_bed_45',(10.3,3.6,8.0),(7.15,1.0,2.8),8.7)
render('04_top_layout',(3.5,14,2.7),(3.5,0,2.7),14)
print('Preview saved:',BLEND,OUT)
