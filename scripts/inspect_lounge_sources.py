"""Inspect staged third-party soft furnishing assets without modifying Moonroom."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[1]/'assets-source/third-party'
sources=[root/'polyhaven-throw-pillows-01/throw_pillows_01_1k.gltf',root/'shapespark-textiles/shapespark_textiles-set.glb']
for path in sources:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(path))
    print(f'\nSOURCE {path.name}')
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH':continue
        bound=[obj.matrix_world@Vector(p) for p in obj.bound_box]
        span=tuple(round(max(v[i] for v in bound)-min(v[i] for v in bound),3) for i in range(3))
        print('MESH',obj.name,'verts',len(obj.data.vertices),'polys',len(obj.data.polygons),'extent',span,'materials',[m.name for m in obj.data.materials])
