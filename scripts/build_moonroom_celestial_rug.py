"""Create an opt-in Moonroom celestial textile rug GLB and Blender preview.

The selected Sketchfab reference is not included: its download needs account
authorization. This is an original Blender mesh and baked realtime PBR maps.
Run: blender -b -P scripts/build_moonroom_celestial_rug.py
"""

from pathlib import Path
import math
import random
import site
import sys
import bpy
import numpy as np
sys.path.append(site.getusersitepackages())  # Blender omits the user site by default.
from PIL import Image, ImageDraw
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets-source/collectibles/celestial-rug"
TEXTURES = OUT / "textures"
PREVIEWS = OUT / "previews"
for directory in (TEXTURES, PREVIEWS):
    directory.mkdir(parents=True, exist_ok=True)

random.seed(20261021)
size = 2048
noise = np.random.default_rng(42)
yy, xx = np.mgrid[0:size, 0:size]

def tiled_photo(filename):
    source = Image.open(TEXTURES / filename).convert("RGB")
    tile = source.resize((math.ceil(size / 12), math.ceil(size / 9)), Image.Resampling.LANCZOS)
    output = Image.new("RGB", (size, size))
    for row in range(9):
        for col in range(12):
            output.paste(tile, (col * tile.width, row * tile.height))
    return output

# Poly Haven's photographed teddy pile supplies the actual textile microform.
# Colorize only the albedo; its measured normal and roughness keep the fibers.
photo = np.asarray(tiled_photo("curly_teddy_natural_diff_1k.jpg"), dtype=np.float32)
luma = photo.mean(axis=2) / 255
variation = np.clip(.70 + (luma - .72) * 1.75, .55, 1.23)
base = np.empty((size, size, 3), dtype=np.uint8)
for channel, value in enumerate((69, 42, 96)):
    base[:, :, channel] = np.clip(value * variation, 0, 255)
color = Image.fromarray(base, "RGB")
draw = ImageDraw.Draw(color)

def star(cx, cy, outer, inner, fill, points=5):
    vertices = []
    for i in range(points * 2):
        angle = -math.pi / 2 + i * math.pi / points
        radius = outer if i % 2 == 0 else inner
        vertices.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(vertices, fill=fill)

gold = (220, 184, 132)
ivory = (226, 202, 195)
muted = (177, 139, 182)
for inset, width, tone in ((43, 8, gold), (69, 3, muted), (110, 4, gold)):
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=68, outline=tone, width=width)
for x in range(155, size - 120, 180):
    for y in (86, size - 86):
        star(x, y, 12, 5, gold)
for y in range(170, size - 140, 185):
    for x in (86, size - 86):
        star(x, y, 11, 4.5, gold)

# Sparse motifs leave deep-plum negative space like the reference rug.
for index in range(57):
    x = random.randint(155, size - 155)
    y = random.randint(150, size - 150)
    outer = random.choice((9, 13, 16, 22))
    star(x, y, outer, outer * .39, ivory if index % 5 == 0 else gold, 4 if index % 3 else 5)
for x, y, radius in ((390, 410, 43), (1470, 690, 35), (790, 1500, 48), (1640, 1570, 30)):
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=gold)
    draw.ellipse((x-radius*.45, y-radius*1.1, x+radius*1.55, y+radius*.9), fill=(49, 30, 75))
    star(x + radius*.65, y-radius*.8, 9, 3.5, ivory)

color_path = TEXTURES / "Celestial_Rug_BaseColor.jpg"
color.resize((1024, 1024), Image.Resampling.LANCZOS).save(color_path, quality=88, optimize=True)

