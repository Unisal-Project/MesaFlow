import type { FastifyInstance } from "fastify";
import ProductsController from "./products.controller.js";
import ProductService from "./products.service.js";
import PrismaProductsRepository from "./repository/prisma-products.repository.js";
import { LocalStorageService } from "../../shared/storage/local-storage.service.js";

const productRepository = new PrismaProductsRepository();
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

  app.delete("/products/:id", (request, reply) =>
    productController.deleteProduct(request, reply),
  );
}
