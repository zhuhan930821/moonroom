"""Fast neutral layout review for the saved Phase 1 Blender architecture."""
import bpy
import os
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets-source', 'architecture', 'moonroom-architecture-phase1.blend')
OUT = os.path.join(ROOT, 'screenshots', 'architecture-phase-1')
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.display.shading.light = 'STUDIO'
scene.display.shading.studio_light = 'paint.sl'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.background_type = 'VIEWPORT'
scene.display.shading.background_color = (.18,.16,.23)
for name, camera_name in (
    ('front_wide','PREVIEW_Camera_Front'),
    ('west_drum_context','PREVIEW_Camera_West'),
    ('east_lounge_context','PREVIEW_Camera_East'),
    ('west_loft_detail','PREVIEW_Camera_Loft'),
):
    if camera_name not in bpy.data.objects:
        data=bpy.data.cameras.new(camera_name)
        camera=bpy.data.objects.new(camera_name,data)
        scene.collection.objects.link(camera)
        camera.location=(-2.2,1.95,2.0)
        data.lens=30
    scene.camera = bpy.data.objects[camera_name]
    targets = {
        'front_wide': (0,2.56,-5.2),
        'west_drum_context': (-5.4,3.1,-5.2),
        'east_lounge_context': (3.4,3.1,-5.2),
        'west_loft_detail': (-8.0,4.5,4.3),
    }
    cam = scene.camera
    forward = (Vector(targets[name])-cam.location).normalized()
    right = forward.cross(Vector((0,1,0))).normalized()
    up = right.cross(forward).normalized()
    cam.rotation_euler = Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
    scene.render.filepath = os.path.join(OUT,name+'.png')
    bpy.ops.render.render(write_still=True)
    print('RENDER',scene.render.filepath)
bpy.ops.wm.save_as_mainfile(filepath=SOURCE)
