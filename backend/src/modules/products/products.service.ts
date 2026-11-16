import {
  ProductDTO,
  ProductUpdateDTO,
  type PromotionsBatchDTO,
} from "./dto/products.dto.js";
import type ProductRepository from "./repositories/products.repository.js";
import type { ProductOutput } from "./entity/products.entity.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type {
  StorageService,
  UploadFile,
} from "../../shared/storage/storage.service.js";

const MAX_IMAGES = 3;

export default class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly storageService: StorageService,
  ) {}

  async createProduct(productDTO: ProductDTO): Promise<ProductOutput> {
    this.validateCategorySelection(productDTO);
    return this.productRepository.createProduct(productDTO);
  }

  async getProductById(id: bigint): Promise<ProductOutput> {
    const product = await this.productRepository.getProductById(id);

    if (!product || product.active === false || product.categoryId === null) {
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
    this.validateCategorySelection(productUpdateDTO);
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

  /**
   * Foto no slot 1 (capa), 2 ou 3: substitui a que existe ali ou entra no fim.
   * Sem slot = capa (compatível com o envio antigo).
   */
  async uploadProductImage(
    id: bigint,
    file: UploadFile,
    slot = 1,
  ): Promise<ProductOutput> {
    const product = await this.getProductById(id);
    const urls = [...(product.imageUrls ?? [])];
    const replaced = urls[slot - 1];
    if (!replaced && urls.length >= MAX_IMAGES) {
      throw new AppError(`O produto aceita no máximo ${MAX_IMAGES} fotos`, 400);
    }
    const newImageUrl = await this.storageService.uploadProductImage(file);
    if (replaced) urls[slot - 1] = newImageUrl;
    else urls.push(newImageUrl);

    let updatedProduct: ProductOutput;
    try {
      updatedProduct = await this.productRepository.updateProduct(id, {
        imageUrls: urls,
      });
    } catch (error) {
      await this.cleanupFile(newImageUrl);
      throw error;
    }

    if (replaced && replaced !== newImageUrl) await this.cleanupFile(replaced);
    return updatedProduct;
  }

  /** Remove a foto do slot; as seguintes sobem (sem a capa, a 2ª vira capa). */
  async removeProductImage(id: bigint, slot: number): Promise<ProductOutput> {
    const urls = await this.imageUrls(id, slot);
    const [removed] = urls.splice(slot - 1, 1);
    const updatedProduct = await this.productRepository.updateProduct(id, {
      imageUrls: urls,
    });
    await this.cleanupFile(removed);
    return updatedProduct;
  }

  /** Troca a foto do slot com a capa (slot 1). */
  async setProductCover(id: bigint, slot: number): Promise<ProductOutput> {
    const urls = await this.imageUrls(id, slot);
    [urls[0], urls[slot - 1]] = [urls[slot - 1], urls[0]];
    return this.productRepository.updateProduct(id, { imageUrls: urls });
  }

  private async imageUrls(id: bigint, slot: number) {
    const urls = [...((await this.getProductById(id)).imageUrls ?? [])];
    if (!urls[slot - 1]) throw new AppError("Foto não encontrada", 404);
    return urls;
  }

  async applyPromotions(batch: PromotionsBatchDTO) {
    return this.productRepository.applyPromotions(batch);
  }

  private validateCategorySelection(input: {
    categoryId?: bigint;
    additionalCategoryIds?: bigint[];
  }) {
    const ids = input.additionalCategoryIds;
    if (
      ids &&
      (new Set(ids).size !== ids.length ||
        (input.categoryId !== undefined && ids.includes(input.categoryId)))
    ) {
      throw new AppError(
        "Categorias adicionais duplicadas ou iguais à principal",
        400,
      );
    }
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
