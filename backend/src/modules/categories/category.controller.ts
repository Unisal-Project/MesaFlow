import CategoryService from "./category.service.js";
import { CategoryIdSchema, CategorySchema } from "./dto/category.dto.js";
import { CategoryOutput, CategoryResponse } from "./entity/category.entity.js";
import { FastifyRequest, FastifyReply } from "fastify";

export default class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    const parsedBody = CategorySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return this.sendValidationError(reply, parsedBody.error.issues);
    }

    const category = await this.categoryService.createCategory(parsedBody.data);
    return reply.status(201).send(this.toResponse(category));
  }

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    await this.categoryService.deleteCategory(id);
    return reply.status(204).send();
  }

  async getAllCategories(_request: FastifyRequest, reply: FastifyReply) {
    const categories = await this.categoryService.getAllCategories();
    return reply
      .status(200)
      .send(categories.map((category) => this.toResponse(category)));
  }

  async getCategoryById(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    const category = await this.categoryService.getCategoryById(id);
    if (!category) {
      return reply.status(404).send({ message: "Category not found" });
    }
    return reply.status(200).send(this.toResponse(category));
  }

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    const parsedBody = CategorySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return this.sendValidationError(reply, parsedBody.error.issues);
    }

    const category = await this.categoryService.updateCategory(
      id,
      parsedBody.data,
    );
    return reply.status(200).send(this.toResponse(category));
  }

  private parseId(request: FastifyRequest, reply: FastifyReply): bigint | null {
    const { id } = request.params as { id: string };
    const parsedId = CategoryIdSchema.safeParse(id);

    if (!parsedId.success) {
      this.sendValidationError(
        reply,
        parsedId.error.issues,
        "Invalid category id",
      );
      return null;
    }

    return parsedId.data;
  }

  private sendValidationError(
    reply: FastifyReply,
    issues: unknown,
    message = "Invalid request body",
  ) {
    return reply.status(400).send({ message, issues });
  }

  private toResponse(category: CategoryOutput): CategoryResponse {
    return {
      ...category,
      id: category.id.toString(),
    };
  }
}
