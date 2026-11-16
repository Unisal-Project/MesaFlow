import type { FastifyInstance } from "fastify";
import ProductsController from "./products.controller.js";
import ProductService from "./products.service.js";
import { PrismaProductRepository } from "./repositories/prisma-products.repository.js";
import { LocalStorageService } from "../../shared/storage/local-storage.service.js";

const productRepository = new PrismaProductRepository();
const storageService = new LocalStorageService();
const productService = new ProductService(productRepository, storageService);
const productController = new ProductsController(productService);

export function registerProductRoutes(app: FastifyInstance) {
  app.get("/products", (request, reply) =>
    productController.getAllProducts(request, reply),
  );

  app.get("/products/:id", (request, reply) =>
    productController.getProductById(request, reply),
  );

  app.post("/products", (request, reply) =>
    productController.createProduct(request, reply),
  );

  app.patch("/products/:id", (request, reply) =>
    productController.updateProduct(request, reply),
  );

  app.patch("/products/:id/category", (request, reply) =>
    productController.switchCategory(request, reply),
  );

  app.post("/products/:id/image", (request, reply) =>
    productController.uploadProductImage(request, reply),
  );

  app.delete("/products/:id/image/:slot", (request, reply) =>
    productController.removeProductImage(request, reply),
  );

  app.patch("/products/:id/image/:slot/cover", (request, reply) =>
    productController.setProductCover(request, reply),
  );

  app.delete("/products/:id", (request, reply) =>
    productController.deleteProduct(request, reply),
  );

  // Promoção em lote (produtos + categorias) para a aba Promoções.
  app.patch("/promotions", (request, reply) =>
    productController.applyPromotions(request, reply),
  );
}
