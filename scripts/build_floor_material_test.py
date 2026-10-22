"""Make an opt-in Moonroom floor PBR test from the existing architecture blend.

Changes only ARCH_Oak_Plank_Field UVs and its six Floor_Oak materials. All mesh
vertices, faces, object transforms, gameplay colliders and production files stay
unchanged. Run: blender -b --python scripts/build_floor_material_test.py
"""
import bpy
import math
import os
from pathlib import Path
from mathutils import Matrix, Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/architecture/moonroom-architecture-phase1.blend"
OUT = ROOT / "assets-source/architecture/floor-material-test"
PUBLIC = ROOT / "public/assets/models/architecture"
for path in (OUT, OUT / "textures", OUT / "previews", PUBLIC):
    path.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
floor = bpy.data.objects["ARCH_Oak_Plank_Field"]
assert floor.type == "MESH" and len(floor.data.polygons) == 768
assert len(floor.data.uv_layers) == 0, "The floor UV baseline changed; audit before rebuilding"
before_vertex_count = len(floor.data.vertices)
before_face_count = len(floor.data.polygons)
before_dimensions = tuple(floor.dimensions)
before_transform = floor.matrix_world.copy()

# Six warm, slightly different oak tones live in one atlas. The grain follows
# each 1.23 m plank length, while its transverse scale follows the .313 m width.
size = 1024
u = np.linspace(0, 1, size, endpoint=False, dtype=np.float32)[None, :]
v = np.linspace(0, 1, size, endpoint=False, dtype=np.float32)[:, None]
strip = np.minimum((v * 6).astype(np.int32), 5)
across = v * 6 - strip
palettes = np.array([
    (.46,.265,.17), (.49,.285,.185), (.525,.31,.205),
    (.43,.245,.165), (.55,.33,.215), (.475,.275,.18),
], dtype=np.float32)

# Long pores and broad figure remain directional rather than isotropic noise.
slow_bend = .09*np.sin(u*math.tau*2.6 + strip*.7)
knot = .055*np.exp(-((u-.67)**2/.011 + (across-.54)**2/.09))
grain_coord = across + slow_bend + knot*np.sin(u*math.tau*3.2)
wide = np.sin(grain_coord*math.tau*14 + u*math.tau*.4)
fine = np.sin(grain_coord*math.tau*61 + u*math.tau*1.7)
pores = np.sin(grain_coord*math.tau*137 + u*math.tau*8.2)
grain = wide*.65 + fine*.25 + pores*.10
height = .52 + wide*.22 + fine*.095 + pores*.025

base = palettes[strip[:, 0]][:, None, :] + grain[:, :, None] * np.array((.044,.029,.018), dtype=np.float32)
base += (np.sin(u*math.tau*1.2 + strip*.9) * .010)[:, :, None]
base = np.clip(base, .04, .82)
rough = np.clip(.71 + wide*.037 + fine*.018 + pores*.008, .62, .81)

# Tangent-space perturbation below 0.14 keeps the floor matte, not carved.
dv, du = np.gradient(height)
nx = np.clip(-du*.18, -.14, .14)
ny = np.clip(-dv*.18, -.14, .14)
nz = np.sqrt(np.clip(1 - nx*nx - ny*ny, .01, 1))
normal_rgb = np.stack(((nx+1)*.5, (ny+1)*.5, (nz+1)*.5), axis=-1)

def save_texture(name, rgb, colorspace):
    alpha = np.ones((size, size, 1), dtype=np.float32)
    rgba = np.concatenate((rgb.astype(np.float32), alpha), axis=2)
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    image.colorspace_settings.name = colorspace
    # Blender clears generated-image pixel buffers when the color space is
    # changed, so assign the color space before writing the actual texels.
    image.pixels.foreach_set(rgba.ravel())
    assert max(image.pixels[:4]) > .05, f"{name} pixel buffer is unexpectedly black"
    image.filepath_raw = str(OUT / "textures" / (name + ".png"))
    image.file_format = "PNG"
    image.save()
    return image

base_image = save_texture("Moonroom_Oak_BaseColor", base, "sRGB")
normal_image = save_texture("Moonroom_Oak_Normal", normal_rgb, "Non-Color")
rough_image = save_texture("Moonroom_Oak_Roughness", np.repeat(rough[:, :, None], 3, axis=2), "Non-Color")

