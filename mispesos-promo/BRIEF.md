---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Tus pesos, en orden. Sin anotar nada."
destination: youtube
aspect: "16:9"
language: es
length: 30
angle: promo de marca (criterio wissmotion/criterios/promo-marca.md)
---

# MisPesos — promo de marca (30 s)

## Intent

Mostrar el nivel de WissMotion con un promo estilo Apple/Intently para
MisPesos (PWA de finanzas RD): una idea por plano, UI reconstruida en HTML y
vista de cerca, objetos 3D protagonistas, pausa en el beneficio clave y
cierre quieto.

## Customizations

- Criterio `promo-marca`: 3 colores (fondo #f1f6fa, tinta #0f172a, verde de
  marca #20d472); el azul #2177ff solo dentro de la UI de la app.
- En móvil no se muestran la barra de navegación ni el aviso de Gmail (pedido
  del usuario).
- Datos: usuario demo de la BD de desarrollo (`scripts/seed-demo-video.ts` en
  MisPesos), cifras idénticas a las capturas de `capturas/`.

## Assets

- `assets/moneda-rd.webm`, `assets/tarjeta.png`: generador Three.js de
  `wissmotion/objetos-3d/`.
- `assets/nubi.webm`: Nubi modelado y renderizado con Blender en consola
  (`wissmotion/objetos-3d/blender/nubi.py`, Cycles, 48 fotogramas, bucle).
- `audio/refreshed_30s.mp3`: `Refreshed.mp3` desde el segundo 12; 96 BPM
  (beats/), cortes cada compás de 2,5 s desde 2,70 s.
