import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandFontsLink, fontsHref, withFontLink } from "./fonts.mjs";
import { instantiate } from "./instantiate.mjs";

const here = dirname(fileURLToPath(import.meta.url));

describe("fonts", () => {
  it("fontsHref arma la URL css2 sin genéricas ni repetidas", () => {
    assert.equal(
      fontsHref(["Sora", "Open Sans", "Sora", "sans-serif", ""], [700, 400]),
      "https://fonts.googleapis.com/css2?family=Sora:wght@400;700&family=Open+Sans:wght@400;700&display=block",
    );
    assert.equal(fontsHref(["serif"]), null);
  });

  it("withFontLink inserta una vez y luego reemplaza", () => {
    const html = "<html><head><title>x</title></head></html>";
    const once = withFontLink(html, fontsHref(["Inter"]));
    assert.equal(once.match(/data-wm-fonts/g).length, 1);
    const twice = withFontLink(once, fontsHref(["Sora"]));
    assert.equal(twice.match(/data-wm-fonts/g).length, 1);
    assert.match(twice, /family=Sora/);
    assert.doesNotMatch(twice, /family=Inter/);
  });

  it("brandFontsLink usa titulares + texto y añade 700 a los pesos de la marca", () => {
    const out = brandFontsLink(
      "<head><title>t</title></head>",
      {
        brandHeading: "Sora",
        brandBody: "Inter",
      },
      [400, 600],
    );
    assert.match(out, /family=Sora:wght@400;600;700&amp;family=Inter:wght@400;600;700/);
  });

  it("toda plantilla (salvo lista-cinetica, en curso) trae su link de fuentes", async () => {
    for (const d of readdirSync(here, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === "lista-cinetica") continue;
      const html = await readFile(join(here, d.name, "index.html"), "utf8");
      assert.match(html, /<link\s+data-wm-fonts\s[^>]*fonts\.googleapis\.com/, d.name);
    }
  });

  it("instantiate reescribe el link con las fuentes de la marca", async () => {
    const brand = JSON.parse(
      await readFile(join(here, "..", "brand-kit", "brand.example.json"), "utf8"),
    );
    const out = await mkdtemp(join(tmpdir(), "wm-fonts-"));
    await instantiate({ templateId: "logo-sting", brand, contentVars: {}, outDir: out });
    const html = await readFile(join(out, "index.html"), "utf8");
    assert.match(html, /family=Sora/);
    assert.equal(html.match(/data-wm-fonts/g).length, 1);
  });
});