# Every quad gets a consistent UV frame: U along global X (grain length), V
# across global Z. A shortened edge plank uses less of the atlas, not a stretch.
uv_layer = floor.data.uv_layers.new(name="C01_Floor_PerPlank_OakUV")
padding = .012
for face in floor.data.polygons:
    verts = [floor.data.vertices[floor.data.loops[i].vertex_index].co for i in face.loop_indices]
    left_x = min(co.x for co in verts)
    near_z = min(co.z for co in verts)
    variant = face.material_index
    for loop_index, co in zip(face.loop_indices, verts):
        local_u = (co.x - left_x) / 1.23
        local_v = (co.z - near_z) / .313
        uv_layer.data[loop_index].uv = (
            max(.001, min(.999, local_u)),
            (variant + padding + local_v * (1 - 2*padding)) / 6,
        )

for index, material in enumerate(floor.data.materials):
    assert material.name == f"Floor_Oak_{index:02d}"
    material.use_nodes = True
    material.diffuse_color = (*palettes[index], 1)
    material.use_backface_culling = False
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    for node in tuple(nodes):
        if node != bsdf and node.type != "OUTPUT_MATERIAL":
            nodes.remove(node)
    color_node = nodes.new("ShaderNodeTexImage")
    color_node.name = "Oak_BaseColor_Atlas"
    color_node.image = base_image
    color_node.interpolation = "Linear"
    rough_node = nodes.new("ShaderNodeTexImage")
    rough_node.name = "Oak_Roughness_Atlas"
    rough_node.image = rough_image
    rough_node.interpolation = "Linear"
    normal_node = nodes.new("ShaderNodeTexImage")
    normal_node.name = "Oak_Normal_Atlas"
    normal_node.image = normal_image
    normal_node.interpolation = "Linear"
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = .48
    links.new(color_node.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough_node.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Metallic"].default_value = 0

assert len(floor.data.vertices) == before_vertex_count
assert len(floor.data.polygons) == before_face_count
assert tuple(floor.dimensions) == before_dimensions
assert floor.matrix_world == before_transform
assert len(floor.data.uv_layers) == 1

# A temporary Blender camera/light examines the existing floor at walking
# distance. They remain preview-only and are not included in the candidate GLB.
preview = bpy.data.collections.get("PREVIEW_Only")
camera_data = bpy.data.cameras.new("PREVIEW_FloorMaterial_Close")
camera = bpy.data.objects.new("PREVIEW_FloorMaterial_Close", camera_data)
preview.objects.link(camera)
camera.location = (1.35, 1.65, 2.55)
camera_target = Vector((1.35, .008, .55))
forward = (camera_target - camera.location).normalized()
right = forward.cross(Vector((0,1,0))).normalized()
up = right.cross(forward).normalized()
camera.rotation_euler = Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
camera_data.lens = 42
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.render.resolution_x = 1100
scene.render.resolution_y = 650
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
hidden = {obj: obj.hide_render for obj in bpy.data.objects}
for obj in bpy.data.objects:
    if obj.type in {"MESH", "CURVE"} and obj.name not in {
        "ARCH_Oak_Plank_Field", "ARCH_Floor_Substrate",
        "ARCH_Floor_Edge_X_-9.8", "ARCH_Floor_Edge_X_9.8",
        "ARCH_Floor_Edge_Z_-7.7", "ARCH_Floor_Edge_Z_7.7",
    }:
        obj.hide_render = True
scene.render.filepath = str(OUT / "previews/blender_floor_close.png")
bpy.ops.render.render(write_still=True)
for obj, value in hidden.items():
    obj.hide_render = value

blend = OUT / "moonroom-architecture-floor-material-test.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.data.objects:
    if not any(group.name == "PREVIEW_Only" for group in obj.users_collection):
        obj.select_set(True)
glb = PUBLIC / "moonroom-architecture-floor-material-test.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True, export_extras=True)
print("FLOOR_TEST_COMPLETE", glb, "faces", len(floor.data.polygons), "uv_loops", len(uv_layer.data))
