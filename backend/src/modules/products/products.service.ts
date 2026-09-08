import { ProductDTO, ProductUpdateDTO } from "./dto/products.dto.js";
import ProductRepository from "./repository/products.repository.js";
import type { ProductOutput } from "./entity/products.entity.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type {
  StorageService,
  UploadFile,
} from "../../shared/storage/storage.service.js";

export default class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly storageService: StorageService,
  ) {}

  async createProduct(productDTO: ProductDTO): Promise<ProductOutput> {
    return this.productRepository.createProduct(productDTO);
  }

  async getProductById(id: bigint): Promise<ProductOutput> {
    const product = await this.productRepository.getProductById(id);

    if (!product) {
      throw new AppError("Produto não encontrado", 404);
    }

    return product;
  }

  async getAllProducts(): Promise<ProductOutput[]> {
    return this.productRepository.getAllProducts();
  }

  async updateProduct(
    id: bigint,
    productUpdateDTO: ProductUpdateDTO,
  ): Promise<ProductOutput> {
    return this.productRepository.updateProduct(id, productUpdateDTO);
  }

  async deleteProduct(id: bigint): Promise<void> {
    return this.productRepository.deactivateProduct(id);
  }

  async switchCategory(
    id: bigint,
    newCategoryId: bigint,
  ): Promise<ProductOutput> {
    return this.productRepository.switchCategory(id, newCategoryId);
  }

  async uploadProductImage(
    id: bigint,
    file: UploadFile,
  ): Promise<ProductOutput> {
    const product = await this.getProductById(id);
    const newImageUrl = await this.storageService.uploadProductImage(file);

    let updatedProduct: ProductOutput;
    try {
      updatedProduct = await this.productRepository.updateProduct(id, {
        imageUrl: newImageUrl,
      });
    } catch (error) {
      await this.cleanupFile(newImageUrl);
      throw error;
    }

    if (product.imageUrl && product.imageUrl !== newImageUrl) {
      await this.cleanupFile(product.imageUrl);
    }

    return updatedProduct;
  }

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await this.storageService.delete(filePath);
    } catch (error) {
      // Uma falha de limpeza não deve desfazer uma gravação já confirmada!!!.
      console.error(`Não foi possível remover o arquivo ${filePath}`, error);
    }
  }
}
