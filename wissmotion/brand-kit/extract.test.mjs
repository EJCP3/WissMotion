import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { validateBrand } from "./validate-brand.mjs";
import { captureDesktop } from "./extract-from-url.mjs";
import { extractBrand, mapToBrand, parseCssColors, parseMeta, rankIcons } from "./extract-lib.mjs";

const PAGE = `<!doctype html><html><head>
<title>Demo Shop | La mejor tienda</title>
<meta name="description" content="La tienda demo para probar el extractor">
<meta property="og:site_name" content="Demo Shop">
<meta property="og:image" content="/og.png">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple.png">
<link rel="stylesheet" href="/s.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;600&display=swap">
</head><body><h1>Hola</h1></body></html>`;

const CSS = `
body { color: #1c1917; background: #faf9f7; font-family: Inter, system-ui, sans-serif; }
.btn { background: #6d28d9; border-color: #6d28d9; font-weight: 600; }
a { color: #0ea5e9; }
.sale { color: #f59e0b; }
h1 { font-family: "Sora", sans-serif; }
.card { background: #ffffff; box-shadow: 0 1px rgba(0, 0, 0, 0.08); }
`;

const BARE = `<!doctype html><html><head><title>Sitio</title></head><body><p>Sin estilos</p></body></html>`;

let server;
let base;
before(async () => {
  server = createServer((req, res) => {
    if (req.url === "/page")
      return void res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
    if (req.url === "/s.css")
      return void res.writeHead(200, { "content-type": "text/css" }).end(CSS);
    if (req.url === "/bare")
      return void res.writeHead(200, { "content-type": "text/html" }).end(BARE);
    res.writeHead(404).end("no");
  });
  await new Promise((done) => server.listen(127, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

describe("extract-lib.mjs", () => {
  it("parsea meta, iconos y hojas de estilo", () => {
    const meta = parseMeta(PAGE, `${base}/page`);
    assert.equal(meta.title, "Demo Shop | La mejor tienda");
    assert.equal(meta.metas["og:site_name"], "Demo Shop");
    assert.equal(meta.icons.length, 3);
    assert.deepEqual(meta.stylesheets, [
      `${base}/s.css`,
      "https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;600&display=swap",
    ]);
  });

  it("ordena iconos SVG > PNG > ICO", () => {
    const [best, second, third] = rankIcons(parseMeta(PAGE, `${base}/page`).icons);
    assert.ok(best.href.endsWith("/icon.svg"));
    assert.ok(second.href.endsWith("/apple.png"));
    assert.ok(third.href.endsWith("/favicon.ico"));
  });

  it("cuenta colores normalizando formatos", () => {
    const counts = parseCssColors(
      `a{color:#fff;background:#6D28D9} b{color:rgb(109,40,217)} c{color:hsl(0,0%,100%)}`,
    );
    assert.equal(counts.get("#ffffff"), 2);
    assert.equal(counts.get("#6d28d9"), 2);
  });

  it("extrae una marca válida de la página fixture", async () => {
    const { brand, debug } = await extractBrand(`${base}/page`);
    assert.equal(brand.name, "Demo Shop");
    assert.equal(brand.tagline, "La tienda demo para probar el extractor");
    assert.equal(brand.colors.primary, "#6d28d9");
    assert.equal(brand.colors.background, "#ffffff");
    assert.equal(brand.colors.surface, "#faf9f7");
    assert.equal(brand.colors.text, "#1c1917");
    assert.equal(brand.fonts.heading, "Sora");
    assert.equal(brand.fonts.body, "Inter");
    assert.ok(brand.logo.full.endsWith("/icon.svg"));
    assert.equal(debug.cssFiles, 1);
    const { valid, errors } = await validateBrand(brand);
    assert.equal(errors.length, 0);
    assert.equal(valid, true);
  });

  it("una página sin estilos sigue dando marca válida (fallbacks)", async () => {
    const { brand } = await extractBrand(`${base}/bare`);
    assert.equal(brand.name, "Sitio");
    const { valid } = await validateBrand(brand);
    assert.equal(valid, true);
  });

  it("un 404 da error legible", async () => {
    await assert.rejects(() => extractBrand(`${base}/nada`), /HTTP 404/);
  });

  it("mapToBrand sin colores usa la paleta neutra", () => {
    const brand = mapToBrand({
      meta: { title: "X", metas: {} },
      colorCounts: new Map(),
      fontNames: [],
      fontWeights: new Set(),
      bestIcon: null,
      pageUrl: "https://x.test/",
    });
    assert.equal(brand.colors.primary, "#4f46e5");
    assert.equal(brand.fonts.heading, "Inter");
  });
});

describe("extract-from-url.mjs", () => {
  it("captureDesktop sin CLI devuelve null sin romper", () => {
    assert.equal(captureDesktop(`${base}/page`, `${base}-shots`, "/no/existe/cli.js"), null);
  });
});
