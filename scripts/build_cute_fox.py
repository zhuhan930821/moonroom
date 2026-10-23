"""J02/J05 cute fox: a chibi fox (big head, round body, huge fluffy tail) in two poses.

Run: blender -b -P scripts/build_cute_fox.py
Writes public/assets/models/collectibles/fox-sit.glb and fox-sleep.glb, the .blend source,
and Eevee previews. Both GLBs share node names so src/scene/Foxes.jsx can animate either:
  Fox_Body, Fox_Head (pivot at the neck), Ear_L / Ear_R (pivot at the ear base),
  Eyes_Open, Eyes_Closed, Fox_Tail (pivot at the tail root).
Blender axes: -Y is the fox's front (glTF export turns it into three.js +Z), Z up, metres.
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector, Euler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/models/collectibles"
SRC = ROOT / "assets-source/collectibles/cute-fox"
PREVIEW = ROOT / "screenshots/cute-fox"
for d in (OUT, SRC, PREVIEW):
    d.mkdir(parents=True, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, rough=.85, sheen=0.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    if sheen:
        p.inputs["Sheen Weight"].default_value = sheen
        p.inputs["Sheen Tint"].default_value = (1, .92, .85, 1)
    if emit:
        p.inputs["Emission Color"].default_value = (*color, 1)
        p.inputs["Emission Strength"].default_value = emit
    return m


def mats():
    return {
        "fur": material("Fox_Fur_Orange", (.78, .27, .07), .9, .25),
        "cream": material("Fox_Fur_Cream", (.97, .88, .76), .9, .2),
        "dark": material("Fox_Fur_Dark", (.20, .12, .11), .8, .3),
        "inner": material("Fox_Ear_Inner", (.97, .70, .66), .85),
        "eye": material("Fox_Eye", (.06, .04, .07), .12),
        "shine": material("Fox_Eye_Shine", (1, 1, 1), .3),  # no emission: room bloom would blow it out
        "nose": material("Fox_Nose", (.12, .07, .08), .3),
        "blush": material("Fox_Blush", (.98, .55, .58), .9),
    }


def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def blob(name, balls, mat, parent=None, voxel=.009):
    """Soft union of ellipsoids → one smooth mesh (spheres joined, voxel-remeshed, relaxed).
    balls: [(center, radius, scale xyz)] in the parent's space."""
    parts = []
    for center, radius, scale in balls:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, location=center)
        o = bpy.context.object
        o.scale = [radius * k for k in scale]
        parts.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = name
    remesh = mesh.modifiers.new("union", "REMESH"); remesh.mode = "VOXEL"; remesh.voxel_size = voxel
    smooth = mesh.modifiers.new("plush", "SMOOTH"); smooth.factor = .9; smooth.iterations = 12
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate = mesh.modifiers.new("light", "DECIMATE"); decimate.ratio = .35
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    mesh.data.materials.clear(); mesh.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        mesh.parent = parent
    return mesh


