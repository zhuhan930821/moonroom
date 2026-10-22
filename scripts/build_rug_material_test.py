"""Build an isolated Blender/GLB material test matching Moonroom's live rug.

Run: blender -b -P scripts/build_rug_material_test.py
The original architecture blend and production rug are never overwritten.
"""

from pathlib import Path
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
PILE = os.environ.get("RUG_PILE_TEST") == "1"
OUT = ROOT / ("assets-source/rug/pile-test" if PILE else "assets-source/rug/material-test")
TEXTURES = ROOT / "assets-source/rug/material-test/textures"
PREVIEWS = OUT / "previews"
PUBLIC = ROOT / "public/assets/models/candidates"
for folder in (TEXTURES, PREVIEWS, PUBLIC):
    folder.mkdir(parents=True, exist_ok=True)

COLOR = TEXTURES / "Rug_StarMoon_BaseColor.png"
NORMAL = TEXTURES / "poly_wool_herringbone_nor_gl_2k.jpg"
ROUGHNESS = TEXTURES / "poly_wool_herringbone_rough_2k.jpg"
if not COLOR.is_file():
    raise FileNotFoundError(f"Run node scripts/export_rug_canvas.mjs first: {COLOR}")
for path in (NORMAL, ROUGHNESS):
    if not path.is_file():
        raise FileNotFoundError(f"Download Poly Haven's 2K map first: {path}")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

collection = bpy.data.collections.new("RUG_Material_Test_Only")
bpy.context.scene.collection.children.link(collection)
width, depth = 8.5, 6.7
vertices = [(-width/2, -depth/2, 0), (width/2, -depth/2, 0),
            (width/2, depth/2, 0), (-width/2, depth/2, 0)]
mesh = bpy.data.meshes.new("RUG_ProductionDimensions_8p5x6p7")
mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
mesh.update()
uv = mesh.uv_layers.new(name="RUG_FullImage_UV")
for loop_index, coord in enumerate(((0,0), (1,0), (1,1), (0,1))):
    uv.data[loop_index].uv = coord
fabric_uv = mesh.uv_layers.new(name="RUG_FabricTiled_UV")
for loop_index, coord in enumerate(((0,0), (16,0), (16,13), (0,13))):
    fabric_uv.data[loop_index].uv = coord
mesh.uv_layers.active = uv
rug = bpy.data.objects.new("RUG_StarMoon_Material_TEST", mesh)
collection.objects.link(rug)
# Blender Z-up maps to glTF Y-up. -2.3 Blender Y becomes +2.3 Three Z.
rug.location = (-.7, -2.3, .028)
rug["asset_id"] = "RUG_STARMoon_MATERIAL_TEST"
rug["production_replacement"] = False

material = bpy.data.materials.new("RUG_StarMoon_ImagePBR_Matte_TEST")
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
bsdf = nodes.get("Principled BSDF")
bsdf.inputs["Metallic"].default_value = 0
bsdf.inputs["Sheen Weight"].default_value = 0
bsdf.inputs["Roughness"].default_value = .92
images = {}
for label, path, space in (("BaseColor", COLOR, "sRGB"), ("Normal", NORMAL, "Non-Color"), ("Roughness", ROUGHNESS, "Non-Color")):
    node = nodes.new("ShaderNodeTexImage")
    node.name = f"RUG_ImageTexture_{label}"
    node.label = label
    node.image = bpy.data.images.load(str(path))
    node.image.colorspace_settings.name = space
    images[label] = node
links.new(images["BaseColor"].outputs["Color"], bsdf.inputs["Base Color"])
fabric_coordinates = nodes.new("ShaderNodeUVMap")
fabric_coordinates.name = "RUG_FabricTiled_Coordinates"
fabric_coordinates.uv_map = fabric_uv.name
for label in ("Normal", "Roughness"):
    images[label].extension = "REPEAT"
    links.new(fabric_coordinates.outputs["UV"], images[label].inputs["Vector"])
