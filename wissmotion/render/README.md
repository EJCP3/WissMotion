# Render por lotes (Fase 6 básico, CLI)

Un proyecto → todos los destinos en un comando, sobre `hyperframes render`:

```bash
node render-batch.mjs --project ./mi-promo --dest all --variables-file ./mi-promo/variables.json
```

| Destino                            | Formato | fps | Calidad                 | Aspecto |
| ---------------------------------- | ------- | --- | ----------------------- | ------- |
| `youtube`, `linkedin`, `x`, `hero` | mp4     | 30  | delivery/standard/looks | 16:9    |
| `webm`                             | webm    | 30  | standard                | 16:9    |
| `gif`                              | gif     | 15  | standard                | 16:9    |
| `reels`, `tiktok`, `shorts`        | mp4     | 30  | delivery                | 9:16    |
| `square`                           | mp4     | 30  | delivery                | 1:1     |
| `feed`                             | mp4     | 30  | delivery                | 4:5     |

El aspecto se lee del `index.html`. Si el destino pide otro y la plantilla
trae ese layout (multiformato, ver `templates/README.md`), se genera
`.format-<WxH>.html` y se renderiza con `--composition`; si no, se omite con
aviso (salvo `--force`). Salida: `renders/<nombre>.<dest>.<ext>` + `manifest.json`.
`--dry-run` imprime el plan sin renderizar. `--quality` global opcional,
`--workers` por defecto 2 (1 en máquinas justas).

## Variantes A/B e idiomas

El mismo proyecto, varias filas de variables (`render --batch` del CLI):

```json
{
  "rows": [
    { "headline": "El panel que mereces" },
    { "headline": "The dashboard you deserve", "ctaLabel": "Try free" }
  ]
}
```

```bash
node packages/cli/dist/cli.js render ./mi-promo --batch filas.json
```

Cada fila = un render. Multiplica por destinos corriendo el lote por fila.

Verificado end-to-end: `logo-sting` → MP4 6 s reales con el CLI.
La cola con progreso/cancelación en el Studio llega con la Fase 4/6 UI.
