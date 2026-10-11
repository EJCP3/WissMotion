# Paquete `.wissmotion` (Fase 9)

Zip exportable con composición + marca + assets para compartir o respaldar
(fflate, sin nativos):

```bash
node package.mjs --export ./mi-promo --out ./mi-promo.wissmotion
node package.mjs --import ./mi-promo.wissmotion --out ./restaurado
```

Incluye `index.html`, `variables.json`, `brand.json`, assets y
`wissmotion.json` (manifiesto `{format, version}`). Excluye `renders/`,
snapshots y dependencias; tope 50 MB por archivo. La marca se valida al
exportar; al importar se exige manifiesto v1 e `index.html` (rutas `..`
rechazadas). Duplicar proyecto y variantes A/B = importar dos veces con
distinto destino y cambiar vars.
