import type { FastifyInstance } from "fastify";

import CategoryController from "./category.controller.js";
import { makeCategoryService } from "./category.factory.js";

export async function registerCategoryRoutes(app: FastifyInstance) {

    const categoryService = makeCategoryService();
    const categoryController = new CategoryController(categoryService);

    app.post("/", (request, reply) =>
        categoryController.createCategory(request, reply)
    );

    app.get("/", (request, reply) =>
        categoryController.getAllCategories(request, reply)
    );

    app.get("/:id", (request, reply) =>
        categoryController.getCategoryById(request, reply)
    );

    app.put("/:id", (request, reply) =>
        categoryController.updateCategory(request, reply)
    );

    app.delete("/:id", (request, reply) =>
        categoryController.deleteCategory(request, reply)
    );
}