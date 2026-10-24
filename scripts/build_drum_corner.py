import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('MOONROOM_CORNER_OUT', os.path.join(ROOT, 'public', 'assets', 'models'))
STAGE = os.environ.get('MOONROOM_CORNER_STAGE', 'c').lower()


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def mat(name, color, metallic=0, rough=.55, emission=None):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission[:3], 1)
        shader.inputs['Emission Strength'].default_value = emission[3] if len(emission) > 3 else .6
    return material


def cube(name, loc, scale, material, bevel=.04, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Soft bevel', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(material)
    return obj


def cyl(name, loc, radius, depth, material, rotation=(0, 0, 0), vertices=48, bevel=.012):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if bevel:
        modifier = obj.modifiers.new('Rolled edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj


def uv(name, loc, scale, material, segments=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=16, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj


def torus(name, loc, major, minor, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64, minor_segments=8, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj


def curve(name, points, material, bevel=.018):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = bevel
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def star(name, loc, radius, depth, material, rotation=(math.pi / 2, 0, 0)):
    vertices = []
    for index in range(10):
        angle = math.pi / 2 + index * math.pi / 5
        r = radius if index % 2 == 0 else radius * .43
        vertices.append((math.cos(angle) * r, math.sin(angle) * r, 0))
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(vertices, [], [tuple(range(10))])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    solid = obj.modifiers.new('Soft thickness', 'SOLIDIFY')
    solid.thickness = depth
    bevel_mod = obj.modifiers.new('Rounded points', 'BEVEL')
    bevel_mod.width = min(depth * .35, .016)
    bevel_mod.segments = 2
    return obj


def leaf(name, loc, scale, material, rotation=(0, 0, 0)):
    obj = uv(name, loc, scale, material, 20)
    obj.rotation_euler = rotation
    return obj


def make_rug(materials):
    plum, rose, gold = materials
    cyl('Drum_Rug', (0, .055, .05), 2.82, .11, plum, (math.pi / 2, 0, 0), 96, .025)
    torus('Rug_Outer_Border', (0, .118, .05), 2.52, .055, rose, (math.pi / 2, 0, 0))
    torus('Rug_Inner_Border', (0, .12, .05), 1.92, .025, gold, (math.pi / 2, 0, 0))
    for index, angle in enumerate((.2, 1.15, 2.05, 2.9, 3.9, 4.9, 5.65)):
        radius = 2.2 if index % 2 else 2.32
        star('Rug_Star_' + str(index), (math.sin(angle) * radius, .126, .05 + math.cos(angle) * radius), .15 if index % 2 else .11, .018, gold)
    # Layered discs create an inset crescent motif without a texture dependency.
    cyl('Rug_Moon_Dark', (-.15, .127, .08), .60, .018, gold, (math.pi / 2, 0, 0), 64, .005)
    cyl('Rug_Moon_Cut', (.08, .139, -.02), .53, .02, plum, (math.pi / 2, 0, 0), 64, .005)


def make_lamp(brass, cream, glow):
    x, z = -2.48, -.20
    cyl('Lamp_Base', (x, .07, z), .34, .10, brass, (math.pi / 2, 0, 0), 56, .025)
    cyl('Lamp_Stem', (x, 1.18, z), .035, 2.18, brass, (math.pi / 2, 0, 0), 24, .008)
    cyl('Lamp_Shade', (x, 2.30, z), .46, .66, cream, (math.pi / 2, 0, 0), 64, .025).scale = (1, 1, 1.23)
    cyl('Lamp_Shade_Top', (x, 2.62, z), .25, .035, brass, (math.pi / 2, 0, 0), 48, .008)
    uv('Lamp_Glow', (x, 2.18, z), (.16, .22, .16), glow)


def make_plant(prefix, loc, height, pot_material, stem_material, leaf_material, fullness=7):
    x, _, z = loc
    cyl(prefix + '_Pot', (x, .28, z), .28, .52, pot_material, (math.pi / 2, 0, 0), 48, .04)
    cyl(prefix + '_Rim', (x, .54, z), .31, .10, pot_material, (math.pi / 2, 0, 0), 48, .018)
    for index in range(fullness):
        angle = index * math.tau / fullness + .31
        bend = .22 + .08 * (index % 3)
        top = (x + math.sin(angle) * bend, .52 + height * (.72 + .08 * (index % 3)), z + math.cos(angle) * bend)
        curve(prefix + '_Stem_' + str(index), [(x, .48, z), (x + math.sin(angle) * .1, .8 + height * .25, z + math.cos(angle) * .1), top], stem_material, .018)
        for leaf_index in (0, 1):
            fraction = .56 + leaf_index * .30
            ly = .52 + (top[1] - .52) * fraction
            lx = x + math.sin(angle) * bend * fraction + math.cos(angle) * (.12 if leaf_index else -.12)
            lz = z + math.cos(angle) * bend * fraction - math.sin(angle) * (.12 if leaf_index else -.12)
            leaf(prefix + '_Leaf', (lx, ly, lz), (.10, .035, .24), leaf_material, (0, angle, (leaf_index - .5) * .65))


def make_curtain(name, x, side, velvet):
    verts, faces = [], []
    columns, rows = 13, 18
    for row in range(rows):
        y = .25 + row * 4.65 / (rows - 1)
        for column in range(columns):
            t = column / (columns - 1)
            width = .56 + 1.15 * (1 - y / 5.15) ** 1.35
            px = x + side * t * width
            pz = -4.55 + math.sin(t * math.pi * 6) * .075
            verts.append((px, y, pz))
    for row in range(rows - 1):
        for column in range(columns - 1):
            a = row * columns + column
            faces.append((a, a + 1, a + 1 + columns, a + columns))
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(velvet)
    solid = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    solid.thickness = .035
    bevel_mod = obj.modifiers.new('Soft hems', 'BEVEL')
    bevel_mod.width = .018
    bevel_mod.segments = 2
    cyl(name + '_Tie', (x + side * .52, 2.1, -4.51), .10, .11, velvet, (0, math.pi / 2, 0), 28, .012)


def make_vines(stem, leaves):
    for vine_index, x in enumerate((-2.63, 2.55)):
        points = [(x, 4.95, -4.42), (x + .10, 4.15, -4.39), (x - .08, 3.35, -4.40), (x + .13, 2.58, -4.36)]
        curve('Window_Vine_' + str(vine_index), points, stem, .024)
        for index in range(7):
            y = 4.67 - index * .31
            leaf('Vine_Leaf', (x + (-1 if index % 2 else 1) * .12, y, -4.36), (.075, .028, .16), leaves, (0, .35 * vine_index, (-1 if index % 2 else 1) * .75))


def make_stars(brass, glow):
    for index, (x, y, z, radius) in enumerate(((-1.65, 4.18, -3.70, .19), (.25, 4.62, -3.82, .14), (1.70, 4.02, -3.72, .21))):
        curve('Star_Cord_' + str(index), [(x, 5.25, z), (x, y + .18, z)], brass, .008)
        star('Hanging_Star_' + str(index), (x, y, z), radius, .055, glow, (0, 0, 0))


def make_shelf(wood, dark_wood, paper, colors, vinyl):
    # The music shelf sits on the left wall beside the piano. Coordinates are
    # local to the drum-corner anchor (-7.1, 0, -2.8) in Three.js.
    x, z = -2.68, 8.0
    cube('Music_Shelf_Back', (x, 1.55, z), (.13, 1.55, 1.15), dark_wood, .035)
    for y in (.12, .86, 1.61, 2.36, 3.10):
        cube('Music_Shelf_Board', (x + .20, y, z), (.31, .075, 1.22), wood, .025)
    for shelf in range(3):
        for index in range(7):
            y = .47 + shelf * .75
            book_z = z - .86 + index * .27
            cube('Music_Book', (x + .48, y, book_z), (.18, .30 + .04 * ((index + shelf) % 3), .09), colors[(index + shelf) % len(colors)], .018, (0, 0, (index % 3 - 1) * .045))
    for index in range(5):
        cube('Record_Sleeve', (x + .49, 2.70, z - .72 + index * .34), (.16, .31, .14), paper if index % 2 else colors[index % len(colors)], .012)
        cyl('Vinyl_Record', (x + .68, 2.70, z - .72 + index * .34), .23, .018, vinyl, (0, math.pi / 2, 0), 40, .004)


def make_fox(cushion, fox, cream, dark):
    existing = set(bpy.data.objects)
    base = (-1.95, .30, 1.56)
    uv('Fox_Cushion', (base[0], .23, base[2]), (.78, .18, .62), cushion)
    body = uv('Sleeping_Fox_Body', (base[0], .49, base[2]), (.55, .25, .40), fox)
    body.rotation_euler.y = -.18
    uv('Sleeping_Fox_Head', (-2.34, .55, 1.36), (.29, .25, .27), fox)
    for side in (-1, 1):
        ear = cube('Sleeping_Fox_Ear', (-2.34 + side * .17, .78, 1.34), (.11, .20, .055), fox, .045, (0, 0, side * .22))
        ear.rotation_euler.x = .14
    uv('Fox_Muzzle', (-2.34, .48, 1.12), (.19, .11, .12), cream)
    uv('Fox_Nose', (-2.34, .49, 1.01), (.035, .028, .035), dark)
    for side in (-1, 1):
        curve('Fox_Closed_Eye', [(-2.34 + side * .10, .59, 1.105), (-2.34 + side * .055, .575, 1.09)], dark, .009)
    tail = curve('Sleeping_Fox_Tail', [(-1.55, .52, 1.72), (-1.25, .65, 1.42), (-1.55, .57, 1.10), (-1.92, .52, 1.18)], fox, .17)
    tail.data.bevel_resolution = 4
    uv('Fox_Tail_Tip', (-1.88, .52, 1.18), (.23, .15, .17), cream)
    root = bpy.data.objects.new('Sleeping_Fox_Group', None)
    bpy.context.collection.objects.link(root)
    root.location.z = -2.28
    root.scale = (.82, .82, .82)
    for obj in set(bpy.data.objects) - existing - {root}:
        obj.parent = root


def export():
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'drum-corner.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True)
    print('EXPORT', path, 'STAGE', STAGE)


def batch_by_material():
    # Static corner dressing does not need per-object nodes. Baking modifiers and
    # joining by material keeps the authored silhouettes while cutting draw calls.
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'CURVE':
            continue
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
    groups = {}
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.data.materials:
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = 'Batched_' + material_name


def build():
    reset()
    rug = mat('Rug_Deep_Purple', (.105, .035, .19), 0, .91)
    rug_rose = mat('Rug_Dusty_Rose', (.48, .20, .38), 0, .87)
    rug_gold = mat('Rug_Muted_Gold', (.68, .40, .13), .18, .58)
    brass = mat('Aged_Brass', (.53, .27, .07), .72, .28)
    cream = mat('Lamp_Cream_Fabric', (.88, .66, .39), 0, .78, (.95, .50, .17, .18))
    glow = mat('Warm_Star_Glow', (1.0, .58, .16), .05, .30, (1.0, .34, .08, 1.4))
    terracotta = mat('Warm_Ceramic', (.39, .13, .10), .05, .68)
    ceramic = mat('Cream_Ceramic', (.72, .60, .48), .08, .64)
    stem = mat('Plant_Stems', (.08, .18, .07), 0, .80)
    leaves = mat('Plant_Leaves', (.11, .30, .16), 0, .73)
    velvet = mat('Plum_Curtain_Velvet', (.20, .035, .18), 0, .93)

    make_rug((rug, rug_rose, rug_gold))
    make_lamp(brass, cream, glow)
    make_plant('Plant_Left', (-2.05, 0, -3.62), 1.30, terracotta, stem, leaves, 7)
    make_plant('Plant_Right', (2.25, 0, -3.55), 1.62, ceramic, stem, leaves, 8)
    make_plant('Plant_Front', (2.47, 0, .92), .88, terracotta, stem, leaves, 6)
    make_curtain('Curtain_Left', -2.46, 1, velvet)
    make_curtain('Curtain_Right', 2.42, -1, velvet)
    make_vines(stem, leaves)
    make_stars(brass, glow)

    if STAGE == 'c':
        wood = mat('Walnut_Wood', (.25, .085, .045), 0, .51)
        dark_wood = mat('Shelf_Shadow_Wood', (.10, .027, .025), 0, .66)
        paper = mat('Aged_Paper', (.70, .51, .34), 0, .82)
        vinyl = mat('Vinyl_Black', (.018, .012, .025), .22, .26)
        book_colors = [mat('Book_Burgundy', (.35, .045, .08), 0, .65), mat('Book_Indigo', (.08, .08, .27), 0, .68), mat('Book_Ochre', (.49, .25, .05), 0, .62)]
        cushion = mat('Fox_Cushion_Fabric', (.34, .15, .43), 0, .94)
        fox = mat('Fox_Russet_Fur', (.62, .19, .07), 0, .90)
        fox_cream = mat('Fox_Cream_Fur', (.84, .63, .40), 0, .95)
        fox_dark = mat('Fox_Features', (.055, .018, .025), 0, .70)
        make_shelf(wood, dark_wood, paper, book_colors, vinyl)
        make_fox(cushion, fox, fox_cream, fox_dark)

    batch_by_material()
    export()


build()
