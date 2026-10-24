"""Create Moonroom diary-book variants from the user-supplied Sketchfab GLB.

The source GLB remains untouched. Two *single* horizontal books (one in each
case) are replaced with editable Blender meshes, retaining their original
parent nodes so R3F can animate those nodes independently.
"""

import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets-source', 'third-party', 'sketchfab-wooden-bookcases', 'original.glb')
WORK = os.path.join(ROOT, 'assets-source', 'bookshelf', 'diary-books')
OUTPUT = os.path.join(ROOT, 'public', 'assets', 'models', 'bookshelf', 'wooden-bookcases-with-diary.glb')


def material(name, color, metallic=0.0, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def world_box(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = Vector(min(point[axis] for point in corners) for axis in range(3))
    maxs = Vector(max(point[axis] for point in corners) for axis in range(3))
    return mins, maxs


def parent_keep_world(obj, parent):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def put_in_collection(obj, collection):
    for old in tuple(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)


def slab(name, center, size, mat, parent, collection, bevel):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new('Soft machined edge', 'BEVEL')
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    put_in_collection(obj, collection)
    parent_keep_world(obj, parent)
    return obj


def motif(name, center, radius, mat, parent, collection, star=False):
    if star:
        points = []
        for i in range(10):
            angle = math.pi / 2 + math.pi * i / 5
            r = radius if i % 2 == 0 else radius * .42
            points.append((center.x + math.cos(angle) * r, center.y + math.sin(angle) * r, center.z))
    else:
        # Two softly tapered arcs form a small embossed crescent on the cover.
        points = []
        for i in range(17):
            angle = -2.2 + 4.4 * i / 16
            points.append((center.x + math.cos(angle) * radius, center.y + math.sin(angle) * radius, center.z))
        for i in range(17):
            angle = 2.2 - 4.4 * i / 16
            points.append((center.x + .025 + math.cos(angle) * radius * .73, center.y + math.sin(angle) * radius * .73, center.z))
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(points, [], [tuple(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    solid = obj.modifiers.new('Emboss depth', 'SOLIDIFY')
    solid.thickness = .0015
    parent_keep_world(obj, parent)
    return obj


def make_diary(parent, target, label, cover, pages, gold, collection):
    low, high = world_box(target)
    center = (low + high) / 2
    extent = high - low
    width, depth, height = extent
    # The tall-case source book sits against the outer edge. Tuck the diary
    # inward so its lighter page block reads as a book, not a projecting shelf.
    if label.endswith('Tall'):
        center.x -= .065
    width *= .85
    depth *= .85
    # Existing source books are roughly 0.3 x 0.3 x 0.08 m. Keep the same
    # silhouette and shelf contact; only refine the object itself.
    height = min(max(height, .068), .088)
    slab(label + '_Pages', (center.x, center.y, center.z),
         (width * .93, depth * .91, height * .63), pages, parent, collection, .006)
    for suffix, sign in (('Top', 1), ('Bottom', -1)):
        slab(label + '_Cover_' + suffix,
             (center.x, center.y, center.z + sign * height * .40),
             (width, depth, height * .17), cover, parent, collection, .008)
    # A distinct rounded spine and two gold tooling lines.
    spine_x = center.x - width * .475
    slab(label + '_Spine', (spine_x, center.y, center.z),
         (width * .075, depth * .98, height * .88), cover, parent, collection, .006)
    for side in (-.31, .31):
        slab(label + '_Spine_Gold_Line',
             (spine_x - width * .009, center.y + side * depth, center.z),
             (width * .012, depth * .012, height * .72), gold, parent, collection, .001)
    top = center.z + height * .50 + .003
    emblem = Vector((center.x, center.y + depth * .14, top))
    motif(label + '_Moon_Emboss', emblem, min(width, depth) * .14, gold, parent, collection)
    motif(label + '_Star_Emboss', emblem + Vector((width * .19, -depth * .015, .001)),
          min(width, depth) * .035, gold, parent, collection, star=True)
    print('DIARY', label, 'bounds', tuple(round(v, 3) for v in low), tuple(round(v, 3) for v in high))


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    collection = bpy.data.collections.new('MOONROOM_DIARY_BOOKS')
    bpy.context.scene.collection.children.link(collection)
    cover = material('Diary_Dusty_Plum_Cloth', (.23, .08, .19), roughness=.88)
    pages = material('Diary_Warm_Ivory_Pages', (.69, .60, .49), roughness=.95)
    gold = material('Diary_Muted_Champagne_Gold', (.67, .47, .24), metallic=.68, roughness=.43)
    choices = [
        ('Victorian Bookcase Tall Books 4', 'MoonDiary_Tall'),
        ('Victorian Bookcase Small Books 5', 'MoonDiary_Short'),
    ]
    for prefix, label in choices:
        target = next((obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.name.startswith(prefix + '_')), None)
        if target is None:
            raise RuntimeError('Could not find single source book: ' + prefix)
        parent = target.parent
        make_diary(parent, target, label, cover, pages, gold, collection)
        bpy.data.objects.remove(target, do_unlink=True)
    os.makedirs(WORK, exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'source.blend'))
    bpy.ops.export_scene.gltf(filepath=OUTPUT, export_format='GLB', export_apply=True, export_yup=True)
    print('EXPORT', OUTPUT)


if __name__ == '__main__':
    main()