normal_path = TEXTURES / "Celestial_Rug_Normal.jpg"
tiled_photo("curly_teddy_natural_nor_gl_1k.jpg").resize((1024, 1024), Image.Resampling.LANCZOS).save(normal_path, quality=88, optimize=True)
rough_path = TEXTURES / "Celestial_Rug_Roughness.jpg"
tiled_photo("curly_teddy_natural_rough_1k.jpg").resize((1024, 1024), Image.Resampling.LANCZOS).save(rough_path, quality=88, optimize=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in bpy.data.materials:
    bpy.data.materials.remove(material)

collection = bpy.data.collections.new("RUG_Celestial_Collection")
bpy.context.scene.collection.children.link(collection)
W, D, HALF_HEIGHT = 8.5, 6.7, .018
nx, nz = 40, 32
positions, faces, uvs = [], [], []
for layer in (1, -1):
    for iz in range(nz + 1):
        v = iz / nz
        for ix in range(nx + 1):
            u = ix / nx
            x, z = (u-.5)*W, (v-.5)*D
            wave = .011*math.sin(u*math.tau*2.2+v*1.1)*math.sin(v*math.tau*1.45)
            edge = max(0, (abs(u-.5)-.40)*10, (abs(v-.5)-.40)*10)
            rise = .012*edge + .020*math.exp(-((u-.13)**2/.0025+(v-.12)**2/.006))
            positions.append((x, layer*HALF_HEIGHT + wave + rise, z))
            uvs.append((u, v))
stride = (nx+1)*(nz+1)
for iz in range(nz):
    for ix in range(nx):
        a = iz*(nx+1)+ix
        faces.append((a,a+1,a+nx+2,a+nx+1))
        b = stride+a
        faces.append((b+nx+1,b+nx+2,b+1,b))
perimeter = []
perimeter += [ix for ix in range(nx+1)]
perimeter += [iz*(nx+1)+nx for iz in range(1,nz+1)]
perimeter += [nz*(nx+1)+ix for ix in range(nx-1,-1,-1)]
perimeter += [iz*(nx+1) for iz in range(nz-1,0,-1)]
for index, a in enumerate(perimeter):
    b = perimeter[(index+1)%len(perimeter)]
    faces.append((a,b,stride+b,stride+a))
mesh = bpy.data.meshes.new("Celestial_Rug_Textile_Mesh")
mesh.from_pydata(positions, [], faces)
mesh.update()
obj = bpy.data.objects.new("RUG_Moonroom_Celestial_Main", mesh)
collection.objects.link(obj)
obj.rotation_euler.x = math.pi / 2  # Mesh was authored Y-up; Blender previews are Z-up.
obj["asset_id"] = "RUG_MOONROOM_CELESTIAL_V1"
uv_layer = mesh.uv_layers.new(name="RUG_WholeSurface_UV")
for polygon in mesh.polygons:
    polygon.use_smooth = True
    for li in polygon.loop_indices:
        uv_layer.data[li].uv = uvs[mesh.loops[li].vertex_index]

material = bpy.data.materials.new("RUG_DeepPlum_Woven_PBR")
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
bsdf = nodes.get("Principled BSDF")
bsdf.inputs["Metallic"].default_value = 0
bsdf.inputs["Sheen Weight"].default_value = .35
for label, path, colorspace in (("BaseColor",color_path,"sRGB"),("Normal",normal_path,"Non-Color"),("Roughness",rough_path,"Non-Color")):
    node = nodes.new("ShaderNodeTexImage")
    node.name = f"RUG_{label}_Image"
    node.image = bpy.data.images.load(str(path))
    node.image.colorspace_settings.name = colorspace
    if label == "BaseColor": links.new(node.outputs["Color"],bsdf.inputs["Base Color"])
    elif label == "Roughness": links.new(node.outputs["Color"],bsdf.inputs["Roughness"])
    else:
        normal_node = nodes.new("ShaderNodeNormalMap")
        normal_node.inputs["Strength"].default_value = 1.0
        links.new(node.outputs["Color"],normal_node.inputs["Color"])
        links.new(normal_node.outputs["Normal"],bsdf.inputs["Normal"])
mesh.materials.append(material)

binding = bpy.data.materials.new("RUG_Binding_DustyGold")
binding.diffuse_color = (.53,.40,.48,1)
binding.use_nodes = True
binding.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.53,.40,.48,1)
binding.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = .92
curve = bpy.data.curves.new("RUG_EdgeBinding_Curve", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = .018
curve.bevel_resolution = 3
spline = curve.splines.new("POLY")
spline.points.add(len(perimeter)-1)
for i, index in enumerate(perimeter):
    x, y, z = positions[index]
    spline.points[i].co = (x,y+.005,z,1)
spline.use_cyclic_u = True
edge_obj = bpy.data.objects.new("RUG_Edge_Binding", curve)
collection.objects.link(edge_obj)
edge_obj.rotation_euler.x = math.pi / 2
curve.materials.append(binding)

# Real geometry for the pile. Short, bent, double-sided fiber ribbons rise above
# the printed backing; the extra 3D silhouette is visible at grazing angles.
fiber_materials = []
for name, tone in (
    ("RUG_Pile_Plum", (.055, .026, .085, 1)),
    ("RUG_Pile_Mauve", (.074, .040, .110, 1)),
    ("RUG_Pile_Shadow", (.034, .015, .057, 1)),
):
    pile_mat = bpy.data.materials.new(name)
    pile_mat.diffuse_color = tone
    pile_mat.use_nodes = True
    pile_mat.use_backface_culling = False
    pile_bsdf = pile_mat.node_tree.nodes.get("Principled BSDF")
    pile_bsdf.inputs["Base Color"].default_value = tone
    pile_bsdf.inputs["Roughness"].default_value = .98
    pile_bsdf.inputs["Sheen Weight"].default_value = .28
    fiber_materials.append(pile_mat)

fiber_positions, fiber_faces, fiber_tones = [], [], []
# Keep geometric fuzz only at the silhouette; triangle tufts across the face
# looked like miniature grass in the close-up and were intentionally removed.
for side in range(4):
    for index in range(1250):
        t = (index + random.random()) / 1250
        if side == 0: x,z,nx,nz = (t-.5)*W,-D/2,0,-1
        elif side == 1: x,z,nx,nz = (t-.5)*W,D/2,0,1
        elif side == 2: x,z,nx,nz = -W/2,(t-.5)*D,-1,0
        else: x,z,nx,nz = W/2,(t-.5)*D,1,0
        root_y = HALF_HEIGHT + .018
        width = random.uniform(.004,.010)
        length = random.uniform(.012,.032)
        start = len(fiber_positions)
        fiber_positions.extend(((x-nz*width,root_y,z+nx*width),
                                (x+nz*width,root_y,z-nx*width),
                                (x+nx*length,root_y+random.uniform(-.005,.014),z+nz*length)))
        fiber_faces.append((start,start+1,start+2))
        fiber_tones.append(random.choices((0,1,2),weights=(5,3,2))[0])
fiber_mesh = bpy.data.meshes.new("Celestial_Rug_Pile_Fiber_Mesh")
fiber_mesh.from_pydata(fiber_positions, [], fiber_faces)
fiber_mesh.update()
for pile_mat in fiber_materials:
    fiber_mesh.materials.append(pile_mat)
for polygon, tone in zip(fiber_mesh.polygons, fiber_tones):
    polygon.material_index = tone
fiber_obj = bpy.data.objects.new("RUG_Pile_RealTime_Fibers", fiber_mesh)
collection.objects.link(fiber_obj)
fiber_obj.rotation_euler.x = math.pi / 2

camera_data = bpy.data.cameras.new("PREVIEW_CelestialRug_Camera")
camera = bpy.data.objects.new("PREVIEW_CelestialRug_Camera", camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = (7, 8.4, 6.8)
direction = Vector((0,0,0))-camera.location
camera.rotation_euler = direction.to_track_quat("-Z","Y").to_euler()
camera_data.lens = 45
bpy.context.scene.camera = camera
world = bpy.context.scene.world
world.color = (.35,.35,.35)
for location, power, color_light, radius in (((-4,2,7),1200,(1,.84,.72),5),((5,-4,5),800,(.75,.74,1),4)):
    light_data = bpy.data.lights.new("PREVIEW_Softbox","AREA")
    light_data.energy = power
    light_data.color = color_light
    light_data.shape = "DISK"
    light_data.size = radius
    light = bpy.data.objects.new("PREVIEW_Softbox",light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0,0,0))-light.location).to_track_quat("-Z","Y").to_euler()
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEWS / "celestial-rug-blender-preview.png")
bpy.ops.render.render(write_still=True)

camera.location = (1.1, -3.65, .48)
camera.rotation_euler = (Vector((0, -1.55, .02))-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.lens = 65
scene.render.filepath = str(PREVIEWS / "celestial-rug-fiber-close.png")
bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "celestial-rug-source.blend"))
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
edge_obj.select_set(True)
fiber_obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "celestial-rug-rejected-experiment.glb"),
    export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
print("CELESTIAL_RUG_COMPLETE",len(mesh.polygons),"base faces",len(fiber_faces),"fiber faces")
