# Evaluación: ¿migrar el Studio a Vue/Nuxt? (Fase 10)

Medido el 2026-10-10 sobre `rama wissmotion` (incluye trabajo en curso de
rediseño). Comandos usados:

```powershell
Get-ChildItem packages/studio/src -Recurse -Include *.tsx,*.ts |
  Where-Object { $_.Name -notlike '*.test.*' } | Measure-Object
```

## Inventario

- **Studio (`packages/studio/src`)**: 968 archivos fuente (sin tests),
  ~156 000 líneas. Todo el chrome del editor (canvas overlay, dock,
  timeline, paneles, inspector, i18n, marca) es React 19 + dockview +
  Zustand + CodeMirror.
- **Propio de WissMotion en el Studio**: `src/brand/` (tipos, hook, panel,
  contraste), `src/i18n/`, `ui/WissMotionLogo.tsx` + parches puntuales
  (header, splash, dock, theme, flags). La matemática (contraste, tokens)
  ya es agnóstica al framework.

## Paquetes agnósticos (no se tocan en una migración)

`cli`, `core`, `parsers`, `lint`, `engine`, `producer`,
`shader-transitions`, `studio-server`, `sdk`, `aws-lambda`,
`gcp-cloud-run` — 11 de 14. TypeScript puro, utilizables desde Nuxt tal cual.

## El caso que decide: el player ya es interoperable

`@hyperframes/player` es un **web component** (`<hyperframes-player>`):
Vue/Nuxt lo consume sin adaptadores. Un frontend Nuxt puede hoy mismo
montar preview y renders compartiendo el 100% del pipeline.

## Estimación

- Reescribir solo el Studio en Vue: ~968 archivos / ~156 kLOC de UI
  densa (overlay de canvas con captura de puntero, timeline virtualizado,
  undo con puentes GSAP). Orden de magnitud: **varios meses-persona**,
  con regresión segura en el bench de `edit-accuracy`.
- Beneficio: solo composición de equipo (si el equipo fuese 100% Vue).
  Cero beneficio técnico: el render, el player y el CLI no dependen de React.

## Recomendación

**No migrar.** Estrategia si hace falta Nuxt: app Nuxt que embebe
`<hyperframes-player>` + habla con `studio-server` y con `wissmotion/`
(CLI/MCP), dejando el Studio React como editor avanzado. Reevaluar solo si
el equipo no puede sostener React.
