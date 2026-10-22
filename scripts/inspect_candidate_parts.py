import bpy
import json
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FBX = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'original', 'extracted', 'source', 'Drum Set_sketchfab.fbx')
OUT = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'working', 'parts.json')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=FBX, use_image_search=True)

parts = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = [min(point[index] for point in corners) for index in range(3)]
    maximum = [max(point[index] for point in corners) for index in range(3)]
    dimensions = [maximum[index] - minimum[index] for index in range(3)]
    center = [(minimum[index] + maximum[index]) / 2 for index in range(3)]
    mesh = obj.data
    mesh.calc_loop_triangles()
    parts.append({
        'name': obj.name,
        'center': center,
        'dimensions': dimensions,
        'min': minimum,
        'max': maximum,
        'vertices': len(mesh.vertices),
        'triangles': len(mesh.loop_triangles),
        'materials': [slot.material.name for slot in obj.material_slots if slot.material],
        'materialPolygons': {
            (obj.material_slots[index].material.name if obj.material_slots[index].material else f'slot-{index}'):
            sum(1 for polygon in mesh.polygons if polygon.material_index == index)
            for index in range(len(obj.material_slots))
        },
    })

parts.sort(key=lambda part: (-part['dimensions'][2], part['center'][0], part['name']))
with open(OUT, 'w', encoding='utf-8') as handle:
    json.dump(parts, handle, ensure_ascii=False, indent=2)
print('WROTE', OUT, len(parts))
