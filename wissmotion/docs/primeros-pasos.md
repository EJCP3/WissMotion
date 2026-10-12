# Primer video en 5 minutos

Sin escribir código y sin IA: URL → marca → plantilla → video.

## 1. Prepara la base (una vez)

```bash
bun install
bun run build
```

Necesitas Node 22+, FFmpeg y Chrome (el CLI los detecta con
`node packages/cli/dist/cli.js doctor`).

## 2. Extrae tu marca (1 min)

```bash
node wissmotion/brand-kit/extract-from-url.mjs https://tu-sitio.com \
  --out mi-marca.json --save mi-marca
```

Revisa `mi-marca.json` (nombre, colores, fuentes, logo) y corrige lo que
falle con `node wissmotion/brand-kit/validate-brand.mjs mi-marca.json`.
O edítala visualmente en el panel **Marca** del Studio.

## 3. Instancia una plantilla (1 min)

Mira las 16 plantillas en `wissmotion/templates/` (cada una trae su
`preview.png`). Ejemplo con la promo de app:

```bash
echo '{"brandName":"Acme","ctaLabel":"Instalar ya"}' > vars.json
node wissmotion/templates/instantiate.mjs --template promo-app \
  --brand mi-marca.json --vars vars.json --out ./mi-promo
```

Abre `./mi-promo` en el Studio para ajustar textos, tiempos y animaciones,
o edita `variables.json` a mano (el panel Variables lo hace en vivo).

## 4. Renderiza para cada red (3 min)

```bash
node wissmotion/render/render-batch.mjs --project ./mi-promo \
  --variables-file ./mi-promo/variables.json --dest all
```

Obtienes `renders/mi-promo.youtube.mp4`, `.linkedin.mp4`, `.x.mp4`,
`.hero.mp4`, `.webm`, `.gif` (+ `manifest.json`). Los verticales
(reels/tiktok/shorts) se omiten con aviso: necesitan la plantilla
`historia` (9:16), no una 16:9.

## Sin IA, sin cuenta, sin nube

Todo corre en tu máquina. Si un paso con IA falla (o no tienes tokens),
el camino manual de arriba siempre funciona: es el mismo pipeline.