def sphere(name, loc, scale, mat, parent=None, rot=(0, 0, 0), segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        o.parent = parent
    return o


def ear(side, head, m, pos, tilt):
    pivot = empty(f"Ear_{'L' if side > 0 else 'R'}", pos, head)
    pivot.rotation_euler = Euler((tilt[0], side * tilt[1], side * tilt[2]))
    # Soft rounded cone: a few stacked ellipsoid balls give a plush, not pointy, ear.
    outer = blob(f"Ear_Outer_{side}", [((0, 0, .03), .1, (1, .55, 1)), ((0, 0, .1), .075, (1, .5, 1)), ((0, 0, .16), .045, (1, .5, 1))], m["fur"], pivot)
    inner = blob(f"Ear_Inner_{side}", [((0, -.022, .05), .065, (1, .3, 1)), ((0, -.022, .11), .045, (1, .3, 1))], m["inner"], pivot)
    tip = blob(f"Ear_Tip_{side}", [((0, 0, .175), .04, (1, .55, 1)), ((0, 0, .2), .022, (1, .5, 1))], m["dark"], pivot)
    return pivot


def face(head, m):
    # Big glossy eyes with two highlights each; closed eyes are soft happy arcs.
    open_ = empty("Eyes_Open", (0, 0, 0), head)
    closed = empty("Eyes_Closed", (0, 0, 0), head)
    for side in (-1, 1):
        x = side * .105
        sphere(f"Eye_{side}", (x, -.268, .05), (.058, .03, .074), m["eye"], open_)
        sphere(f"Eye_Shine_{side}", (x + .02, -.294, .08), (.019, .01, .021), m["shine"], open_, segments=16)
        sphere(f"Eye_Shine2_{side}", (x - .018, -.294, .025), (.009, .006, .009), m["shine"], open_, segments=12)
        bpy.ops.mesh.primitive_torus_add(major_radius=.045, minor_radius=.008, location=(x, -.285, .05), rotation=(math.pi / 2, 0, 0))
        arc = bpy.context.object
        arc.name = f"Eye_Closed_{side}"
        arc.data.materials.append(m["eye"])
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        for v in arc.data.vertices:
            v.select = v.co.y > -.01  # local Y of the rotated torus = world up: keep the lower half → ‿ smile
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.delete(type="VERT")
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.shade_smooth()
        arc.parent = closed
        sphere(f"Blush_{side}", (side * .17, -.235, -.03), (.048, .014, .03), m["blush"], head, rot=(0, 0, -side * .5))
    sphere("Nose", (0, -.33, -.015), (.034, .026, .026), m["nose"], head)
    sphere("Nose_Shine", (.008, -.353, -.005), (.008, .005, .006), m["shine"], head, segments=12)
    return open_, closed


def build_head(parent, m, loc):
    head = empty("Fox_Head", loc, parent)
    blob("Head_Fur", [((0, -.02, .02), .27, (1.12, 1, .92)),          # big round skull
                      ((-.17, -.1, -.08), .1, (1, .8, .7)), ((.17, -.1, -.08), .1, (1, .8, .7))],  # cheek fluff
         m["fur"], head)
    blob("Head_Cream", [((0, -.24, -.07), .12, (1.1, .75, .7)),       # muzzle
                        ((-.13, -.18, -.1), .095, (1, .7, .75)), ((.13, -.18, -.1), .095, (1, .7, .75))],
         m["cream"], head)
    face(head, m)
    for side in (1, -1):
        ear(side, head, m, (side * .15, .0, .2), (.12, .0, -.32))
    return head


def resample(path, count):
    """Catmull-Rom through (point, radius) knots → `count` tightly overlapping balls."""
    pts = [Vector(p) for p, _ in path]; rad = [r for _, r in path]
    pts = [pts[0]] + pts + [pts[-1]]; rad = [rad[0]] + rad + [rad[-1]]
    out = []
    for i in range(count):
        u = i / (count - 1) * (len(path) - 1); k = min(int(u), len(path) - 2); t = u - k
        p0, p1, p2, p3 = pts[k:k + 4]
        point = .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
        out.append((point, rad[k + 1] + (rad[k + 2] - rad[k + 1]) * t))
    return out


def build(pose):
    reset()
    m = mats()
    root = empty("Fox", (0, 0, 0))
    if pose == "sit":
        body = blob("Fox_Body", [((0, .06, .25), .26, (1, 1.05, 1.15)),     # pear body
                                 ((-.16, .14, .12), .15, (1, 1.2, .9)), ((.16, .14, .12), .15, (1, 1.2, .9)),  # haunches
                                 ((-.09, -.12, .1), .065, (1, 1, 2.0)), ((.09, -.12, .1), .065, (1, 1, 2.0))],  # front legs
                    m["fur"], root)
        blob("Chest_Cream", [((0, -.13, .3), .15, (1, .7, 1.25))], m["cream"], body)
        blob("Paws", [((-.09, -.16, .03), .06, (1, 1.3, .6)), ((.09, -.16, .03), .06, (1, 1.3, .6))], m["dark"], body)
        head = build_head(root, m, (0, -.06, .62))
        tail_root = (0, .3, .1)
        tail_path = [((0, .38, .08), .12), ((.14, .48, .14), .16), ((.3, .44, .26), .17), ((.4, .3, .38), .14)]
        tip = ((.44, .2, .46), .1)
    else:  # curled up asleep, tail wrapped around the front
        body = blob("Fox_Body", [((0, .05, .16), .3, (1.05, 1.2, .62)),
                                 ((.16, .2, .12), .15, (1, 1.2, .7)), ((-.12, -.18, .07), .07, (1.6, 1, .6))],
                    m["fur"], root)
        blob("Chest_Cream", [((-.12, -.2, .14), .12, (1, .8, .9))], m["cream"], body)
        head = build_head(root, m, (-.17, -.3, .22))
        head.rotation_euler = Euler((-.2, .25, .55))
        tail_root = (.12, .32, .12)
        tail_path = [((.2, .36, .12), .13), ((.36, .14, .12), .16), ((.32, -.16, .13), .16), ((.1, -.42, .12), .13)]
        tip = ((-.1, -.52, .11), .1)
    tail = empty("Fox_Tail", tail_root, root)
    tail_mesh = blob("Tail_Fur", [(c - Vector(tail_root), r, (1, 1, 1)) for c, r in resample(tail_path, 30)], m["fur"])
    tip_mesh = blob("Tail_Tip", [(Vector(tip[0]) - Vector(tail_root), tip[1], (1, 1, 1))], m["cream"])
    for o in (tail_mesh, tip_mesh):
        o.parent = tail
    return root


# Every child is authored in its parent's local space (Python parenting keeps an identity
# parent-inverse), so pivots can rotate their parts.
def export(pose):
    root = build(pose)
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC / f"fox-{pose}.blend"))
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"fox-{pose}.glb"), export_format="GLB", use_selection=False, export_apply=True)
    render(pose)


