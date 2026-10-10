# Brand Kit (Fase 1)

Todo lo propio de marca vive aquí. El contrato es `brand.schema.json` (v1);
la IA, los agentes externos y el editor manual leen y escriben los mismos
archivos.

## Archivos

| Archivo                                    | Qué es                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand.schema.json`                        | Contrato versionado (`brandVersion: 1`). Obliga: nombre, 6 colores hex, fuentes. Opcional: tagline, URL, logo (5 variantes), tono, `motionPersonality`, features, CTA, capturas, redes.                                                                                                                                                                                                        |
| `brand.example.json`                       | Ejemplo válido.                                                                                                                                                                                                                                                                                                                                                                                |
| `validate-brand.mjs`                       | `node validate-brand.mjs <brand.json>` → exit 0/1 (Ajv draft 2020-12).                                                                                                                                                                                                                                                                                                                         |
| `brand-tokens.mjs`                         | `brandToCss(brand)` → `:root { --brand-*: … }` para inyectar la marca en composiciones. También CLI: `node brand-tokens.mjs brand.json tokens.css`.                                                                                                                                                                                                                                            |
| `extract-lib.mjs` + `extract-from-url.mjs` | Extractor sin IA: `node extract-from-url.mjs <url> --out brand.json [--screenshots dir] [--timeout ms]`. Lee HTML + CSS propio (máx. 5 hojas, mismo origen), deriva colores por frecuencia, fuentes (Google Fonts + CSS), favicon (SVG > PNG > ICO) y metadatos. `--screenshots` corre `hyperframes capture` y deja el plate desktop; móvil queda pendiente (capture no emula viewport móvil). |
| `brand.test.mjs`, `extract.test.mjs`       | Tests `node:test` (van en `test:scripts` del `package.json` raíz).                                                                                                                                                                                                                                                                                                                             |

## Reglas de mapeo (deterministas)

background = color más claro · text = más oscuro · surface = blanco (si no
es el fondo) si no 2.º más claro · primary/secundaria = cromáticos más
frecuentes · accent = más saturado · heading/body = Google Fonts en orden de
carga, si no CSS por frecuencia · pesos = los declarados, si no `[400, 700]`.
Sin colores → paleta neutra. Todo lo que el extractor no puede saber
(features, tono, CTA) se completa a mano o con IA (Fase 7).
