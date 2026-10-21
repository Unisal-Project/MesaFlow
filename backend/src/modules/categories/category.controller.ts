import type { FastifyRequest, FastifyReply } from "fastify";

import CategoryService from "./category.service.js";

import { createCategorySchema } from "./dto/create-category.dto.js";
import { updateCategorySchema } from "./dto/update-category.dto.js";
import { categoryIdSchema } from "./dto/category-id.dto.js";

import type { CategoryEntity } from "./entity/category.entity.js";

export default class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    const data = createCategorySchema.parse(request.body);

    const category = await this.categoryService.createCategory(data);

    return reply.status(201).send(this.toResponse(category));
  }

  async getAllCategories(_request: FastifyRequest, reply: FastifyReply) {
    const categories = await this.categoryService.getAllCategories();

    return reply
      .status(200)
      .send(categories.map((category) => this.toResponse(category)));
  }

  async getCategoryById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = categoryIdSchema.parse(request.params);

    const category = await this.categoryService.getCategoryById(id);

    if (!category) {
      return reply.status(404).send({
        message: "Category not found",
      });
    }

    return reply.status(200).send(this.toResponse(category));
  }

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    const { id } = categoryIdSchema.parse(request.params);

    const data = updateCategorySchema.parse(request.body);

    const category = await this.categoryService.updateCategory(id, data);

    return reply.status(200).send(this.toResponse(category));
  }

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    const { id } = categoryIdSchema.parse(request.params);

    await this.categoryService.deleteCategory(id);

    return reply.status(204).send();
  }

  private toResponse(category: CategoryEntity) {
    return {
      id: category.id.toString(),
      name: category.name,
      description: category.description,
      active: category.active,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
