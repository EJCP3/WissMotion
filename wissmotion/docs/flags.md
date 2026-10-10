# Flags de build de WissMotion

Flags propios del producto, todos **opt-in por build** (Vite los inyecta en
`import.meta.env`). Por defecto están apagados para no cambiar el
comportamiento heredado de HyperFrames.

| Flag | Efecto |
|---|---|
| `VITE_WISSMOTION_NO_TELEMETRY=1` | Suprime toda la telemetría del Studio (mismo efecto que `VITE_HYPERFRAMES_NO_TELEMETRY`). Ver `packages/studio/src/telemetry/policy.ts`. |
| `VITE_WISSMOTION_NO_DESKTOP_BUTTON=1` | Oculta el botón "Edit with Framey" (hand-off a la app de escritorio de HeyGen, sin equivalente en WissMotion). Ver `packages/studio/src/components/OpenInDesktopButton.tsx`. |

Valores afirmativos reconocidos: `1`, `true`, `yes`, `on` (insensible a
mayúsculas/espacios). Cualquier otro valor se ignora.

Fuera de estos flags, la telemetría sigue respetando los controles
heredados: `localStorage hyperframes-studio:telemetryDisabled=1`,
`navigator.doNotTrack`, modo dev de Vite y `window.__HF_CLI_TELEMETRY_DISABLED`.
