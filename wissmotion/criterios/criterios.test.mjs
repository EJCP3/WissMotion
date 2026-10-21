import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog, criterioIds, resolveCriterio } from "./criterios.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const templates = readdirSync(join(here, "..", "templates"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("criterios.json", () => {
  it("cada criterio tiene su .md (salvo libre) y el default existe", () => {
    assert.ok(catalog.criterios[catalog.default], "default");
    assert.ok(catalog.criterios.libre && catalog.criterios.libre.file === null, "libre");
    for (const [id, c] of Object.entries(catalog.criterios)) {
      if (c.file) assert.ok(existsSync(join(here, c.file)), `${id}: ${c.file}`);
    }
  });

  it("toda plantilla existe y tiene como mucho un criterio por defecto", () => {
    const seen = new Map();
    for (const id of criterioIds) {
      for (const t of catalog.criterios[id].templates) {
        assert.ok(templates.includes(t), `${id}: plantilla ${t} no existe`);
        assert.ok(!seen.has(t), `${t} en ${seen.get(t)} y ${id}`);
        seen.set(t, id);
      }
    }
  });

  it("resolveCriterio: el de la plantilla, el pedido, o error si no existe", () => {
    assert.equal(resolveCriterio("oferta"), "anuncio");
    assert.equal(resolveCriterio("promo-app"), "promo-marca");
    assert.equal(resolveCriterio("palabra"), "full-animacion");
    assert.equal(resolveCriterio("promo-app", "libre"), "libre");
    assert.equal(resolveCriterio("no-mapeada"), catalog.default);
    assert.throws(() => resolveCriterio("promo-app", "inventado"), /desconocido/);
  });
});
