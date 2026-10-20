# WissMotion — Roadmap

> Estudio local para crear **videos promocionales adaptados a la marca** (app, web, producto, negocio),
> con calidad visual inspirada en Jitter, construido sobre HyperFrames (fork, Apache-2.0).
> La IA acelera, pero **todo lo que hace la IA se puede hacer a mano** en el estudio.

---

## Principios

1. **Un solo formato de verdad**: cada proyecto es una composición HyperFrames (HTML + GSAP) + `brand.json`.
   La IA, los agentes externos y el editor manual leen y escriben los mismos archivos.
2. **IA opcional**: sin tokens o sin conexión, el usuario puede crear, editar y renderizar igual.
3. **Brand-first**: ninguna plantilla tiene colores, fuentes o logos fijos; todo sale del Brand Kit.
4. **Local-first**: render en la máquina del usuario (Chrome headless + FFmpeg). La nube es opcional.
5. **Agnóstico de agente**: Claude Code, Antigravity, OpenCode, Codex, Cursor, Gemini CLI… se conectan por estándares (MCP, AGENTS.md, Skills), no por integraciones a medida.
6. **Fork limpio**: el código propio vive en `wissmotion/` y en parches mínimos al Studio, para poder traer cambios de `upstream`.

---

## Fase 0 — Base del fork

- [x] Monorepo instalado y Studio corriendo en local (`bun install`, `bun run studio`).
- [x] Estrategia de sincronización con `upstream` (rama `main` = upstream, rama `wissmotion` = producto; merge periódico).
- [x] Carpeta `wissmotion/` para todo lo propio (brand kit, plantillas, presets, servidor MCP, docs).
- [x] Rebranding del Studio: nombre, logo, colores, splash, título de ventana, favicon.
- [x] Desactivar o redirigir lo específico de HeyGen (telemetría, botón "Open in desktop/Framey", login cloud) detrás de flags.
- [x] Idioma: interfaz en **español** con sistema i18n (es/en).
- [x] CI propio: build, tests, lint en GitHub Actions del fork (`.github/workflows/wissmotion.yml`).

## Fase 1 — Brand Kit

- [x] **Esquema `brand.json`** versionado y validado (JSON Schema):
      nombre, logo (completo / ícono / monocromo / claro-oscuro), colores (primary, secondary, accent, background, surface, text),
      tipografías (heading, body, pesos), tono, personalidad de movimiento, tagline, features, CTA, URL, capturas, redes sociales.
- [x] **Extractor desde URL (sin IA)**: colores del CSS, fuentes, favicon/logo, imagen OG, título, meta descripción,
      capturas desktop y móvil (reutilizar `hyperframes capture`).
- [ ] **Extractor desde app**: subir capturas de App Store / Play Store o imágenes sueltas.
- [ ] **Importar desde Figma**: variables/tokens y logo.
- [ ] **Enriquecimiento con IA (opcional)**: tono, tagline, beneficios, público objetivo, guion sugerido.
- [x] **Editor manual de marca** (panel en el Studio): selector de color, subir logo, buscador de Google Fonts, vista previa en vivo.
- [x] Generar paleta derivada (tonos, contraste AA/AAA) y aviso de contraste (reutilizar `contrast-*` del CLI).
- [x] **Biblioteca de marcas**: varias marcas guardadas, duplicar, exportar/importar.
- [x] Aplicar marca como **tokens CSS** (`--brand-primary`, `--brand-font-heading`…) inyectados en toda composición.
- [x] Cambiar de marca en un proyecto existente y que el video se re-adapte al instante (botón "Aplicar al video": variables brand\* + fuentes + `brand.json` del proyecto).

## Fase 2 — Kit de movimiento (el "look Jitter")

- [x] **Personalidades de movimiento** ligadas a la marca: `suave`, `enérgico`, `premium`, `juguetón`, `corporativo`, `tech`.
      Cada una define easings, duraciones, stagger, rebote, uso de blur y escala.
