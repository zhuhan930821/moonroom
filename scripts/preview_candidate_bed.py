"""Render the user-supplied bed GLB without changing Moonroom assets."""
import bpy
import math
from mathutils import Vector

SOURCE = "assets-source/third-party/sketchfab-messy-bed-2/original.glb"
OUTPUT = "screenshots/candidate-messy-bed-neutral.png"
BLEND = "assets-source/third-party/sketchfab-messy-bed-2/candidate-preview.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

# The source uses a nested Sketchfab transform. Evaluate world-space extents.
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
mins = Vector(min(p[i] for p in points) for i in range(3))
maxs = Vector(max(p[i] for p in points) for i in range(3))
center = (mins + maxs) * 0.5
print("BED_BOUNDS", tuple(round(x, 3) for x in mins), tuple(round(x, 3) for x in maxs))

for root in [obj for obj in bpy.context.scene.objects if obj.parent is None]:
    root.location -= Vector((center.x, center.y, mins.z))

floor_mat = bpy.data.materials.new("Neutral warm floor")
floor_mat.diffuse_color = (0.45, 0.38, 0.43, 1)
floor_mat.use_nodes = True
floor_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.45, 0.38, 0.43, 1)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.018))
floor = bpy.context.object
floor.name = "Preview floor (not an asset)"
floor.data.materials.append(floor_mat)

def area(name, location, power, size, color):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = power
    light_data.shape = "DISK"
    light_data.size = size
    light_data.color = color
    obj = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 0.6)) - obj.location).to_track_quat("-Z", "Y").to_euler()

span = max((maxs - mins).x, (maxs - mins).y)
area("Softbox key", (span * 1.6, -span * 1.8, span * 2), 750, 5, (1, 0.88, 0.78))
area("Softbox fill", (-span * 1.2, span * 1.5, span * 1.4), 420, 4, (0.78, 0.83, 1))
camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (span * 1.35, -span * 1.55, span * 1.05)
target = Vector((0, 0, (maxs.z - mins.z) * 0.35))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = span * 1.65
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 32
bpy.context.scene.render.resolution_x = 1000
bpy.context.scene.render.resolution_y = 700
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.filepath = OUTPUT
bpy.context.scene.world.color = (0.45, 0.45, 0.45)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.render.render(write_still=True)
