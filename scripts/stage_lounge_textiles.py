"""Stage licensed throw/pillow meshes in Blender, without touching game assets."""
import bpy
from pathlib import Path

root=Path(__file__).resolve().parents[1]
sources=root/'assets-source/third-party'
output=root/'assets-source/lounge/moonroom-textiles-staging.blend'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def group(name):
    col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col);return col

throws=group('SOURCE_Shapespark_Throws_CC0')
pillows=group('SOURCE_PolyHaven_Pillows_CC0')
bpy.ops.import_scene.gltf(filepath=str(sources/'shapespark-textiles/shapespark_textiles-set.glb'))
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj.name in {'blanket_01','blanket_02'}:
        obj.name='Throw_'+obj.name
        for old in list(obj.users_collection):old.objects.unlink(obj)
        throws.objects.link(obj)
    else:
        bpy.data.objects.remove(obj,do_unlink=True)

bpy.ops.import_scene.gltf(filepath=str(sources/'polyhaven-throw-pillows-01/throw_pillows_01_1k.gltf'))
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj.name.startswith('throw_pillows_01_'):
        obj.name='Pillow_'+obj.name
        for old in list(obj.users_collection):old.objects.unlink(obj)
        pillows.objects.link(obj)
    elif obj.name not in throws.objects:
        bpy.data.objects.remove(obj,do_unlink=True)

# Imported but discarded rugs/curtains can leave large orphan texture datablocks.
bpy.ops.outliner.orphans_purge(do_recursive=True)
for image in bpy.data.images:
    if image.users and image.filepath:
        try:image.pack()
        except RuntimeError:pass
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print('Staged',[(c.name,[o.name for o in c.objects]) for c in (throws,pillows)])