- [x] **Presets de entrada/salida**: mask-reveal, stagger-words, stagger-chars, blur-in, spring-pop, slide-stack, scale-fade, wipe, typewriter.
- [x] **Presets de énfasis**: pulse, highlight-sweep, underline-draw, counter-up, number-roll, shake, glow.
- [x] **Presets de escena**: device-mockup-scroll, browser-scroll, card-carousel, feature-grid, split-screen, logo-build, kinetic-type.
- [x] **Transiciones** entre escenas (push, zoom-through, morph, shader-transitions existentes, whip).
- [x] **Editor de curvas de easing** (bézier visual + spring con masa/rigidez/amortiguación) estilo Jitter.
- [ ] Controles de **stagger** (orden, dirección, desde el centro, aleatorio).
- [x] Vista previa de cada preset en miniatura (póster fijo por preset; la animada llega con la galería de Fase 3).
- [ ] Todos los presets **seek-safe** y deterministas (render frame a frame idéntico al preview).

## Fase 3 — Plantillas promocionales

- [x] **Galería de plantillas** con miniaturas animadas, categorías, búsqueda y filtros por formato/duración.
- [x] Plantillas iniciales:
  - [x] Promo de app móvil (capturas en mockup de teléfono)
  - [x] Promo de web / SaaS (navegador + features)
  - [x] Intro / sting de logo
  - [x] Lanzamiento de producto (countdown + reveal)
  - [x] Feature highlight (1 función, 6–10 s)
  - [x] Antes / después
  - [x] Testimonios / reseñas
  - [x] Precios / planes
  - [x] Estadísticas / métricas (contadores, gráficas)
  - [x] Oferta / promoción (descuento, CTA)
  - [x] Evento / webinar
  - [x] Historia corta para redes (9:16)
  - [x] Lista cinética vertical (estilo Jitter List, 9:16)
- [x] **Variables de plantilla**: textos, imágenes, colores, duración, número de escenas → formulario sin código.
- [x] Multi-formato desde la misma plantilla: 16:9, 9:16, 1:1, 4:5 con layouts propios por formato (11 plantillas; `templates/formats.mjs`).
- [ ] Duraciones variables (6 s, 15 s, 30 s, 60 s) re-escalando el timing.
- [x] El usuario puede **guardar sus propios proyectos como plantilla**.
- [x] Mockups de dispositivos (teléfono, laptop, navegador, tablet, reloj) con tema claro/oscuro (`mockups/`).

## Fase 4 — Estudio de edición (React)

- [ ] **Home / dashboard**: proyectos recientes, crear desde plantilla, desde URL, desde cero o desde prompt.
- [x] Flujo guiado "Nuevo video promo": marca → plantilla/IA → contenido → preview → render.
- [x] **Panel de marca** integrado (Fase 1).
- [x] (heredado: `PropertyPanel`) **Inspector de propiedades** estilo Jitter: posición, tamaño, rotación, opacidad, blur, radio, sombras, relleno, borde.
- [x] (heredado: `GsapAnimationSection`, `EaseCurveSection`) **Inspector de animación**: lista de animaciones del elemento, preset, duración, delay, easing (editor de curvas), stagger.
- [x] (heredado) Timeline: arrastrar, recortar, dividir, snapping, zoom, marcadores, keyframes visibles por propiedad.
- [x] (heredado: `LayersPanel`) Panel de capas con agrupar, bloquear, ocultar, renombrar.
- [ ] Herramientas de canvas: texto, formas, imagen, video, ícono, mockup; alineación y distribución; guías.
- [ ] **Biblioteca de assets**: logos, imágenes, íconos, videos, fuentes del proyecto y de la marca.
- [x] (heredado: historial + guardado inmediato) Deshacer/rehacer ilimitado, autoguardado, historial de versiones (reutilizar `history`).
- [ ] Atajos de teclado y paleta de comandos.
- [x] (heredado: `VariablesPanel`) Panel de **variables de plantilla** editable.
- [x] Modo código (CodeMirror ya existe) para usuarios avanzados.
- [ ] Rendimiento: preview fluido a 60 fps con proyectos de 60 s.

## Fase 5 — Audio y medios

- [ ] Biblioteca de música libre de derechos y SFX (whoosh, click, pop, riser).
- [x] Sincronizar cortes y animaciones al **beat** (reutilizar `beats` / bpm-detective).
- [x] **Voz en off**: TTS local o por API (reutilizar `tts`), o subir grabación propia.
- [x] **Subtítulos** automáticos (reutilizar `transcribe`) con estilos de la marca.
- [x] (heredado: efectos de audio, carve, automatización) Mezcla: volumen, fades, ducking de música bajo la voz.
- [x] Quitar fondo de imágenes/videos (reutilizar `remove-background`, heredado del CLI).
- [x] Grabación/importación de screencasts de la app o web para escenas reales (heredado: `hyperframes capture`).

