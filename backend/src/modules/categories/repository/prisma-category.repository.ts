import { prisma } from "../../../database/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";

import { CategoryEntity } from "../entity/category.entity.js";

import type {
    CategoryRepository,
    CreateCategoryData,
    UpdateCategoryData
} from "./category.repository.js";

export class PrismaCategoryRepository implements CategoryRepository {

    constructor(
        private readonly prismaClient: typeof prisma = prisma
    ) {}

    private toEntity(category: {
        id: bigint;
        name: string;
        description: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): CategoryEntity {

        return new CategoryEntity(
            category.id,
            category.name,
            category.description,
            category.active,
            category.createdAt,
            category.updatedAt
        );
    }

    async create(data: CreateCategoryData): Promise<CategoryEntity> {
        try {
            const category = await this.prismaClient.category.create({
                data
            });

            return this.toEntity(category);

        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async findAll(): Promise<CategoryEntity[]> {

        const categories = await this.prismaClient.category.findMany();

        return categories.map((category) => this.toEntity(category));
    }

    async findById(id: bigint): Promise<CategoryEntity | null> {

        const category = await this.prismaClient.category.findUnique({
            where: { id }
        });

        return category ? this.toEntity(category) : null;
    }

    async update(
        id: bigint,
        data: UpdateCategoryData
    ): Promise<CategoryEntity> {

        try {
            const category = await this.prismaClient.category.update({
                where: { id },
                data
            });

            return this.toEntity(category);

        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    async delete(id: bigint): Promise<void> {

        try {
            await this.prismaClient.category.delete({
                where: { id }
            });

        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    private handlePrismaError(error: unknown): never {

        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2002") {
                throw new AppError(
                    "Já existe uma categoria com esse nome",
                    409
                );
            }

            if (error.code === "P2025") {
                throw new AppError(
                    "Categoria não encontrada",
                    404
                );
            }

            if (error.code === "P2003") {
                throw new AppError(
                    "Não é possível excluir uma categoria que possui produtos",
                    409
                );
            }
        }

        throw error;
    }
}