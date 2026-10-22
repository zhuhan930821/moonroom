"""Build the standalone Moonroom Cloud Sofa. Run with Blender --background --python."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-source/lounge/cloud-sofa.blend'
OUTPUT = ROOT / 'public/assets/models/lounge/cloud-sofa.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=0.94, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    if name.startswith(('Boucle_', 'Knit_')):
        # Exportable, small baked weave: subtle tonal fibres rather than a
        # procedural Blender node that would disappear from the GLB.
        size=256
        img=bpy.data.images.new(name+'_Weave',width=size,height=size,alpha=True)
        pixels=[]
        for y in range(size):
            for x in range(size):
                warp=math.sin(x*.71+math.sin(y*.14))*.014
                weft=math.sin(y*.86+math.sin(x*.11))*.012
                fleck=math.sin(x*2.31+y*1.71)*math.sin(x*.39-y*2.17)*.008
                shade=max(.88,min(1.08,1+warp+weft+fleck))
                pixels.extend((min(1,color[0]*shade),min(1,color[1]*shade),min(1,color[2]*shade),1))
        img.pixels[:]=pixels;img.pack()
        texture=m.node_tree.nodes.new('ShaderNodeTexImage');texture.image=img
        m.node_tree.links.new(texture.outputs['Color'],p.inputs['Base Color'])
    return m

cream = material('Boucle_Cream_Pink', (.79,.61,.64))
rose = material('Boucle_Dusty_Rose', (.70,.47,.55))
lilac = material('Boucle_Pale_Lilac', (.72,.62,.76))
shadow = material('Fabric_Seam_Shadow', (.48,.35,.45))
blanket = material('Knit_Pink_Lilac', (.58,.43,.68))
thread = material('Knit_Edge', (.76,.63,.79))
gold = material('Champagne_Embroidery', (.84,.67,.38), .55, .35)

def soft_block(name, loc, dims, mat, bevel=.16, subs=2, seed=0, depression=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name
    o.dimensions=dims; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Tailored rounded corners','BEVEL');mod.width=bevel;mod.segments=5
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Soft upholstery','SUBSURF');mod.levels=subs;mod.render_levels=subs
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for v in o.data.vertices:
        x,y,z=v.co
        # A subtle, non-repeating contour breaks the manufactured pillow silhouette.
        fall=max(0,1-abs(x)/(dims[0]*.52))*max(0,1-abs(y)/(dims[1]*.56))
        if z>0: v.co.z -= depression*fall
        v.co.z += .009*math.sin(x*7.1+y*3.8+seed)*math.sin(y*5.3+seed)
        v.co.x += .008*math.sin(y*9+z*6+seed)
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def curve(name, points, mat, radius=.009, cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12
    s=data.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    s.use_cyclic_u=cyclic;data.bevel_depth=radius;data.bevel_resolution=2
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    return o

# A genuinely low upholstered frame, visible in front, behind and below.
soft_block('CS_Hidden_Platform',(0,.28,0),(3.23,.42,2.22),rose,.15,2,1)
soft_block('CS_Lower_Apron',(0,.34,1.04),(2.85,.35,.18),cream,.07,1,2)
for side in (-1,1):
    soft_block(f'CS_Low_Arm_{side}',(side*1.49,.68,.02),(.43,.69,2.32),cream,.18,2,side)
    # Lower back continues around both ends rather than becoming a flat façade.
    soft_block(f'CS_Arm_Inner_{side}',(side*1.31,.75,-.12),(.16,.33,1.95),rose,.07,1,side+5)
soft_block('CS_Back_Frame',(0,.76,-.92),(2.86,1.05,.39),rose,.14,2,3)

# Three separate, wide seats with small spacing and relaxed asymmetry.
for i,(x,y,z,w,d,rot) in enumerate([(-.92,.72,.13,.94,1.72,-.014),(0,.69,.16,.97,1.76,.018),(.94,.73,.11,.94,1.71,-.012)]):
    o=soft_block(f'CS_Seat_Cushion_{i+1}',(x,y,z),(w,.39,d),cream if i!=1 else lilac,.135,2,i*2,.045)
    o.rotation_euler.z=rot
    # Welting follows each cushion edge; it is a seam, not an ornamental ring.
    pts=[]
    for j in range(33):
        a=2*math.pi*j/32
        pts.append((x+(w*.45)*math.cos(a),y-.035,z+(d*.45)*math.sin(a)))
    curve(f'CS_Seat_Welting_{i+1}',pts,rose,.007,True)

# Four upright back cushions, slightly staggered and leaning onto the seat.
for i,x in enumerate((-.99,-.33,.33,.99)):
    o=soft_block(f'CS_Back_Cushion_{i+1}',(x,1.14,-.83+(i%2)*.035),(.71,.83,.35),cream if i%2==0 else lilac,.12,2,9+i,.025)
    o.rotation_euler.x=-.16+(i%2)*.025
    curve(f'CS_Back_Seam_{i+1}',[(x-.30,1.37,-.60),(x-.30,.96,-.56),(x+.30,.96,-.56),(x+.30,1.37,-.60)],rose,.006)

# A loose blanket drapes over the right arm and falls in irregular folds.
verts=[];faces=[];cols=15;rows=16
for j in range(rows):
    t=j/(rows-1)
    for i in range(cols):
        u=i/(cols-1)
        x=1.09+u*.78+.025*math.sin(t*8+u*4)
        y=1.04-t*.59 + .035*math.sin(u*math.pi*4+t*2)
        z=.22+(u-.5)*.70+.035*math.sin(t*9+u*5)
        if u>.46:y-=max(0,t-.32)*.23
        verts.append((x,y,z))
for j in range(rows-1):
    for i in range(cols-1):
        a=j*cols+i;faces.append((a,a+1,a+1+cols,a+cols))
mesh=bpy.data.meshes.new('CS_Blanket_Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('CS_Draped_Knit_Blanket',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(blanket)
solid=obj.modifiers.new('Knitted thickness','SOLIDIFY');solid.thickness=.016
for j in range(rows-1):
    curve(f'CS_Blanket_Edge_{j:02d}',[verts[j*cols],verts[(j+1)*cols]],thread,.004)

# Two distinctly shaped accent cushions: moon crescent and star, kept small.
soft_block('CS_Moon_Pillow',( -1.04,1.12,-.43),(.43,.43,.19),lilac,.10,2,26)
curve('CS_Moon_Embroidery',[(-1.11,1.27,-.30),(-1.16,1.18,-.30),(-1.11,1.08,-.30),(-.99,1.02,-.30),(-1.05,1.12,-.30),(-1.02,1.22,-.30)],gold,.008)
soft_block('CS_Star_Pillow',(.62,1.10,-.42),(.43,.42,.19),rose,.10,2,29)
star=[]
for j in range(10):
    a=math.pi/2+j*math.pi/5;r=.105 if j%2==0 else .045
    star.append((.62+r*math.cos(a),1.10+r*math.sin(a),-.294))
curve('CS_Star_Embroidery',star,gold,.007,True)

# Named interaction anchor retained in the model; gameplay ID remains beanbag.
anchor=bpy.data.objects.new('Anchor_Lounge',None);bpy.context.collection.objects.link(anchor);anchor.location=(0,1.1,.55)

SOURCE.parent.mkdir(parents=True,exist_ok=True);OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',export_apply=True)
print('Saved',SOURCE,OUTPUT)
