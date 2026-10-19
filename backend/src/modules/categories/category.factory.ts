import CategoryService from "./category.service.js";

import { PrismaCategoryRepository } from "./repository/prisma-category.repository.js";

export function makeCategoryService(): CategoryService {

    const categoryRepository = new PrismaCategoryRepository();

    return new CategoryService(categoryRepository);
}