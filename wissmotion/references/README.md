# Biblioteca de referencias

Videos de referencia (Jitter y otros) analizados una vez y guardados para no
volver a desmontarlos: qué técnica usa cada uno y con qué plantilla, preset o
transición de WissMotion se recrea.

| Archivo               | Qué es                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `references.json`     | Ficha por referencia: archivos, formato, duración, técnicas, `recreate`, estado y faltas. |
| `sheets/<id>.jpg`     | Hoja de 12 fotogramas (rejilla 4×3) para ver la referencia sin abrir el MP4.              |
| `sheets.mjs`          | Genera las hojas que falten (`--force` las rehace). Requiere ffmpeg.                      |
| `references.test.mjs` | Contrato, ids de `recreate` existentes y hoja presente por referencia.                    |

Los MP4 viven en `examples/plantilla/`, que está en `.gitignore`: no se
commitean. Las fichas y las hojas sí.

## Estado

- `lista` — se recrea con lo que ya hay (`recreate`).
- `parcial` — hay base, pero falta algo (`missing`).
- `falta` — la técnica clave no existe todavía.

## Añadir una referencia

1. Copia el video a `examples/plantilla/`.
2. Añade su ficha a `references.json` (mira los fotogramas para describirla).
3. `node wissmotion/references/sheets.mjs` y `node --test wissmotion/references/references.test.mjs`.
4. Cuando un preset o plantilla nuevo cubra algo de `missing`, actualiza `recreate` y `status`.
