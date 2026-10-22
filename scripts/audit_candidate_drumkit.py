import bpy
import json
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FBX = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'original', 'extracted', 'source', 'Drum Set_sketchfab.fbx')
EXISTING = os.path.join(ROOT, 'public', 'assets', 'models', 'acoustic-drum-kit.glb')
WORKING = os.path.join(ROOT, 'assets-source', 'drums', 'art-katja', 'working')
os.makedirs(WORKING, exist_ok=True)


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != 'Collection':
            bpy.data.collections.remove(collection)


def selected_import(importer):
    before = set(bpy.data.objects)
    importer()
    return list(set(bpy.data.objects) - before)


def move_to_collection(objects, collection):
    for obj in objects:
        for current in list(obj.users_collection):
            current.objects.unlink(obj)
        collection.objects.link(obj)


def root_objects(objects):
    object_set = set(objects)
    return [obj for obj in objects if obj.parent not in object_set]


def transform_roots(objects, offset, rotation_x=0):
    for obj in root_objects(objects):
        obj.location.x += offset
        obj.rotation_euler.x += rotation_x


def stats(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh_objects = [obj for obj in objects if obj.type == 'MESH']
    vertices = polygons = triangles = 0
    material_names = set()
    for obj in mesh_objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        vertices += len(mesh.vertices)
        polygons += len(mesh.polygons)
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
        material_names.update(slot.material.name for slot in obj.material_slots if slot.material)
    bbox = []
    for obj in mesh_objects:
        bbox.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    return {
        'objects': len(objects),
        'meshObjects': len(mesh_objects),
        'vertices': vertices,
        'polygons': polygons,
        'triangles': triangles,
        'materials': sorted(material_names),
        'materialCount': len(material_names),
        'images': sorted({image.name: {'size': list(image.size), 'filepath': image.filepath} for image in bpy.data.images}.items()),
        'bboxMin': [min(point[i] for point in bbox) for i in range(3)] if bbox else None,
        'bboxMax': [max(point[i] for point in bbox) for i in range(3)] if bbox else None,
        'objectsByType': {kind: sum(1 for obj in objects if obj.type == kind) for kind in sorted({obj.type for obj in objects})},
        'names': sorted(obj.name for obj in objects),
    }


reset()
scene = bpy.context.scene
default = bpy.data.collections.get('Collection')
existing_collection = bpy.data.collections.new('Existing_DrumKit_REFERENCE')
candidate_original = bpy.data.collections.new('Candidate_Original_READ_ONLY')
candidate_working = bpy.data.collections.new('Candidate_Working')
scene.collection.children.link(existing_collection)
scene.collection.children.link(candidate_original)
scene.collection.children.link(candidate_working)

existing_objects = selected_import(lambda: bpy.ops.import_scene.gltf(filepath=EXISTING))
move_to_collection(existing_objects, existing_collection)
transform_roots(existing_objects, -3.7, rotation_x=1.57079632679)

candidate_objects = selected_import(lambda: bpy.ops.import_scene.fbx(filepath=FBX, use_image_search=True))
move_to_collection(candidate_objects, candidate_original)
transform_roots(candidate_objects, 3.7)

report = {
    'source': FBX,
    'license': 'CC BY 4.0',
    'author': 'art.katja',
    'sourceUrl': 'https://skfb.ly/p9FOp',
    'existing': stats(existing_objects),
    'candidate': stats(candidate_objects),
}

with open(os.path.join(WORKING, 'audit.json'), 'w', encoding='utf-8') as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORKING, 'drum-kit-comparison.blend'))
print(json.dumps(report, ensure_ascii=False, indent=2))