links.new(images["Roughness"].outputs["Color"], bsdf.inputs["Roughness"])
normal_map = nodes.new("ShaderNodeNormalMap")
normal_map.name = "RUG_Woven_NormalMap"
normal_map.inputs["Strength"].default_value = .66
links.new(images["Normal"].outputs["Color"], normal_map.inputs["Color"])
links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
mesh.materials.append(material)
export_objects = [rug]

if PILE:
    # A shallow upholstered backing keeps the original footprint and elevation.
    backing_material = bpy.data.materials.new("RUG_DeepPlum_WovenBacking")
    backing_material.diffuse_color = (.055, .021, .083, 1)
    backing_material.use_nodes = True
    backing_material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.055, .021, .083, 1)
    backing_material.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = .96
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-.7, -2.3, .015))
    backing = bpy.context.object
    backing.name = "RUG_WovenBacking_25mm"
    backing.dimensions = (width, depth, .025)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    backing.data.materials.append(backing_material)
    bevel = backing.modifiers.new("Soft woven edge", "BEVEL")
    bevel.width = .012
    bevel.segments = 2
    backing.modifiers.new("Weighted backing normals", "WEIGHTED_NORMAL")
    export_objects.append(backing)

    # A shallow, continuously woven surface produces soft shading without
    # individual upright blades reading as grass. Only the perimeter has yarn ends.
    rug.hide_render = True
    export_objects.remove(rug)
    rng = random.Random(54182)
    vertices, faces, uv0_at_vertex, uv1_at_vertex = [], [], [], []
    columns, rows = 170, 134
    for row in range(rows + 1):
        for col in range(columns + 1):
            u, v = col / columns, row / rows
            x, y = (u-.5)*width, (v-.5)*depth
            edge = min(u, v, 1-u, 1-v)
            relief = .0032 + .0018*math.sin(x*31.7)*math.sin(y*29.1)
            relief += rng.uniform(-.00045, .00045)
            if edge < .015:
                relief *= .55 + edge*30
            vertices.append((x, y, relief))
            uv0_at_vertex.append((u, v))
            uv1_at_vertex.append((u*16, v*13))
    for row in range(rows):
        for col in range(columns):
            a = row*(columns+1)+col
            faces.extend(((a, a+1, a+columns+2), (a, a+columns+2, a+columns+1)))

    # A sparse, irregular fringe breaks the otherwise ruler-straight silhouette.
    edge_yarn_count = 0
    for edge_index in range(4):
        edge_length = width if edge_index < 2 else depth
        count = int(edge_length / .025)
        for n in range(count):
            t = (n + rng.uniform(.05, .95)) / count
            if edge_index == 0:
                x, y, outward = (t-.5)*width, -depth/2, (0,-1)
            elif edge_index == 1:
                x, y, outward = (t-.5)*width, depth/2, (0,1)
            elif edge_index == 2:
                x, y, outward = -width/2, (t-.5)*depth, (-1,0)
            else:
                x, y, outward = width/2, (t-.5)*depth, (1,0)
            root = len(vertices)
            h = rng.uniform(.009, .017)
            dx, dy = -outward[1], outward[0]
            lean = rng.uniform(.004, .013)
            vertices.extend(((x-dx*.004, y-dy*.004, .002),
                             (x+dx*.004, y+dy*.004, .002),
                             (x+outward[0]*lean, y+outward[1]*lean, h)))
            faces.append((root, root+1, root+2))
            uv_art = ((x+width/2)/width, (y+depth/2)/depth)
            uv_art = (min(1,max(0,uv_art[0])), min(1,max(0,uv_art[1])))
            uv0_at_vertex.extend((uv_art,)*3)
            uv1_at_vertex.extend(((uv_art[0]*16,uv_art[1]*13),)*3)
            edge_yarn_count += 1
    pile_mesh = bpy.data.meshes.new("RUG_SoftWovenSurface_Geometry")
    pile_mesh.from_pydata(vertices, [], faces)
    pile_mesh.update()
    pile_art_uv = pile_mesh.uv_layers.new(name="RUG_FullImage_UV")
    pile_fabric_uv = pile_mesh.uv_layers.new(name="RUG_FabricTiled_UV")
    for loop in pile_mesh.loops:
        pile_art_uv.data[loop.index].uv = uv0_at_vertex[loop.vertex_index]
        pile_fabric_uv.data[loop.index].uv = uv1_at_vertex[loop.vertex_index]
    pile_mesh.uv_layers.active = pile_art_uv
    for polygon in pile_mesh.polygons[:columns*rows*2]:
        polygon.use_smooth = True
    pile_mesh.materials.append(material)
    pile = bpy.data.objects.new("RUG_ShortPlushPile_OneMesh", pile_mesh)
    collection.objects.link(pile)
    pile.location = rug.location
    pile["asset_id"] = "RUG_STARMoon_PILE_TEST"
    export_objects.append(pile)

