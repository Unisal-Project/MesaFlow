import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const scenarios = [
  {
    name: "desenvolvimento usa a porta padrão do backend",
    apiUrl: "",
    pageUrl: "http://dev.example.test:5173",
    expectedOrigin: "http://dev.example.test:3333",
  },
  {
    name: "staging resolve /api/v1 na origem da página",
    apiUrl: "/api/v1",
    pageUrl: "https://staging.example.test",
    expectedOrigin: "https://staging.example.test",
  },
  {
    name: "SSR resolve /api/v1 sem window",
    apiUrl: "/api/v1",
    expectedOrigin: "http://localhost:3333",
  },
  {
    name: "produção resolve uma API absoluta sem window",
    apiUrl: "https://api.example.test/api/v1/",
    expectedOrigin: "https://api.example.test",
  },
];

for (const { name, apiUrl, pageUrl, expectedOrigin } of scenarios) {
  test(name, async (context) => {
    const previousApiUrl = process.env.VITE_API_URL;
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    context.after(() => {
      if (previousApiUrl === undefined) delete process.env.VITE_API_URL;
      else process.env.VITE_API_URL = previousApiUrl;

      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else delete globalThis.window;
    });

    process.env.VITE_API_URL = apiUrl;
    if (pageUrl) globalThis.window = { location: new URL(pageUrl) };
    else delete globalThis.window;

    const server = await createServer({
      root,
      server: { middlewareMode: true, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    try {
      const { resolveImageUrl } = await server.ssrLoadModule("/src/utils/resolveImageUrl.ts");
      const { assetUrl } = await server.ssrLoadModule("/src/api/client.ts");

      const expectedImage = `${expectedOrigin}/uploads/menu.png`;
      assert.equal(resolveImageUrl("/uploads/menu.png"), expectedImage);
      assert.equal(resolveImageUrl("uploads/menu.png"), expectedImage);
      assert.equal(assetUrl("/uploads/menu.png"), expectedImage);
      assert.equal(assetUrl("uploads/menu.png"), `${expectedOrigin}/api/uploads/menu.png`);

      const absoluteImage = "HTTPS://cdn.example.test/menu.png?size=2#preview";
      assert.equal(resolveImageUrl(absoluteImage), absoluteImage);
      assert.equal(resolveImageUrl(null), undefined);
      assert.equal(resolveImageUrl(""), undefined);
    } finally {
      await server.close();
    }
  });
}
