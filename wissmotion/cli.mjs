#!/usr/bin/env node
// CLI unificado de WissMotion (Fase 10, empaquetado): una puerta de entrada a
// todo el producto sin recordar rutas. Despacha a los scripts existentes:
//   node wissmotion/cli.mjs <comando> [args]
// Comandos: mcp, brand-validate, brand-extract, brands, template, instantiate,
//   templateize, render, voiceover, captions, beats, package, agents, film, help.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const COMMANDS = {
  mcp: { file: ["server", "mcp.mjs"], help: "servidor MCP stdio" },
  "brand-validate": {
    file: ["brand-kit", "validate-brand.mjs"],
    help: "<marca.json> — valida contra el esquema v1",
  },
  "brand-extract": {
    file: ["brand-kit", "extract-from-url.mjs"],
    help: "<url> --out b.json [--save nombre]",
  },
  "brand-enrich": {
    file: ["brand-kit", "enrich.mjs"],
    help: 'b.json [--url https://…] [--notes "…"] [--overwrite] — tono, tagline, beneficios y guion con IA',
  },
  "brand-images": {
    file: ["brand-kit", "extract-from-images.mjs"],
    help: 'captura.png [más…] --name "App" [--primary #hex] [--logo icono.png] --out b.json',
  },
  brands: { file: ["brand-kit", "brand-library.mjs"], help: "--list [--dir d] | --get <nombre>" },
  template: {
    file: ["templates", "instantiate.mjs"],
    help: "--template id --brand b.json [--vars v.json] --out dir",
  },
  templateize: {
    file: ["templates", "templateize.mjs"],
    help: "--project dir --id slug [--name n]",
  },
  determinism: {
    file: ["templates", "determinism.mjs"],
    help: "--project dir [--at 1.5] [--other 4] — mismo instante = mismo fotograma",
  },
  render: {
    file: ["render", "render-batch.mjs"],
    help: "--project dir [--dest all|id] [--dry-run]",
  },
  voiceover: {
    file: ["audio", "voiceover.mjs"],
    help: "--script guion.json --out audio/ [--dry-run]",
  },
  captions: {
    file: ["audio", "captions.mjs"],
    help: "--in subs.srt --brand b.json --out subs.ass",
  },
  beats: { file: ["audio", "beat-marks.mjs"], help: "--beats beats/m.json --out marks.json" },
  audio: {
    file: ["audio", "library.mjs"],
    help: "--list [--mood m] | --generate | --import f.mp3 --mood m --license l | --resolve nombre",
  },
  package: {
    file: ["export", "package.mjs"],
    help: "--export dir --out x.wissmotion | --import x.wissmotion --out dir",
  },
  agents: { file: ["server", "agents-setup.mjs"], help: "--list | --write <agente>" },
  film: {
    file: ["film", "film.mjs"],
    help: "--storyboard p.json --out dir [--format 9:16] | --review dir",
  },
};

export function usage() {
  const rows = Object.entries(COMMANDS).map(([name, c]) => `  ${name} ${c.help}`);
  return `wissmotion — estudio local de promos con marca\n\nUso: wissmotion <comando> [args]   (o node wissmotion/cli.mjs …)\n\n${rows.join("\n")}\n`;
}

export function resolveCommand(name) {
  const cmd = COMMANDS[name];
  if (!cmd) throw new Error(`comando desconocido: ${name}\n${usage()}`);
  return join(here, ...cmd.file);
}

// Despacha con los args tal cual; el código de salida es el del subcomando.
if (process.argv[2] && !process.argv[2].startsWith("--")) {
  const [, , name, ...rest] = process.argv;
  try {
    const file = resolveCommand(name);
    const r = spawnSync(process.execPath, [file, ...rest], { stdio: "inherit" });
    process.exitCode = r.status ?? 1;
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 2;
  }
} else if (!process.argv[2]) {
  console.log(usage());
}
