import ProductService from "./products.service.js";
import {
  ProductSchema,
  ProductIdSchema,
  ProductUpdateSchema,
  ProductCategoryUpdateSchema,
} from "./dto/products.dto.js";
import type {
  ProductOutput,
  ProductResponse,
} from "./entity/products.entity.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

export default class ProductsController {
  constructor(private readonly productService: ProductService) {}

  async createProduct(request: FastifyRequest, reply: FastifyReply) {
    const parsedBody = ProductSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return this.sendValidationError(reply, parsedBody.error.issues);
    }

    const product = await this.productService.createProduct(parsedBody.data);
    return reply.status(201).send(this.toResponse(product));
  }

  async getProductById(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    const product = await this.productService.getProductById(id);
    return reply.status(200).send(this.toResponse(product));
  }

  async getAllProducts(_request: FastifyRequest, reply: FastifyReply) {
    const products = await this.productService.getAllProducts();
    return reply
      .status(200)
      .send(products.map((product) => this.toResponse(product)));
  }

  async updateProduct(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    const parsedBody = ProductUpdateSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return this.sendValidationError(reply, parsedBody.error.issues);
    }

    const product = await this.productService.updateProduct(
      id,
      parsedBody.data,
    );
    return reply.status(200).send(this.toResponse(product));
  }

  async deleteProduct(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    await this.productService.deleteProduct(id);
    return reply.status(204).send();
  }

  async switchCategory(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    const parsedBody = ProductCategoryUpdateSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return this.sendValidationError(reply, parsedBody.error.issues);
    }

    const product = await this.productService.switchCategory(
      id,
      parsedBody.data.newCategoryId,
    );
    return reply.status(200).send(this.toResponse(product));
  }

  async uploadProductImage(request: FastifyRequest, reply: FastifyReply) {
    const id = this.parseId(request, reply);
    if (id === null) return;

    if (!request.isMultipart()) {
      return reply.status(415).send({
        message: "Envie a imagem usando multipart/form-data",
      });
    }

    const image = await request.file();
    if (!image) {
      return reply.status(400).send({ message: "Imagem não enviada" });
    }

    const product = await this.productService.uploadProductImage(id, {
      buffer: await image.toBuffer(),
      originalName: image.filename,
      mimeType: image.mimetype,
    });

    return reply.status(200).send(this.toResponse(product));
  }

  private parseId(request: FastifyRequest, reply: FastifyReply): bigint | null {
    const { id } = request.params as { id?: unknown };
    const parsedId = ProductIdSchema.safeParse(id);

    if (!parsedId.success) {
      this.sendValidationError(
        reply,
        parsedId.error.issues,
        "ID do produto inválido",
      );
      return null;
    }

    return parsedId.data;
  }

  private sendValidationError(
    reply: FastifyReply,
    issues: z.core.$ZodIssue[],
    message = "Dados do produto inválidos",
  ) {
    return reply.status(400).send({ message, issues });
  }

  private toResponse(product: ProductOutput): ProductResponse {
    return {
      ...product,
      id: product.id.toString(),
      categoryId: product.categoryId.toString(),
      price: product.price.toString(),
    };
  }
}
