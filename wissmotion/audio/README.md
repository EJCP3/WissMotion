# Audio y medios (Fase 5, CLI)

Capa fina sobre el CLI existente (sin duplicarlo):

```bash
# Subtítulos con la marca (SRT/VTT → ASS)
node captions.mjs --in subs.srt --brand ../brand-kit/brand.example.json --out subs.ass [--shift 0.5]

# Cortes al beat desde beats/<audio>.json (`hyperframes beats`)
node beat-marks.mjs --beats beats/musica.json --out marks.json [--every 8]

# Voz en off por lotes (guion [{text, voice?, lang?, speed?}])
node voiceover.mjs --script guion.json --out audio/ [--voice af_heart] [--lang es] [--dry-run]
```

- `captions.mjs`: parsea SRT/VTT, emite ASS con fuente de titulares y color
  de texto de la marca (BGR), caja semitransparente y `--shift` de tiempos.
- `beat-marks.mjs`: BPM por mediana de intervalos + un corte cada N beats.
- `voiceover.mjs`: un WAV por segmento vía `hyperframes tts` + manifiesto.
  Sin backend (`pip install kokoro-onnx soundfile`) no falla: marca
  pendientes con la acción exacta. El WAV se referencia como `<audio>` en la
  composición o se mezcla en el render.
- Mezcla (volumen/fades/ducking), música de fondo y quitar-fondos: vía CLI
  (`render` con lanes, `remove-background`) y paneles del Studio.
