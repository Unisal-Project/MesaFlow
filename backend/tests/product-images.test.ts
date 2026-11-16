import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
process.env.DATABASE_URL ??=
  "mysql://test:test@127.0.0.1:1/product_images_test";
process.env.JWT_SECRET ??= "product-images-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { default: ProductService } =
  await import("../src/modules/products/products.service.js");
const { requireApiAuthentication } =
  await import("../src/shared/api-access.js");
import type ProductsRepository from "../src/modules/products/repositories/products.repository.js";
import type { StorageService } from "../src/shared/storage/storage.service.js";

// Repositório e armazenamento em memória: só o que o serviço de fotos usa.
function setup(initial: string[]) {
  let imageUrls = [...initial];
  const deleted: string[] = [];
  let uploads = 0;
  const product = () => ({ id: 1n, imageUrl: imageUrls[0] ?? null, imageUrls });
  const repository = {
    getProductById: async () => product(),
    updateProduct: async (_id: bigint, input: { imageUrls?: string[] }) => {
      if (input.imageUrls) imageUrls = [...input.imageUrls];
      return product();
    },
  } as unknown as ProductsRepository;
  const storage = {
    uploadProductImage: async () => `/uploads/products/new-${++uploads}.webp`,
    delete: async (path: string) => void deleted.push(path),
  } as unknown as StorageService;
  const file = {
    buffer: Buffer.from("x"),
    originalName: "a.png",
    mimeType: "image/png",
  };
  return {
    service: new ProductService(repository, storage),
    file,
    deleted,
    urls: () => imageUrls,
  };
}

test("enviar foto: sem slot troca a capa; slot livre entra no fim; slot ocupado substitui", async () => {
  const photos = setup(["/a.webp"]);
  await photos.service.uploadProductImage(1n, photos.file);
  assert.deepEqual(photos.urls(), ["/uploads/products/new-1.webp"]);
  assert.deepEqual(photos.deleted, ["/a.webp"], "a capa antiga é apagada");

  // Slot além do fim entra na próxima posição livre.
  await photos.service.uploadProductImage(1n, photos.file, 3);
  await photos.service.uploadProductImage(1n, photos.file, 3);
  assert.deepEqual(photos.urls(), [
    "/uploads/products/new-1.webp",
    "/uploads/products/new-2.webp",
    "/uploads/products/new-3.webp",
  ]);
  const full = setup(["/1", "/2", "/3"]);
  await full.service.uploadProductImage(1n, full.file, 2);
  assert.deepEqual(full.urls(), ["/1", "/uploads/products/new-1.webp", "/3"]);
  assert.deepEqual(full.deleted, ["/2"]);
});

test("com 3 fotos não cabe outra: recusa antes de gravar o arquivo", async () => {
  const full = setup(["/1", "/2", "/3"]);
  await assert.rejects(
    () => full.service.uploadProductImage(1n, full.file, 4),
    /no máximo 3 fotos/,
  );
  assert.deepEqual(full.urls(), ["/1", "/2", "/3"]);
});

test("remover a capa promove a próxima e apaga o arquivo", async () => {
  const photos = setup(["/1", "/2", "/3"]);
  await photos.service.removeProductImage(1n, 1);
  assert.deepEqual(photos.urls(), ["/2", "/3"]);
  assert.deepEqual(photos.deleted, ["/1"]);
  await assert.rejects(
    () => photos.service.removeProductImage(1n, 3),
    /Foto não encontrada/,
  );
});

test("definir como capa troca com o slot 1", async () => {
  const photos = setup(["/1", "/2", "/3"]);
  await photos.service.setProductCover(1n, 3);
  assert.deepEqual(photos.urls(), ["/3", "/2", "/1"]);
  assert.deepEqual(photos.deleted, []);
});

test("rotas novas de foto são só de ADMIN", async () => {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  app.addHook("onRequest", requireApiAuthentication);
  app.delete("/products/:id/image/:slot", async () => ({ ok: true }));
  app.patch("/products/:id/image/:slot/cover", async () => ({ ok: true }));
  await app.ready();
  const token = (role: "ADMIN" | "EMPLOYEE") =>
    app.jwt.sign({ id: idFor(role), email: "a@b.c", role });
  for (const [method, url] of [
    ["DELETE", "/products/1/image/2"],
    ["PATCH", "/products/1/image/2/cover"],
  ] as const) {
    const employee = await app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${token("EMPLOYEE")}` },
    });
    assert.equal(employee.statusCode, 403);
    const admin = await app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${token("ADMIN")}` },
    });
    assert.equal(admin.statusCode, 200);
  }
  await app.close();
});
