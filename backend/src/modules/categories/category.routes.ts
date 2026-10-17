import { FastifyInstance } from "fastify";
import CategoryController from "./category.controller.js";
import CategoryService from "./category.service.js";
import PrismaCategoryRepository from "./repository/prisma-category.repository.js";

const categoryRepository = new PrismaCategoryRepository();
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

export function registerCategoryRoutes(app: FastifyInstance) {
  app.get("/categories", (request, reply) =>
    categoryController.getAllCategories(request, reply),
  );
  app.get("/categories/:id", (request, reply) =>
    categoryController.getCategoryById(request, reply),
  );
  app.post(
    "/categories",
    (request, reply) => categoryController.createCategory(request, reply),
  );
  app.put(
    "/categories/:id",
    (request, reply) => categoryController.updateCategory(request, reply),
  );
  app.delete(
    "/categories/:id",
    (request, reply) => categoryController.deleteCategory(request, reply),
  );
}
