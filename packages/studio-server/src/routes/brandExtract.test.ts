// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { registerBrandExtractRoutes } from "./brandExtract";

const PAGE = `<!doctype html><html><head><title>Tienda Demo | Lo mejor</title>
<meta name="description" content="La tienda de prueba">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="stylesheet" href="/s.css">
</head><body><h1>Hola</h1></body></html>`;
const CSS = `body { color: #1c1917; background: #faf9f7; } a { color: #6d28d9; }`;

let server: Server;
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/page")
      return void res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
    if (req.url === "/s.css")
      return void res.writeHead(200, { "content-type": "text/css" }).end(CSS);
    res.writeHead(404).end("no");
  });
  await new Promise<void>((done) => server.listen(127, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

function post(app: Hono, body: unknown) {
  return app.request("http://localhost/brand/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /brand/extract", () => {
  it("extrae la marca de una URL", async () => {
    const app = new Hono();
    registerBrandExtractRoutes(app);
    const res = await post(app, { url: `${base}/page` });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { brand: { name: string; colors: { primary: string } } };
    expect(data.brand.name).toBe("Tienda Demo");
    expect(data.brand.colors.primary).toBe("#6d28d9");
  });

  it("400 sin URL y 502 si la página falla", async () => {
    const app = new Hono();
    registerBrandExtractRoutes(app);
    expect((await post(app, {})).status).toBe(400);
    expect((await post(app, { url: `${base}/nada` })).status).toBe(502);
  });

  it("501 sin extractor disponible", async () => {
    const app = new Hono();
    registerBrandExtractRoutes(app, { extractorUrl: "file:///no/existe.mjs" });
    const res = await post(app, { url: `${base}/page` });
    expect(res.status).toBe(501);
  });
});
