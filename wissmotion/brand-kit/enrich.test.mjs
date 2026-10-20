import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENRICH_SCHEMA,
  MODEL,
  buildPrompt,
  mergeEnrichment,
  pageText,
  requestEnrichment,
} from "./enrich.mjs";
import { validateBrand } from "./validate-brand.mjs";

const brand = {
  brandVersion: 1,
  name: "Acme",
  tagline: "Ya tengo tagline",
  colors: {
    primary: "#111111",
    secondary: "#222222",
    accent: "#333333",
    background: "#ffffff",
    surface: "#eeeeee",
    text: "#000000",
  },
  fonts: { heading: "Inter", body: "Inter" },
};

const proposal = {
  tone: "Cercano y directo",
  tagline: "Tu dinero, claro",
  features: ["Presupuestos por sobres", "Alertas de gasto"],
  cta: "Empieza gratis",
  motionPersonality: "enérgico",
  audience: "Jóvenes que quieren ordenar sus gastos",
  script: [{ scene: "Logo", text: "Acme" }],
};

/** Cliente falso con la forma de beta.messages.create; guarda la petición. */
function fakeClient(response) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        create: async (req) => {
          calls.push(req);
          return response;
        },
      },
    },
  };
}

describe("enrich.mjs", () => {
  it("pide JSON estructurado con el esquema, fallbacks y el modelo por defecto", async () => {
    const client = fakeClient({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(proposal) }],
    });
    const data = await requestEnrichment("prompt", client);
    assert.equal(data.cta, "Empieza gratis");
    const req = client.calls[0];
    assert.equal(req.model, MODEL);
    assert.deepEqual(req.output_config.format, { type: "json_schema", schema: ENRICH_SCHEMA });
    assert.equal(req.fallbacks, "default");
  });

  it("una negativa del modelo se convierte en error legible", async () => {
    const client = fakeClient({
      stop_reason: "refusal",
      stop_details: { category: "cyber" },
      content: [],
    });
    await assert.rejects(requestEnrichment("p", client), /declinó \(cyber\)/);
  });

  it("rellena solo huecos (salvo overwrite) y la marca sigue validando", async () => {
    const merged = mergeEnrichment(brand, proposal);
    assert.equal(merged.tagline, "Ya tengo tagline");
    assert.equal(merged.tone, "Cercano y directo");
    assert.deepEqual(merged.cta, { label: "Empieza gratis" });
    assert.equal(merged.motionPersonality, "enérgico");
    assert.equal((await validateBrand(merged)).valid, true);
    assert.equal(mergeEnrichment(brand, proposal, { overwrite: true }).tagline, "Tu dinero, claro");
  });

  it("el texto de la web entra como contexto acotado, sin scripts", () => {
    const text = pageText("<style>x{}</style><h1>Hola</h1><script>alert(1)</script><p>mundo</p>");
    assert.equal(text, "Hola mundo");
    assert.match(buildPrompt(brand, { site: text }), /<web>\nHola mundo\n<\/web>/);
  });
});
