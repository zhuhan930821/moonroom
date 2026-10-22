"""Build a separate Poly Haven wood_floor candidate without changing production.

Run after scripts/prepare_polyhaven_wood_floor.py:
  blender -b -P scripts/build_polyhaven_wood_floor_test.py
"""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/architecture/moonroom-architecture-phase1.blend"
OUT = ROOT / "assets-source/architecture/polyhaven-wood-floor-test"
TEXTURES = OUT / "textures"
PUBLIC = ROOT / "public/assets/models/architecture"

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
floor = bpy.data.objects["ARCH_Oak_Plank_Field"]
assert floor.type == "MESH" and len(floor.data.polygons) == 768
assert not floor.data.uv_layers
baseline = (len(floor.data.vertices), len(floor.data.polygons), tuple(floor.dimensions), floor.matrix_world.copy())

images = {}
for label in ("BaseColor", "Normal", "Roughness"):
    image = bpy.data.images.load(str(TEXTURES / f"Moonroom_PolyHaven_WoodFloor_{label}_Atlas.png"), check_existing=False)
    image.colorspace_settings.name = "sRGB" if label == "BaseColor" else "Non-Color"
    images[label] = image

uv = floor.data.uv_layers.new(name="PolyHaven_WoodFloor_PerPlank_UV")
for polygon in floor.data.polygons:
    coords = [floor.data.vertices[floor.data.loops[index].vertex_index].co for index in polygon.loop_indices]
    min_x = min(co.x for co in coords)
    min_z = min(co.z for co in coords)
    variant = polygon.material_index
    for loop_index, co in zip(polygon.loop_indices, coords):
        across = max(.005, min(.995, (co.z - min_z) / .313))
        along = max(.005, min(.995, (co.x - min_x) / 1.23))
        uv.data[loop_index].uv = ((variant + .012 + across * .976) / 6, along)

for index, material in enumerate(floor.data.materials):
    assert material.name == f"Floor_Oak_{index:02d}"
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    links = material.node_tree.links
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    texture_nodes = {}
    for label in images:
        node = nodes.new("ShaderNodeTexImage")
        node.name = f"PolyHaven_WoodFloor_{label}"
        node.image = images[label]
        texture_nodes[label] = node
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = .38
    links.new(texture_nodes["BaseColor"].outputs["Color"], bsdf.inputs["Base Color"])
    links.new(texture_nodes["Roughness"].outputs["Color"], bsdf.inputs["Roughness"])
    links.new(texture_nodes["Normal"].outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

assert (len(floor.data.vertices), len(floor.data.polygons), tuple(floor.dimensions)) == baseline[:3]
assert floor.matrix_world == baseline[3]

blend = OUT / "moonroom-architecture-polyhaven-wood-floor-test.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.data.objects:
    if not any(collection.name == "PREVIEW_Only" for collection in obj.users_collection):
        obj.select_set(True)
glb = PUBLIC / "moonroom-architecture-polyhaven-wood-floor-test.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True, export_extras=True)
print("POLYHAVEN_FLOOR_TEST_COMPLETE", glb)
