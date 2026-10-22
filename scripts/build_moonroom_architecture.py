"""Phase 1 architectural shell. Run: blender -b -P scripts/build_moonroom_architecture.py

Coordinates match src/config/scene.js: X across the room, Y up, Z toward the player.
The scene is deliberately exported separately; it is not installed in Three.js yet.
"""
import bpy
import math
import os
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets-source', 'architecture')
OUTPUT = os.path.join(ROOT, 'public', 'assets', 'models', 'architecture')
SHOTS = os.path.join(ROOT, 'screenshots', 'architecture-phase-1')
for directory in (SOURCE, OUTPUT, SHOTS):
    os.makedirs(directory, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection': bpy.data.collections.remove(collection)

def collection(name):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group

groups = {name: collection(name) for name in (
    'ARCH_01_Structure', 'ARCH_02_Floor', 'ARCH_03_Gothic_Windows',
    'ARCH_04_Wall_Detail', 'ARCH_05_West_Loft', 'ARCH_06_Zone_Trim',
    'PREVIEW_Only',
)}

def assign(obj, group, asset_id):
    for previous in list(obj.users_collection): previous.objects.unlink(obj)
    groups[group].objects.link(obj)
    obj['asset_id'] = asset_id
    return obj

def material(name, color, roughness=.7, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = (*color, 1)
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Metallic'].default_value = metallic
    return mat

plaster = material('Plaster_Rose_Lavender', (.41, .25, .39), .89)
plaster_light = material('Plaster_Dusty_Pink', (.59, .38, .51), .88)
plaster_shadow = material('Plaster_Deep_Alcove', (.26, .17, .31), .86)
walnut = material('Walnut_Warm', (.29, .15, .16), .58)
walnut_light = material('Walnut_Honey', (.44, .23, .20), .61)
walnut_dark = material('Walnut_Deep', (.20, .10, .15), .64)
oak_variants = [material(f'Floor_Oak_{i:02}', color, .64) for i, color in enumerate((
    (.19,.085,.09), (.22,.10,.10), (.25,.12,.11), (.18,.075,.085), (.27,.135,.12), (.21,.09,.09)))]
gilt = material('Aged_Champagne_Brass', (.55, .36, .22), .38, .55)
stone = material('Window_Stone_Rose', (.67, .46, .51), .72)
ceiling_mat = material('Ceiling_Amethyst', (.23, .15, .28), .9)

def box(name, center, size, mat, group, bevel=.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Rolled architectural edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(mat)
    return assign(obj, group, name)

def mesh(name, vertices, faces, mat, group):
    data = bpy.data.meshes.new(name + '_Mesh')
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    groups[group].objects.link(obj)
    obj.data.materials.append(mat)
    obj['asset_id'] = name
    return obj

def polyline(name, points, radius, mat, group, cyclic=False):
    data = bpy.data.curves.new(name + '_Curve', 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, xyz in zip(spline.points, points): point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    groups[group].objects.link(obj)
    data.materials.append(mat)
    obj['asset_id'] = name
    return obj

def arch_y(x, width, t):
    return 4.05 + 3.45 * math.sqrt(max(0, 1 - t*t))

# An actual perforated back wall: three open Gothic arches, not a sky poster.
arches = [(-5.25, 4.6), (0.0, 4.85), (5.25, 4.6)]
box('ARCH_Floor_Substrate', (0,-.15,0), (20,.30,16), walnut_dark, 'ARCH_01_Structure')
box('ARCH_Ceiling_Slab', (0,8.11,0), (20,.22,16), ceiling_mat, 'ARCH_01_Structure')
box('ARCH_West_Wall', (-10.08,4,0), (.24,8,16), plaster, 'ARCH_01_Structure')
box('ARCH_East_Wall', (10.08,4,0), (.24,8,16), plaster, 'ARCH_01_Structure')
box('ARCH_Entry_Wall_West', (-5.55,4,8.08), (8.9,8,.24), plaster, 'ARCH_01_Structure')
box('ARCH_Entry_Wall_East', (5.55,4,8.08), (8.9,8,.24), plaster, 'ARCH_01_Structure')
box('ARCH_Entry_Wall_Above_Door', (0,5.45,8.08), (2.2,5.1,.24), plaster, 'ARCH_01_Structure')
for side, x in [('West',-1.16),('East',1.16)]:
    box(f'ARCH_Entry_Door_Jamb_{side}', (x,1.46,7.84), (.16,2.92,.28), walnut_light, 'ARCH_04_Wall_Detail', .025)
box('ARCH_Entry_Door_Lintel', (0,2.95,7.84), (2.48,.16,.28), walnut_light, 'ARCH_04_Wall_Detail', .025)

back_z = -7.81
last_right = -10.0
for index, (x, width) in enumerate(arches):
    left, right = x-width/2, x+width/2
    box(f'ARCH_Back_Pier_{index}', ((last_right+left)/2,4,back_z), (left-last_right,8,.42), plaster, 'ARCH_01_Structure')
    box(f'ARCH_Window_Sill_{index}', (x,.22,back_z+.16), (width+.34,.44,.70), stone, 'ARCH_03_Gothic_Windows', .055)
    vertices, faces = [], []
    segments = 32
    for i in range(segments+1):
        xx = left + width*i/segments
        tt = (xx-x)/(width/2)
        yy = arch_y(x,width,tt)
        vertices.extend(((xx, yy, back_z-.22), (xx,8,back_z-.22), (xx,yy,back_z+.22), (xx,8,back_z+.22)))
    for i in range(segments):
        a=i*4; b=(i+1)*4
        faces.extend(((a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)))
    mesh(f'ARCH_Window_Spanderel_{index}', vertices, faces, plaster, 'ARCH_01_Structure')
    # Layered three-dimensional stone architrave, continuous around the opening.
    outline = [(left,.42,-7.47),(left,4.05,-7.47)]
    outline += [(left+width*i/48,arch_y(x,width,-1+2*i/48),-7.47) for i in range(1,49)]
    outline += [(right,.42,-7.47)]
    polyline(f'ARCH_Arch_Stone_{index}', outline, .13, stone, 'ARCH_03_Gothic_Windows')
    inset = [(px, py, -7.36) for px,py,_ in outline]
    polyline(f'ARCH_Arch_Gilt_{index}', inset, .032, gilt, 'ARCH_03_Gothic_Windows')
    for side, xx in [('L',left),('R',right)]:
        box(f'ARCH_Jamb_{index}_{side}', (xx,2.07,-7.49), (.30,4.14,.50), stone, 'ARCH_03_Gothic_Windows', .038)
        for offset in (-.08,.08):
            box(f'ARCH_Jamb_Flute_{index}_{side}_{offset}', (xx+offset,2.15,-7.19), (.024,3.75,.025), gilt, 'ARCH_03_Gothic_Windows', .008)
        box(f'ARCH_Jamb_Capital_{index}_{side}', (xx,4.13,-7.48), (.48,.16,.63), stone, 'ARCH_03_Gothic_Windows', .025)
    last_right = right
box('ARCH_Back_Pier_End', ((last_right+10)/2,4,back_z), (10-last_right,8,.42), plaster, 'ARCH_01_Structure')

# Mitered floorboards and architectural joinery create material rhythm.
floor_vertices, floor_faces, floor_materials = [], [], []
for row in range(48):
    z = -7.84 + row*(15.7/48)
    offset = .52 if row%2 else 0
    for col in range(16):
        x = -10 + col*1.25 + offset
        if x > 9.92: continue
        width = min(1.23, 10-x)
        if width <= .08: continue
        a=len(floor_vertices)
        floor_vertices.extend(((x,.008,z),(x+width,.008,z),(x+width,.008,z+.313),(x,.008,z+.313)))
        floor_faces.append((a,a+1,a+2,a+3))
        floor_materials.append((row*7+col*3)%6)
floor = mesh('ARCH_Oak_Plank_Field',floor_vertices,floor_faces,oak_variants[0],'ARCH_02_Floor')
for variant in oak_variants[1:]: floor.data.materials.append(variant)
for polygon, index in zip(floor.data.polygons, floor_materials): polygon.material_index=index
for x in (-9.8,9.8):
    box(f'ARCH_Floor_Edge_X_{x}', (x,.055,0), (.18,.10,15.5), walnut_dark, 'ARCH_02_Floor', .015)
for z in (-7.7,7.7):
    box(f'ARCH_Floor_Edge_Z_{z}', (0,.055,z), (19.6,.10,.18), walnut_dark, 'ARCH_02_Floor', .015)

# West/east wall paneling; these are wall relief, not stand-in furniture.
for wall, xx, sign in [('West',-9.91,1),('East',9.91,-1)]:
    for z in (-6.25,-3.75,-1.25,1.25,3.75,6.25):
        box(f'ARCH_{wall}_Panel_{z}', (xx,1.44,z), (.045,2.12,2.18), plaster_light, 'ARCH_04_Wall_Detail', .035)
        for yy in (.42,2.47):
            box(f'ARCH_{wall}_Panel_Rail_{z}_{yy}', (xx+sign*.045,yy,z), (.055,.06,2.21), walnut_light, 'ARCH_04_Wall_Detail', .012)
        for zz in (z-1.08,z+1.08):
            box(f'ARCH_{wall}_Panel_Stile_{z}_{zz}', (xx+sign*.045,1.44,zz), (.055,2.1,.06), walnut_light, 'ARCH_04_Wall_Detail', .012)
    box(f'ARCH_{wall}_Chair_Rail', (xx+sign*.08,2.72,0), (.09,.12,15.6), walnut_light, 'ARCH_04_Wall_Detail', .02)
    box(f'ARCH_{wall}_Baseboard', (xx+sign*.11,.25,0), (.13,.32,15.7), walnut_dark, 'ARCH_04_Wall_Detail', .02)
    box(f'ARCH_{wall}_Crown', (xx+sign*.10,7.79,0), (.16,.22,15.8), walnut_light, 'ARCH_04_Wall_Detail', .028)

# Ceiling beams and cove trim frame the vista without blocking the three windows.
for x in (-9.3,-6.5,-3.25,0,3.25,6.5,9.3):
    box(f'ARCH_Ceiling_Beam_{x}', (x,7.76,0), (.20,.36,15.55), walnut, 'ARCH_04_Wall_Detail', .035)
for z in (-6.9,-3.45,0,3.45,6.9):
    box(f'ARCH_Ceiling_Crossbeam_{z}', (0,7.78,z), (19.55,.31,.20), walnut_light, 'ARCH_04_Wall_Detail', .035)
for xx in (-9.4,9.4):
    for zz in (-6.9,6.9):
        box(f'ARCH_Ceiling_Corner_{xx}_{zz}', (xx,7.67,zz), (.32,.12,.32), gilt, 'ARCH_04_Wall_Detail', .03)

# Left-side sleeping loft mirrors the reference's upper-left spatial mass.
# Its entire footprint is above/behind the existing drum's walkable region.
box('ARCH_West_Loft_Deck', (-7.95,4.18,4.25), (3.68,.22,7.15), walnut_dark, 'ARCH_05_West_Loft', .045)
box('ARCH_West_Loft_Soffit', (-7.95,4.00,4.25), (3.52,.08,7.0), walnut_light, 'ARCH_05_West_Loft', .02)
for z in (.78,2.13,3.48,4.83,6.18,7.52):
    box(f'ARCH_Loft_Joist_{z}', (-7.90,3.91,z), (3.55,.18,.13), walnut, 'ARCH_05_West_Loft', .02)
box('ARCH_Loft_Front_Rail', (-6.08,5.30,4.25), (.13,.12,7.15), walnut_light, 'ARCH_05_West_Loft', .025)
for z in (1.02,1.76,2.50,3.24,3.98,4.72,5.46,6.20,6.94,7.48):
    box(f'ARCH_Loft_Baluster_{z}', (-6.08,4.76,z), (.07,1.1,.07), walnut, 'ARCH_05_West_Loft', .012)
for z in (.82,7.53):
    box(f'ARCH_Loft_End_Post_{z}', (-6.08,4.84,z), (.16,1.42,.16), walnut_dark, 'ARCH_05_West_Loft', .022)

# Subtle inlaid floor thresholds mark zones without moving any existing furniture.
for name, points in (
    ('Workspace', [(-4.45,-5.55),(4.45,-5.55),(4.45,-2.9),(-4.45,-2.9)]),
    ('Lounge', [(-.6,1.1),(5.55,1.1),(5.55,6.35),(-.6,6.35)]),
):
    polyline(f'ARCH_{name}_Floor_Inlay', [(x,.063,z) for x,z in points], .016, gilt, 'ARCH_06_Zone_Trim', True)

# Review-only labels make the immutable gameplay anchors explicit in the blend.
for name, center, radius in (
    ('Drum_keep_existing',(-7.1,.10,-2.8),2.2),
    ('CRT_keep_interaction',(-2.65,.10,-4.25),.72),
    ('Desk_keep_layout',(.1,.10,-4.25),3.9),
    ('Beanbag_keep_layout',(1.3,.10,3.0),1.7),
    ('Bed_keep_layout',(7.15,.10,3.0),2.3),
):
    points=[(center[0]+math.cos(i*math.tau/64)*radius,center[1],center[2]+math.sin(i*math.tau/64)*radius) for i in range(64)]
    guide=polyline('PREVIEW_'+name,points,.022,gilt,'PREVIEW_Only',True)
    guide.hide_render=True

# Warm/cool review rig. Lights/camera are saved in the blend but excluded from GLB.
world=bpy.data.worlds.new('Moonroom_Review_World')
bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.25,.22,.34,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
def area(name,location,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);groups['PREVIEW_Only'].objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector((0,2,-3))-obj.location).to_track_quat('-Z','Y').to_euler()
area('PREVIEW_Moonlight',(0,6,-9),2400,(.60,.72,1.0),8)
area('PREVIEW_Warm_West',(-8,5,0),1700,(1.0,.55,.34),6)
area('PREVIEW_Warm_East',(8,5,1),1300,(1.0,.65,.42),6)

def camera(name, location, target, lens):
    data=bpy.data.cameras.new(name);data.lens=lens
    obj=bpy.data.objects.new(name,data);groups['PREVIEW_Only'].objects.link(obj)
    obj.location=location
    forward=(Vector(target)-obj.location).normalized()
    right=forward.cross(Vector((0,1,0))).normalized()
    up=right.cross(forward).normalized()
    obj.rotation_euler=Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
    return obj

cameras={
    'front_wide':camera('PREVIEW_Camera_Front',(0,1.68,5.7),(0,2.56,-5.2),15.6),
    'west_drum_context':camera('PREVIEW_Camera_West',(-3.7,2.0,5.8),(-5.4,3.1,-5.2),33),
    'east_lounge_context':camera('PREVIEW_Camera_East',(5.5,2.0,6.2),(3.4,3.1,-5.2),34),
}

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1280
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.camera=cameras['front_wide']
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'moonroom-architecture-phase1.blend'))

for group in groups.values():
    for obj in group.objects:
        obj.select_set(group.name!='PREVIEW_Only')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUTPUT,'moonroom-architecture-phase1.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_extras=True)

print('COMPLETE',len([o for o in bpy.data.objects if o.type=='MESH']),'meshes')
print('Run scripts/render_moonroom_architecture_review.py for neutral-layout renders.')
