"""Build the Blender-authored visible botanical and small lighting fixtures.

Coordinates are read from the existing R3F room. Blender Z-up positions are
converted from the game's Y-up coordinates at each placement. This asset does
not contain real-time lights: Three.js owns their illumination and controls.
"""

import bpy
import math
import os
import random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets-source', 'room-dressing')
OUT_GLB = os.path.join(ROOT, 'public', 'assets', 'models', 'decor', 'room-dressing.glb')
SEED = 2409
rng = random.Random(SEED)


def game(x, y, z):
    return Vector((x, -z, y))


def mat(name, rgb, rough=.75, metal=0, emission=None):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    node = material.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = rough
    node.inputs['Metallic'].default_value = metal
    if emission:
        node.inputs['Emission Color'].default_value = (*emission[0], 1)
        node.inputs['Emission Strength'].default_value = emission[1]
    return material


def collect(obj, group):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    group.objects.link(obj)
    return obj


def mesh(name, vertices, faces, material, group, smooth=True):
    data = bpy.data.meshes.new(name + '_Mesh')
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    data.materials.append(material)
    if smooth:
        for face in data.polygons:
            face.use_smooth = True
    return obj


def lathe(name, x, y, z, profile, material, group, segments=32):
    vertices = []
    for radius, height in profile:
        for j in range(segments):
            angle = 2 * math.pi * j / segments
            vertices.append((x + radius * math.cos(angle), y + radius * math.sin(angle), z + height))
    faces = []
    for ring in range(len(profile) - 1):
        for j in range(segments):
            a = ring * segments + j
            b = ring * segments + (j + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    return mesh(name, vertices, faces, material, group)


def curve(name, points, radius, material, group):
    data = bpy.data.curves.new(name + '_Curve', 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 14
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for knot, point in zip(spline.bezier_points, points):
        knot.co = point
        knot.handle_left_type = 'AUTO'
        knot.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    data.materials.append(material)
    return obj


def leaf(name, base, direction, length, width, material, group):
    forward = Vector(direction).normalized()
    lateral = Vector((-forward.y, forward.x, 0)).normalized()
    if lateral.length < .1:
        lateral = Vector((1, 0, 0))
    verts = []
    steps = 9
    for i in range(steps + 1):
        t = i / steps
        center = Vector(base) + forward * length * t + Vector((0, 0, math.sin(math.pi * t) * length * .07))
        half = width * (math.sin(math.pi * t) ** .82) * (.8 + .2 * t)
        for side in (-1, 0, 1):
            point = center + lateral * half * side + Vector((0, 0, -.12 * half * abs(side)))
            verts.append(point)
    faces = []
    for i in range(steps):
        for j in range(2):
            a = i * 3 + j
            faces.append((a, a + 1, a + 4, a + 3))
    obj = mesh(name, verts, faces, material, group)
    modifier = obj.modifiers.new('Leaf thickness', 'SOLIDIFY')
    modifier.thickness = .006
    return obj


def flower(name, center, radius, petals, pale, gold, group):
    center = Vector(center)
    for k in range(petals):
        angle = 2 * math.pi * k / petals
        outward = Vector((math.cos(angle), math.sin(angle), .13))
        tangent = Vector((-math.sin(angle), math.cos(angle), 0))
        vertices = []
        for i in range(6):
            t = i / 5
            spine = center + outward * (radius * t) + Vector((0, 0, .022 * math.sin(math.pi * t)))
            spread = radius * .37 * math.sin(math.pi * t)
            for s in (-1, 0, 1):
                vertices.append(spine + tangent * spread * s)
        faces = []
        for i in range(5):
            for j in range(2):
                a = i * 3 + j
                faces.append((a, a + 1, a + 4, a + 3))
        mesh(f'{name}_Petal_{k:02}', vertices, faces, pale, group)
    lathe(name + '_Stamen', center.x, center.y, center.z,
          [(.012, -.009), (.024, 0), (.018, .02), (.002, .025)], gold, group, 12)


def potted_plant(index, loc, scale, leaf_mats, ceramic, soil, stem, petals, gold, group):
    x, y, z = game(*loc)
    name = f'Botanical_{index:02}'
    radius = .24 * scale
    lathe(name + '_Sculpted_Ceramic_Pot', x, y, z,
          [(radius*.72,.045*scale), (radius*.94,.06*scale),
           (radius, .16*scale), (radius*.93,.47*scale),
           (radius*.88,.57*scale), (radius*.93,.59*scale),
           (radius*.98,.62*scale), (radius*.98,.66*scale)], ceramic, group)
    lathe(name + '_Soil', x, y, z,
          [(0,.58*scale), (radius*.87,.58*scale), (radius*.87,.61*scale)], soil, group)
    lathe(name + '_Saucer', x, y, z,
          [(radius*.55,.015*scale), (radius*1.1,.018*scale), (radius*1.16,.06*scale)], ceramic, group)
    for branch in range(8):
        angle = branch * 2.399 + index * .51
        height = (1.02 + .16 * math.sin(branch * 3.1 + index)) * scale
        reach = (.23 + .08 * (branch % 3)) * scale
        base = Vector((x, y, z + .59 * scale))
        mid = base + Vector((reach*.38*math.cos(angle), reach*.38*math.sin(angle), height*.50))
        tip = base + Vector((reach*math.cos(angle), reach*math.sin(angle), height))
        curve(f'{name}_Branch_{branch:02}', [base, mid, tip], .013 * scale, stem, group)
        for level in range(4):
            t = .27 + level * .18
            anchor = base.lerp(tip, t)
            side_angle = angle + (1 if level % 2 else -1) * 1.05
            direction = (math.cos(side_angle), math.sin(side_angle), .16 - level*.07)
            leaf(f'{name}_Leaf_{branch:02}_{level:02}', anchor, direction,
                 (.34 + .06*level) * scale, (.12 + .018*(branch%2)) * scale,
                 leaf_mats[(index + branch + level) % len(leaf_mats)], group)
        if branch in (0, 3) and index % 2 == 0:
            flower(f'{name}_Blossom_{branch:02}', tip, .086 * scale, 5,
                   petals[(index + branch) % len(petals)], gold, group)


def hanging_vine(index, loc, leaves, stem, petals, gold, group):
    x, y, z = game(*loc)
    length = 1.25 + .18 * (index % 3)
    points = [Vector((x,y,z)), Vector((x+.14,y-.04,z-length*.42)),
              Vector((x-.08,y+.09,z-length*.74)), Vector((x+.10,y+.06,z-length))]
    curve(f'CeilingVine_{index:02}_Tendril', points, .011, stem, group)
    for k in range(10):
        t = .09 + k * .09
        center = points[0].lerp(points[-1], t) + Vector((.06*math.sin(k*1.5), .06*math.cos(k*1.8), 0))
        angle = index * .7 + k * 2.2
        leaf(f'CeilingVine_{index:02}_Leaf_{k:02}', center,
             (math.cos(angle), math.sin(angle), -.42), .26 + .04*(k%2), .072,
             leaves[(index+k)%len(leaves)], group)
    if index % 2 == 0:
        flower(f'CeilingVine_{index:02}_Flower', points[-1], .09, 5,
               petals[index%len(petals)], gold, group)


def star(name, loc, radius, metal, glow, group):
    x, y, z = game(*loc)
    verts = []
    for height in (z-.018, z+.018):
        for j in range(10):
            angle = math.pi/2 + math.pi*j/5
            r = radius if j%2 == 0 else radius*.43
            verts.append((x+math.cos(angle)*r, y, height+math.sin(angle)*r))
    faces = [tuple(range(9,-1,-1)), tuple(range(10,20))]
    for j in range(10):
        faces.append((j,(j+1)%10,(j+1)%10+10,j+10))
    mesh(name+'_Brushed_Gold', verts, faces, metal, group, False)
    curve(name+'_Suspension', [Vector((x,y,z+radius*.92)), Vector((x,y,z+radius*1.85))], .006, metal, group)
    lathe(name+'_Warm_Center', x,y,z, [(0,-.012),(.028,0),(0,.012)], glow, group, 12)


def lantern(name, loc, height, ceramic, gold, glass, glow, group):
    x,y,z = game(*loc)
    r = .12
    lathe(name+'_Plinth',x,y,z,[(.12,0),(.16,.018),(.13,.06),(.08,.09)],ceramic,group)
    curve(name+'_Stem',[Vector((x,y,z+.07)),Vector((x,y,z+height-.27))],.018,gold,group)
    lathe(name+'_Frosted_Globe',x,y,z+height-.22,
          [(0,-.19),(.12,-.16),(.19,-.07),(.20,.02),(.16,.12),(.06,.18),(0,.18)],glass,group,24)
    lathe(name+'_Cap',x,y,z+height-.04,[(.06,0),(.10,.025),(.01,.07)],gold,group,16)
    lathe(name+'_Inner_Glow',x,y,z+height-.23,[(0,0),(.07,.02),(0,.09)],glow,group,16)


def fairy_fixtures(brass, glass, group):
    # Identical strand data to FairyLights.jsx; its instanced light cores stay
    # dynamic while these Blender meshes provide the visible cable and sockets.
    strands = [
        ((-9.6,7.15,-7.25),(-2.6,7.15,-7.25),.65),
        ((-2.5,7.15,-7.25),(2.5,7.15,-7.25),.55),
        ((2.6,7.15,-7.25),(9.6,7.15,-7.25),.65),
        ((-9.85,4.7,-6.6),(-9.85,4.7,-2.4),.45),
        ((-9.85,4.7,-2.4),(-9.85,4.7,1.8),.45),
        ((8.42,4.9,-5.6),(8.42,4.9,-.6),.3),
        ((9.85,4.25,.8),(9.85,4.25,3.0),.4),
        ((9.85,4.25,3.0),(9.85,4.25,5.3),.4),
    ]
    for strand,(start,end,sag) in enumerate(strands):
        distance=math.dist(start,end)
        count=max(2,round(distance/.3))
        points=[]
        for i in range(count+1):
            t=i/count
            p=tuple(start[j]*(1-t)+end[j]*t for j in range(3))
            points.append(game(p[0],p[1]-sag*4*t*(1-t),p[2]))
        curve(f'FairyString_{strand:02}_Copper_Cable',points,.004,brass,group)
        for i,p in enumerate(points):
            lathe(f'FairyString_{strand:02}_Socket_{i:02}',p.x,p.y,p.z,
                  [(.029,.023),(.040,.035),(.041,.062),(.025,.083)],brass,group,8)


def candle_fixtures(wax, brass, stem, group):
    groups=[((-.25,1.31,-3.55),3),((9.45,0,.05),3),((-9.4,0,4.3),2),((-5.0,0,1.55),2)]
    for g,(loc,count) in enumerate(groups):
        x,y,z=loc
        for i in range(count):
            px=x+math.cos(i*2.3+g)*.09*(i>0)
            pz=z+math.sin(i*2.3+g)*.09*(i>0)
            h=.16-i*.035
            bx,by,bz=game(px,y,pz)
            lathe(f'Candle_{g:02}_{i:02}_Wax',bx,by,bz,
                  [(0,0),(.046,0),(.048,h*.77),(.051,h*.95),(.043,h),(.031,h*.96),(0,h*.96)],wax,group,16)
            lathe(f'Candle_{g:02}_{i:02}_Dish',bx,by,bz,
                  [(.015,-.015),(.07,-.013),(.077,.001)],brass,group,16)
            curve(f'Candle_{g:02}_{i:02}_Wick',
                  [Vector((bx,by,bz+h*.95)),Vector((bx,by,bz+h+0.028))],.003,stem,group)


def curtain_rail(brass, group):
    left=game(-9.925,7.78,-7.16)
    right=game(9.925,7.78,-7.16)
    curve('WholeWallVoile_Continuous_Brass_Rail',[left,right],.035,brass,group)
    for i,x in enumerate((-9.93,9.93)):
        px,py,pz=game(x,7.78,-7.16)
        lathe(f'WholeWallVoile_Rail_Finial_{i:02}',px,py,pz,
              [(.016,-.08),(.055,-.058),(.085,0),(.055,.058),(.016,.08)],brass,group,16)
    for i,x in enumerate((-8,-4,0,4,8)):
        start=game(x,7.78,-7.16)
        curve(f'WholeWallVoile_Rail_Bracket_{i:02}',
              [start,start+Vector((0,0,.14)),start+Vector((0,-.17,.18))],.018,brass,group)


def batch_for_web():
    # The source .blend retains every editable leaf and fixture. The GLB is
    # merged by PBR material to avoid hundreds of draw calls in the browser.
    for obj in list(bpy.data.objects):
        if obj.type == 'CURVE':
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.convert(target='MESH')
    groups = {}
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.data.materials:
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = 'Batched_' + material_name


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != 'Collection' and collection.users == 0:
            bpy.data.collections.remove(collection)
    root = bpy.data.collections.new('MOONROOM_ROOM_DRESSING')
    bpy.context.scene.collection.children.link(root)
    botanical = bpy.data.collections.new('BOTANICAL')
    fixtures = bpy.data.collections.new('LIGHTING_FIXTURES')
    root.children.link(botanical)
    root.children.link(fixtures)
    sage = [mat('Leaf_Sage_Dark', (.035,.10,.055)), mat('Leaf_Sage_Mid', (.06,.16,.08)),
            mat('Leaf_Sage_Soft', (.10,.20,.105))]
    ceramic = [mat('Pot_Cream_Ceramic',(.64,.53,.48),.57),
               mat('Pot_Dusty_Rose_Ceramic',(.47,.25,.31),.62),
               mat('Pot_Plummy_Clay',(.35,.26,.39),.72)]
    soil = mat('Pot_Soil',(.10,.075,.07),1)
    stem = mat('Vine_Stem_Sage',(.055,.095,.045),.89)
    petals = [mat('Flower_Dusty_Pink',(.72,.43,.51),.83),
              mat('Flower_Cream',(.90,.78,.68),.87),
              mat('Flower_Lavender',(.56,.46,.68),.82)]
    brass = mat('Fixture_Brushed_Champagne_Brass',(.54,.35,.19),.4,.72)
    glass = mat('Fixture_Frosted_Ivory_Glass',(.58,.42,.30),.42,0,((.95,.52,.27),.10))
    glow = mat('Fixture_Warm_Emissive',(.58,.30,.12),.55,0,((1,.48,.20),.75))
    for i,(loc,scale) in enumerate([
        ((-9,0,-6.1),.7),((-7.8,0,-5.95),.85),((8.2,0,-5.8),.7),
        ((9.1,0,-5.65),.85),((-9.25,0,1.8),1.05),((4.3,0,-5.45),.8),
    ]):
        potted_plant(i,loc,scale,sage,ceramic[i%3],soil,stem,petals,brass,botanical)
    for i,x in enumerate((-8.2,-7,-4.8,-4,3.5,4.5,7,8.1)):
        hanging_vine(i,(x,7.52,-6.45),sage,stem,petals,brass,botanical)
    for i,x in enumerate((-3.5,2.9,6.8)):
        star(f'WindowStar_{i:02}',(x,6.1-i*.28,-6.9),.18,brass,glow,fixtures)
    for i,x in enumerate((-5.2,0,5.2)):
        px,py,pz = game(x,6.8-i*.25,-6.85)
        curve(f'ArchPendant_{i:02}_Cord',[Vector((px,py,pz)),Vector((px,py,pz+.56))],.008,brass,fixtures)
        lathe(f'ArchPendant_{i:02}_Opal',px,py,pz,
              [(0,-.14),(.11,-.1),(.15,0),(.09,.11),(0,.13)],glass,fixtures,20)
    for i in range(24):
        x=-9.2+i%8*2.6
        z=-6.6+(i//8)*3.2
        px,py,pz=game(x,7.65,z)
        lathe(f'CeilingPinlight_{i:02}',px,py,pz,
              [(0,-.035),(.042,-.029),(.052,.008),(.024,.045),(0,.045)],glow,fixtures,12)
    for i,(x,z) in enumerate(((-9.5,-4),(9.5,-4))):
        px,py,pz=game(x,3.3,z)
        lathe(f'WallSconce_{i:02}_Cup',px,py,pz,
              [(0,-.17),(.08,-.13),(.12,-.04),(.12,0)],brass,fixtures,16)
        lathe(f'WallSconce_{i:02}_Opal',px,py,pz,
              [(0,-.055),(.13,-.03),(.16,.06),(.12,.15),(0,.19)],glass,fixtures,18)
    for i,(x,z) in enumerate(((-6.4,4.9),(-3.6,4.1),(3.4,3.3),(7.2,2.5))):
        lantern(f'FloorLantern_{i:02}',(x,0,z),1.2,ceramic[i%3],brass,glass,glow,fixtures)
    lantern('RightWallGlobe',(9.4,0,.7),2.14,ceramic[0],brass,glass,glow,fixtures)
    lantern('DeskGlobe',(3.65,1.29,-4.55),.76,ceramic[0],brass,glass,glow,fixtures)
    fairy_fixtures(brass,glass,fixtures)
    wax=mat('Candle_Warm_Ivory_Wax',(.73,.61,.47),.88)
    candle_fixtures(wax,brass,stem,fixtures)
    curtain_rail(brass,fixtures)
    os.makedirs(OUT_DIR,exist_ok=True)
    os.makedirs(os.path.dirname(OUT_GLB),exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR,'source.blend'))
    batch_for_web()
    bpy.ops.export_scene.gltf(filepath=OUT_GLB,export_format='GLB',export_yup=True,
                              export_apply=True,export_cameras=False,export_lights=False)
    print('EXPORTED',OUT_GLB,'objects',len(bpy.data.objects),
          'polygons',sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))


if __name__=='__main__':
    main()
