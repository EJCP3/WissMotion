# Nubi (mascota de MisPesos) en 3D, modelada solo con código, y render con
# Cycles: balanceo suave en bucle, fondo transparente (frames PNG RGBA).
# blender -b --factory-startup -P nubi.py -- --out dir/ [--frames 72 --res 720 --samples 32]
# Ejemplo de mascota de marca para WissMotion (los ojos miran a cámara, así
# que no gira 360°: se balancea).
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument("--out", required=True)
p.add_argument("--frames", type=int, default=72)
p.add_argument("--res", type=int, default=720)
p.add_argument("--samples", type=int, default=32)
args = p.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def lin(hex_color):
    h = hex_color.lstrip("#")
    return [((int(h[i : i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)] + [1]


def principled(name, rough, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Coat Weight"].default_value = coat
    return m, bsdf


root = bpy.data.objects.new("nubi", None)
scene.collection.objects.link(root)

# Cuerpo: metabolas = nube blanda de una pieza (como el logo).
mb = bpy.data.metaballs.new("nube")
mb.resolution = 0.06
mb.render_resolution = 0.025
for x, z, r in [
    (0.1, 0.62, 1.2),  # copa
    (-0.85, 0.05, 0.88),  # izquierda
    (0.95, 0.0, 0.85),  # derecha
    (-0.45, -0.4, 0.85),
    (0.5, -0.4, 0.85),
    (-1.3, -0.38, 0.58),
    (1.35, -0.38, 0.56),
    (0.0, -0.45, 0.95),
]:
    el = mb.elements.new()
    el.co = (x, 0, z)
    el.radius = r
body = bpy.data.objects.new("nube", mb)
body.parent = root
scene.collection.objects.link(body)

# Degradado: blanco arriba, azul claro abajo (como el logo).
mat, bsdf = principled("nube", 0.38, coat=0.35)
nodes, links = mat.node_tree.nodes, mat.node_tree.links
coord = nodes.new("ShaderNodeTexCoord")
sep = nodes.new("ShaderNodeSeparateXYZ")
ramp = nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.15
ramp.color_ramp.elements[0].color = lin("#86ace0")
ramp.color_ramp.elements[1].position = 0.75
ramp.color_ramp.elements[1].color = lin("#ffffff")
links.new(coord.outputs["Generated"], sep.inputs[0])
links.new(sep.outputs["Z"], ramp.inputs["Fac"])
links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
body.data.materials.append(mat)

# Ojos: elipsoides azul noche con brillo y un "$" blanco.
eye_mat, eye_bsdf = principled("ojo", 0.15, coat=1.0)
eye_bsdf.inputs["Base Color"].default_value = lin("#0f1f45")
white_mat, white_bsdf = principled("brillo", 0.3)
white_bsdf.inputs["Base Color"].default_value = lin("#e8edf6")
white_bsdf.inputs["Emission Color"].default_value = lin("#ffffff")
white_bsdf.inputs["Emission Strength"].default_value = 0.6

for sx in (-1, 1):
    x = 0.36 * sx
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1, location=(x, -1.08, 0.0))
    eye = bpy.context.active_object
    eye.scale = (0.19, 0.13, 0.29)
    bpy.ops.object.shade_smooth()
    eye.data.materials.append(eye_mat)
    eye.parent = root

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.06, location=(x - 0.055, -1.21, 0.12))
    shine = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    shine.data.materials.append(white_mat)
    shine.parent = root

    bpy.ops.object.text_add(location=(x + 0.05, -1.215, -0.07))
    dollar = bpy.context.active_object
    dollar.data.body = "$"
    dollar.data.size = 0.17
    dollar.data.extrude = 0.006
    dollar.data.align_x = "CENTER"
    dollar.data.align_y = "CENTER"
    dollar.rotation_euler = (math.radians(90), 0, 0)
    dollar.data.materials.append(white_mat)
    dollar.parent = root

# Balanceo en bucle (no gira: los ojos miran a cámara).
scene.frame_start = 1
scene.frame_end = args.frames
for f in range(1, args.frames + 2, 6):
    t = (f - 1) / args.frames
    root.rotation_euler = (0, 0, math.sin(t * 2 * math.pi) * 0.22)
    root.location = (0, 0, math.sin(t * 4 * math.pi) * 0.06)
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("location", frame=f)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 88
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -11, 0.9)
cam.rotation_euler = (math.radians(85.5), 0, 0)
scene.camera = cam


def area(name, loc, energy, size):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.size = size
    obj = bpy.data.objects.new(name, light)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(obj)


area("key", (4, -5, 5), 1500, 5)
area("fill", (-5, -4, 1), 450, 6)
area("rim", (0, 5, 4), 700, 4)

world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.82, 0.86, 0.92, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
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
