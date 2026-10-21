# Exporta un .blend a .glb (modificadores aplicados) para cargarlo en el
# generador Three.js: blender -b archivo.blend -P export_glb.py -- --out m.glb
import argparse
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument("--out", required=True)
args = p.parse_args(argv)

bpy.ops.export_scene.gltf(filepath=args.out, export_format="GLB", export_apply=True)
print(f"WM_OK {args.out}")