## Fase 6 — Render y exportación

- [x] (heredado: `RenderQueue`; reintentar = volver a lanzar) Cola de render local con progreso, cancelar y reintentar.
- [x] Formatos: MP4 (H.264/H.265), WebM, MOV con alfa, GIF, secuencia PNG, miniatura/póster (heredados: `render --format`, `snapshot`).
- [x] Presets de destino: Instagram Reels, TikTok, YouTube, YouTube Shorts, LinkedIn, X, web hero (loop).
- [x] **Render por lotes**: un proyecto → todos los formatos en un clic (reutilizar `batchRender`).
- [ ] Calidad: 720p / 1080p / 4K, 24/30/60 fps.
- [x] Render en la nube opcional (Lambda / Cloud Run ya existen) detrás de configuración (heredado: `lambda`, `cloud`).

## Fase 7 — IA integrada en la app

- [x] **Panel de chat** dentro del Studio para crear y editar con lenguaje natural.
- [x] **Proveedores configurables (BYOK)**: Anthropic Claude, Google Gemini, OpenAI/compatibles, OpenRouter, **Ollama/LM Studio local** (gratis, sin tokens).
- [x] Flujo **brief → guion → storyboard → composición**, con aprobación del usuario en cada paso.
- [ ] Ediciones por chat: "haz la escena 2 más lenta", "usa el color accent en el CTA", "versión 9:16".
- [ ] La IA ve el video: snapshots de frames para revisar y corregir su propio trabajo (reutilizar `snapshot`).
- [ ] Generación de copy: titulares, CTA y variaciones A/B.
- [x] **Medidor de consumo** de tokens/costo por proveedor y límite configurable.
- [x] **Degradación elegante**: si se acaban los tokens o falla el proveedor, el panel lo indica y sugiere la acción manual equivalente.
- [ ] Cada acción de IA queda en el historial y se puede deshacer.

## Fase 8 — Conectividad con agentes externos

Objetivo: que cualquier agente de código (Claude Code, Antigravity, OpenCode, Codex, Cursor, Gemini CLI…) pueda crear y editar
videos WissMotion, viendo los cambios en vivo en el Studio.

### 8.1 Servidor MCP de WissMotion

- [x] Comando `wissmotion mcp` con transporte **stdio** (agentes locales). Streamable HTTP pendiente.
- [ ] Herramientas expuestas:

| Grupo      | Herramientas                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Proyecto   | `project_list`, `project_create`, `project_open`, `project_info`, `project_timeline`              |
| Marca      | `brand_extract_from_url`, `brand_get`, `brand_update`, `brand_apply`, `brand_list`                |
| Plantillas | `template_list`, `template_preview`, `template_instantiate`, `template_set_variables`             |
| Escenas    | `scene_add`, `scene_update`, `scene_reorder`, `scene_remove`                                      |
| Elementos  | `element_select`, `element_set_text`, `element_set_style`, `element_transform`                    |
| Animación  | `motion_list_presets`, `motion_apply_preset`, `animation_add`, `animation_update`, `keyframe_add` |
| Medios     | `media_add`, `audio_set_music`, `voiceover_generate`, `captions_generate`                         |
| Visión     | `frame_snapshot`, `studio_look`, `lint_check`                                                     |
| Render     | `render_start`, `render_status`, `render_batch`                                                   |

- [ ] **Puente con el Studio abierto**: el servidor MCP reenvía a las herramientas WebMCP que ya registra el Studio
      (`studio_select`, `studio_set_text`, `studio_add_animation`…), así el usuario ve cada edición en vivo.
- [ ] Si el Studio está cerrado, las herramientas operan sobre los archivos y el CLI.
- [ ] Recursos MCP: `brand.json`, timeline, lista de plantillas y presets como contexto legible.
- [ ] Prompts MCP: "crear promo de app", "crear promo de web", "adaptar a 9:16".

### 8.2 Contexto e instrucciones para agentes

