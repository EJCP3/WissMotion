import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyFormat, formatFileName, htmlSupportsFormat, supportedFormats } from "./formats.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const templates = readdirSync(here, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("formats", () => {
  it("applyFormat fija tamaño y data-format en la composición raíz", () => {
    const html = `<div id="stage" data-composition-id="x" data-start="0" data-width="1280" data-height="720"><p>hola</p></div>`;
    const out = applyFormat(html, "9:16");
    assert.match(out, /data-width="1080"/);
    assert.match(out, /data-height="1920"/);
    assert.match(out, /data-format="9:16"/);
    assert.match(out, /style="width: 1080px; height: 1920px"/);
    assert.ok(out.endsWith(`<p>hola</p></div>`));
    // Idempotente: reaplicar no duplica atributos.
    const twice = applyFormat(out, "1:1");
    assert.equal(twice.match(/data-format=/g).length, 1);
    assert.match(twice, /data-width="1080" data-height="1080"|data-height="1080"/);
    assert.throws(() => applyFormat(html, "21:9"), /desconocido/);
  });

  it("formatFileName es un archivo oculto junto al index.html", () => {
    assert.equal(formatFileName("9:16"), ".format-9x16.html");
  });

  it("template.json formats ⇔ layouts [data-format] del CSS en cada plantilla", () => {
    for (const id of templates) {
      const manifest = JSON.parse(readFileSync(join(here, id, "template.json"), "utf8"));
      const html = readFileSync(join(here, id, "index.html"), "utf8");
      for (const f of supportedFormats(manifest)) {
        if (f === manifest.format) continue;
        assert.ok(htmlSupportsFormat(html, f), `${id}: declara ${f} sin layout CSS`);
      }
      for (const m of html.matchAll(/\[data-format="([0-9]+:[0-9]+)"\]/g)) {
        assert.ok(supportedFormats(manifest).includes(m[1]), `${id}: layout ${m[1]} sin declarar`);
      }
    }
  });
});
