import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { LocalStorageService } from "../src/shared/storage/local-storage.service.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/thumbs_test";
process.env.JWT_SECRET ??= "thumb-test-secret";
process.env.FRONTEND_URL ??= "http://localhost:5173";
const { PrismaProductRepository } =
  await import("../src/modules/products/repositories/prisma-products.repository.js");
const { default: ProductService } =
  await import("../src/modules/products/products.service.js");
import type ProductsRepository from "../src/modules/products/repositories/products.repository.js";

test("AVIF aceito gera original WebP 1200 e miniatura 400; excluir remove ambas com basename", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mesaflow-avif-"));
  try {
    const buffer = await sharp({
      create: { width: 1600, height: 800, channels: 3, background: "red" },
    })
      .avif()
      .toBuffer();
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.format, "heif");
    assert.equal(metadata.compression, "av1");
    const storage = new LocalStorageService(directory);
    const url = await storage.uploadProductImage({
      buffer,
      mimeType: "image/avif",
      originalName: "photo.avif",
    });
    assert.match(url, /\.webp$/);
    const full = path.join(directory, path.basename(url));
    const thumb = full.replace(/\.webp$/, "-thumb.webp");
    assert.deepEqual(
      (await readdir(directory)).sort(),
      [path.basename(full), path.basename(thumb)].sort(),
    );
    const image = await sharp(full).metadata(),
      small = await sharp(thumb).metadata();
    assert.equal(image.format, "webp");
    assert.equal(image.width, 1200);
    assert.equal(image.height, 600);
    assert.equal(small.format, "webp");
    assert.equal(small.width, 400);
    assert.equal(small.height, 200);
    await storage.delete("../../" + path.basename(url));
    assert.deepEqual(await readdir(directory), []);
    await storage.delete(url);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("HEIC/HEVC e outros MIME não são aceitos e explicam formatos disponíveis", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mesaflow-reject-"));
  try {
    const storage = new LocalStorageService(directory);
    for (const mimeType of ["image/heic", "image/heif", "image/gif"]) {
      await assert.rejects(
        storage.uploadProductImage({
          buffer: Buffer.from("invalid"),
          mimeType,
          originalName: "image",
        }),
        /Use JPG, PNG, WebP ou AVIF/,
      );
    }
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("substituir/remover foto pelo serviço apaga as duas variantes reais", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mesaflow-replace-"));
  try {
    const storage = new LocalStorageService(directory);
    const file = {
      buffer: await sharp({
        create: { width: 800, height: 800, channels: 3, background: "blue" },
      })
        .png()
        .toBuffer(),
      mimeType: "image/png",
      originalName: "a.png",
    };
    let imageUrls: string[] = [];
    const product = () => ({
      id: 1n,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
    });
    const repo = {
      getProductById: async () => product(),
      updateProduct: async (_id: bigint, input: { imageUrls: string[] }) => {
        imageUrls = input.imageUrls;
        return product();
      },
    } as unknown as ProductsRepository;
    const service = new ProductService(repo, storage);
    await service.uploadProductImage(1n, file);
    const old = imageUrls[0];
    await service.uploadProductImage(1n, file);
    const names = await readdir(directory);
    assert.equal(names.length, 2);
    assert.ok(!names.includes(path.basename(old)));
    assert.ok(
      !names.includes(path.basename(old).replace(/\.webp$/, "-thumb.webp")),
    );
    await service.removeProductImage(1n, 1);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("toProduct deriva thumbUrls na ordem de imageUrls, inclusive quando há slot vazio", async () => {
  const rows = [
    {
      id: 1n,
      imageUrl: "/uploads/products/a.webp",
      imageUrl2: null,
      imageUrl3: "/uploads/products/c.webp",
      price: "10",
      promoValue: null,
      promoActive: false,
    },
    {
      id: 2n,
      imageUrl: null,
      imageUrl2: null,
      imageUrl3: null,
      price: "10",
      promoValue: null,
      promoActive: false,
    },
  ];
  const repo = new PrismaProductRepository({
    product: { findMany: async () => rows },
  } as any);
  const products = await repo.getAllProducts();
  assert.deepEqual(products[0].imageUrls, [
    "/uploads/products/a.webp",
    "/uploads/products/c.webp",
  ]);
  assert.deepEqual(products[0].thumbUrls, [
    "/uploads/products/a-thumb.webp",
    "/uploads/products/c-thumb.webp",
  ]);
  assert.deepEqual(products[1].thumbUrls, []);
});

test("script gera somente miniaturas ausentes e é idempotente", async () => {
  const { generateThumbs } = await import("../scripts/generate-thumbs.js");
  const directory = await mkdtemp(path.join(tmpdir(), "mesaflow-backfill-"));
  try {
    await sharp({
      create: { width: 1200, height: 600, channels: 3, background: "green" },
    })
      .webp()
      .toFile(path.join(directory, "old.webp"));
    assert.equal(await generateThumbs(directory), 1);
    const thumb = path.join(directory, "old-thumb.webp");
    const before = await stat(thumb),
      content = await readFile(thumb);
    assert.equal((await sharp(content).metadata()).width, 400);
    assert.equal(await generateThumbs(directory), 0);
    assert.equal((await stat(thumb)).mtimeMs, before.mtimeMs);
    assert.deepEqual(await readFile(thumb), content);
    assert.equal((await readdir(directory)).length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("script sem uploads ainda informa zero miniaturas", async () => {
  const { generateThumbs } = await import("../scripts/generate-thumbs.js");
  const directory = await mkdtemp(
    path.join(tmpdir(), "mesaflow-empty-thumbs-"),
  );
  try {
    assert.equal(await generateThumbs(path.join(directory, "missing")), 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
