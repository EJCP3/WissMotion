# Modelo de ejemplo hecho solo con código: una pera (como la de PrizePicks).
# Plantilla para que un agente modele objetos nuevos por script.
# blender -b --factory-startup -P ejemplo_pera.py -- --out pera.glb [--color #9bd13a]
import argparse
import math
import sys

import bmesh
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument("--out", required=True)
p.add_argument("--color", default="#9bd13a")
args = p.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, hex_color, metal, rough):
    h = hex_color.lstrip("#")
    rgb = [((int(h[i : i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    return m


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# Cuerpo: esfera deformada con un perfil de pera (ancha abajo, cuello arriba).
mesh = bpy.data.meshes.new("pera")
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=1)
for v in bm.verts:
    t = (v.co.z + 1) / 2  # 0 abajo, 1 arriba
    neck = 1 - 0.5 * smoothstep(0.45, 1.0, t)
    bulge = 1 + 0.08 * math.sin(t * math.pi)
    v.co.x *= neck * bulge
    v.co.y *= neck * bulge
    v.co.z *= 1.3
bm.to_mesh(mesh)
bm.free()
for poly in mesh.polygons:
    poly.use_smooth = True
body = bpy.data.objects.new("pera", mesh)
scene.collection.objects.link(body)
body.data.materials.append(material("piel", args.color, 0.35, 0.18))
sub = body.modifiers.new("suave", "SUBSURF")
sub.levels = 1

# Rabito.
bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.5, location=(0.05, 0, 1.45))
stem = bpy.context.active_object
stem.rotation_euler = (0, math.radians(14), 0)
stem.data.materials.append(material("rabito", "#5a3a1e", 0.0, 0.6))

bpy.ops.export_scene.gltf(filepath=args.out, export_format="GLB", export_apply=True)
print(f"WM_OK {args.out}")