camera_data = bpy.data.cameras.new("TEST_Camera")
camera = bpy.data.objects.new("TEST_Camera", camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = (4.5, 3.0, 5.2)
target = Vector(rug.location)
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 45
bpy.context.scene.camera = camera
for index, (location, energy, tone) in enumerate((((-4, -1, 6), 850, (1, .85, .76)),
                                                  ((3, -5, 4), 550, (.76, .8, 1)))):
    lamp_data = bpy.data.lights.new(f"TEST_Softbox_{index}", "AREA")
    lamp_data.energy = energy
    lamp_data.color = tone
    lamp_data.size = 5
    lamp = bpy.data.objects.new(f"TEST_Softbox_{index}", lamp_data)
    bpy.context.scene.collection.objects.link(lamp)
    lamp.location = location
    lamp.rotation_euler = (target - lamp.location).to_track_quat("-Z", "Y").to_euler()

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEWS / ("rug-pile-blender-overview.png" if PILE else "rug-material-blender-overview.png"))
bpy.ops.render.render(write_still=True)

camera.location = (1.1, -1.5, .85)
camera.rotation_euler = (Vector((-.7, -2.3, .028)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 60
scene.render.filepath = str(PREVIEWS / ("rug-pile-blender-close.png" if PILE else "rug-material-blender-close.png"))
bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / ("rug-star-moon-pile-test.blend" if PILE else "rug-star-moon-material-test.blend")))
bpy.ops.object.select_all(action="DESELECT")
for candidate in export_objects:
    candidate.select_set(True)
bpy.context.view_layer.objects.active = pile if PILE else rug
bpy.ops.export_scene.gltf(filepath=str(PUBLIC / ("rug-star-moon-pile-test.glb" if PILE else "rug-star-moon-material-test.glb")),
                          export_format="GLB", use_selection=True, export_apply=True, export_yup=True)

report = {
    "mesh": rug.name,
    "dimensions_m": [width, depth],
    "blender_location": list(rug.location),
    "three_world_location_expected": [-.7, .028, 2.3],
    "uv_layer_base_color": uv.name,
    "uv_layer_fabric": fabric_uv.name,
    "uv_corners": [[0,0], [1,0], [1,1], [0,1]],
    "fabric_uv_corners": [[0,0], [16,0], [16,13], [0,13]],
    "material": material.name,
    "image_nodes": {name: str(node.image.filepath) for name, node in images.items()},
    "normal_strength": normal_map.inputs["Strength"].default_value,
    "map_source": "https://polyhaven.com/a/poly_wool_herringbone",
    "map_license": "CC0",
    "pile_geometry": PILE,
    "pile_surface_cells": columns * rows if PILE else 0,
    "pile_edge_yarns": edge_yarn_count if PILE else 0,
    "pile_triangles": len(faces) if PILE else 0,
}
(OUT / "material-audit.json").write_text(json.dumps(report, indent=2))
print("RUG_MATERIAL_TEST_COMPLETE", report)