- [x] `AGENTS.md` de WissMotion (estándar leído por OpenCode, Codex, Antigravity, Cursor y otros).
- [ ] `CLAUDE.md` apuntando a `AGENTS.md`.
- [x] **Skills** de WissMotion (formato Agent Skills): `wissmotion` (entrada), `wissmotion-brand`, `wissmotion-templates`, `wissmotion-motion`.
- [ ] Reutilizar las skills de HyperFrames para el contrato de composición.

### 8.3 Configuración por agente (un comando o un snippet cada uno)

- [ ] **Claude Code**: plugin (`.claude-plugin/`) + `claude mcp add wissmotion -- npx wissmotion mcp`.
- [x] **Antigravity**: entrada en su configuración MCP (`mcpServers`) + reglas basadas en `AGENTS.md`.
- [x] **OpenCode**: entrada `mcp` en `opencode.json` (`type: local`, `command: ["npx","wissmotion","mcp"]`) + `AGENTS.md`.
- [x] **Codex / Cursor / Gemini CLI**: adaptar los plugins existentes (`.codex-plugin`, `.cursor-plugin`, `gemini-extension.json`).
- [x] Comando `wissmotion agents setup` que detecta los agentes instalados y escribe su configuración.
- [ ] Página "Conectar agente" en el Studio con los snippets listos para copiar y un indicador de agente conectado.

### 8.4 Colaboración en vivo y seguridad

- [ ] Recarga en vivo cuando un agente modifica archivos (el Studio ya vigila archivos y avisa de conflictos).
- [ ] Indicador de "el agente está editando" y bloqueo suave para evitar choques con la edición manual.
- [ ] Permisos por herramienta (lectura / edición / render) y confirmación para acciones costosas.
- [ ] Registro de acciones de cada agente en el historial, reversibles.

## Fase 9 — Proyectos y colaboración

- [x] Paquete exportable `.wissmotion` (zip con composición, marca, assets) para compartir o respaldar.
- [x] Duplicar proyecto, variantes (A/B, idiomas, formatos).
- [x] Versiones con nombre y comparación visual (reutilizar `compare`, heredado del CLI).
- [x] Videos multilingües: mismo proyecto, textos y voz por idioma (`render --batch` con filas de variables por idioma).
- [ ] Comentarios sobre frames para revisión (opcional).

## Fase 10 — Calidad, distribución y decisión sobre Vue

- [ ] Tests de plantillas y presets (render determinista, snapshot visual).
- [x] Documentación de usuario en español (`wissmotion/docs/`; los tutoriales en video llegan cuando haya voz/música de Fase 5).
- [x] Onboarding: primer video en menos de 5 minutos (`primeros-pasos.md`).
- [ ] Empaquetado: instalador local (CLI global) y evaluar app de escritorio (Electron/Tauri).
- [ ] Accesibilidad del editor (teclado, contraste, lector de pantalla en paneles).
- [x] **Evaluación de migración a Vue/Nuxt**: inventario de componentes React propios, qué paquetes son agnósticos
      (core, player, sdk, engine, producer, studio-server) y estimación de esfuerzo vs. beneficio.

---

## Definición de "WissMotion completo"

WissMotion se considera completo cuando un usuario puede, **sin escribir código y sin IA**:

1. Pegar una URL o subir su logo y obtener un Brand Kit correcto.
2. Elegir una plantilla promo y verla adaptada a su marca al instante.
3. Editar textos, tiempos, animaciones y escenas en el estudio.
4. Añadir música, voz y subtítulos.
5. Exportar en todos los formatos de redes con un clic.

…y además, **con IA o con un agente externo** (Claude Code, Antigravity, OpenCode), puede hacer lo mismo con un prompt,
viendo cada cambio en vivo en el Studio y pudiendo continuar a mano en cualquier momento.

## Orden sugerido

| Prioridad | Fases                                   | Resultado                                       |
| --------- | --------------------------------------- | ----------------------------------------------- |
| MVP       | 0 → 1 → 2 → 3 (3 plantillas) → 6 básico | Videos promo con marca, editables y exportables |
| v1        | 4 → 5 → 3 completo                      | Estudio completo estilo Jitter                  |
| v1.5      | 8 → 7                                   | IA y agentes conectados                         |
| v2        | 9 → 10                                  | Producto pulido y decisión sobre Vue            |