def render(pose):
    scene = bpy.context.scene
    # Preview shows the pose's natural eyes (the runtime toggles these nodes).
    hide = bpy.data.objects.get('Eyes_Open' if pose == 'sleep' else 'Eyes_Closed')
    for o in ([hide] + list(hide.children_recursive) if hide else []): o.hide_render = True
    scene.render.engine = "CYCLES"  # Eevee hangs in background mode on integrated GPUs
    scene.cycles.device = "CPU"; scene.cycles.samples = 48; scene.cycles.use_denoising = True
    scene.render.resolution_percentage = 70
    scene.render.resolution_x, scene.render.resolution_y = 900, 900
    world = bpy.data.worlds.new("w"); scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (.32, .25, .36, 1)
    bpy.ops.object.light_add(type="AREA", location=(-1.2, -1.6, 1.8)); key = bpy.context.object
    key.data.energy = 220; key.data.size = 1.5; key.rotation_euler = Euler((.9, 0, -.6))
    bpy.ops.object.light_add(type="AREA", location=(1.4, .8, 1.2)); rim = bpy.context.object
    rim.data.energy = 120; rim.data.color = (.75, .7, 1); rim.rotation_euler = Euler((-.9, .6, 2.4))
    bpy.ops.mesh.primitive_plane_add(size=6); floor = bpy.context.object
    floor.data.materials.append(material("Floor", (.45, .32, .3), 1))
    bpy.ops.object.camera_add(location=(1.25, -1.75, .95)); cam = bpy.context.object
    scene.camera = cam
    target = Vector((.08, .05, .4 if pose == "sit" else .18))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50
    scene.render.filepath = str(PREVIEW / f"blender-{pose}.png")
    bpy.ops.render.render(write_still=True)


for pose in ("sit", "sleep"):
    export(pose)
print("FOX_DONE")
