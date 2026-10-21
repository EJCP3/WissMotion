# Render de giro (turntable) con Cycles y fondo transparente.
# blender -b --factory-startup -P render_turntable.py -- --input m.glb --out dir/
#   [--frames 96] [--res 1080] [--samples 48] [--color #2f55ff] [--metal 0.3]
# Salida: dir/frame_0001.png … (RGBA). blender.mjs la pasa a WebM con alfa.
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument("--input", required=True)
p.add_argument("--out", required=True)
p.add_argument("--frames", type=int, default=96)
p.add_argument("--res", type=int, default=1080)
p.add_argument("--samples", type=int, default=48)
p.add_argument("--color", default=None, help="Tiñe todos los materiales (hex)")
p.add_argument("--metal", type=float, default=None)
args = p.parse_args(argv)

# Escena vacía (factory-startup trae cubo, cámara y luz).
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

src = Path(args.input)
ext = src.suffix.lower()
if ext in (".glb", ".gltf"):
    bpy.ops.import_scene.gltf(filepath=str(src))
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=str(src))
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=str(src))
else:
    sys.exit(f"formato no soportado: {ext} (usa .glb/.gltf/.obj/.fbx; un .blend se exporta antes con `export`)")

meshes = [o for o in scene.objects if o.type == "MESH"]
if not meshes:
    sys.exit("el modelo no tiene mallas")

# Centrar en el origen y normalizar a 2 unidades de alto/ancho máximo.
bpy.context.view_layer.update()
lo = Vector((math.inf,) * 3)
hi = Vector((-math.inf,) * 3)
for o in meshes:
    for corner in o.bound_box:
        w = o.matrix_world @ Vector(corner)
        lo = Vector(map(min, lo, w))
        hi = Vector(map(max, hi, w))
size = max(hi - lo)
pivot = bpy.data.objects.new("pivot", None)
scene.collection.objects.link(pivot)
for o in scene.objects:
    if o is not pivot and o.parent is None:
        o.parent = pivot
        o.location -= (lo + hi) / 2
pivot.scale = (2 / size,) * 3

if args.color or args.metal is not None:
    rgb = None
    if args.color:
        h = args.color.lstrip("#")
        # hex sRGB → lineal (Blender trabaja en lineal)
        rgb = [((int(h[i : i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
    for o in meshes:
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.use_nodes:
                continue
            bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not bsdf:
                continue
            if rgb:
                inp = bsdf.inputs["Base Color"]
                for link in list(inp.links):
                    m.node_tree.links.remove(link)
                inp.default_value = (*rgb, 1)
            if args.metal is not None:
                bsdf.inputs["Metallic"].default_value = args.metal

# Giro de 360° que cierra el bucle: el fotograma N+1 sería igual al 1.
scene.frame_start = 1
scene.frame_end = args.frames
pivot.rotation_euler = (0, 0, 0)
pivot.keyframe_insert("rotation_euler", index=2, frame=1)
pivot.rotation_euler = (0, 0, 2 * math.pi)
pivot.keyframe_insert("rotation_euler", index=2, frame=args.frames + 1)
for fc in pivot.animation_data.action.fcurves if hasattr(pivot.animation_data.action, "fcurves") else []:
    for k in fc.keyframe_points:
        k.interpolation = "LINEAR"
# Blender 5 (acciones por capas): las curvas viven en los canales del slot.
action = pivot.animation_data.action
for layer in getattr(action, "layers", []):
    for strip in layer.strips:
        for bag in strip.channelbags:
            for fc in bag.fcurves:
                for k in fc.keyframe_points:
                    k.interpolation = "LINEAR"

# Cámara y luces de estudio.
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 85
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -7.2, 1.2)
cam.rotation_euler = (math.radians(81), 0, 0)
scene.camera = cam


def area(name, loc, energy, size):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.size = size
    obj = bpy.data.objects.new(name, light)
    obj.location = loc
    direction = Vector((0, 0, 0)) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(obj)


area("key", (4, -4, 4), 900, 4)
area("fill", (-5, -3, 2), 350, 5)
area("rim", (0, 5, 4), 600, 3)

world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.82, 0.86, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
scene.world = world

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = args.res
scene.render.resolution_y = args.res
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(Path(args.out) / "frame_")
scene.view_settings.view_transform = "AgX"

bpy.ops.render.render(animation=True)
print(f"WM_OK {args.frames} fotogramas en {args.out}")
