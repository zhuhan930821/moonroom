"""Export the reviewed, pillow-restored Moon Nest visual only.

Run: blender -b assets-source/lounge/moon-nest-refinement-v2.blend --python scripts/export_bed_refinement_v2.py
"""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
output = root / "public/assets/models/lounge/moon-nest-refinement-v2.glb"
names = ("BED_SOURCE_MessyBed2_CC_BY", "TEXTILES_MoonNest_Study")

bpy.ops.object.select_all(action="DESELECT")
selected = []
for name in names:
    collection = bpy.data.collections.get(name)
    assert collection is not None, f"Missing {name}"
    for obj in collection.objects:
        if obj.type == "MESH":
            obj.select_set(True)
            selected.append(obj.name)

assert len(selected) == 7, selected
bpy.context.view_layer.objects.active = bpy.data.objects[selected[0]]
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(output), export_format="GLB", use_selection=True,
    export_apply=True, export_yup=True,
)
print("BED_VISUAL_EXPORT", output, selected)
