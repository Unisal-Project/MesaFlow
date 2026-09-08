import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { StorageService, UploadFile } from "./storage.service.js";
import {
  productImagePublicPrefix,
  productUploadsDirectory,
} from "./storage.config.js";
import { AppError } from "../errors/app-errors.js";

export class LocalStorageService implements StorageService {
  constructor(
    private readonly uploadDirectory: string = productUploadsDirectory,
  ) {}

  async uploadProductImage(file: UploadFile): Promise<string> {
    await mkdir(this.uploadDirectory, { recursive: true });

    const processedImage = await this.processImage(file);
    const fileName = `${randomUUID()}.webp`;

    const destination = path.join(this.uploadDirectory, fileName);

    await writeFile(destination, processedImage, { flag: "wx" });

    return `${productImagePublicPrefix}/${fileName}`;
  }

  async delete(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);

    const fullPath = path.join(this.uploadDirectory, fileName);

    try {
      await unlink(fullPath);
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async processImage(file: UploadFile): Promise<Buffer> {
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowedMimeTypes.has(file.mimeType)) {
      throw new AppError("Formato de imagem não permitido", 415);
    }

    try {
      const image = sharp(file.buffer, {
        failOn: "warning",
        limitInputPixels: 25_000_000,
      });
      const metadata = await image.metadata();

      if (
        !metadata.format ||
        !["jpeg", "png", "webp"].includes(metadata.format) ||
        !metadata.width ||
        !metadata.height ||
        (metadata.pages ?? 1) > 1
      ) {
        throw new AppError("Arquivo de imagem inválido", 415);
      }

      return await image
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Não foi possível processar a imagem", 415);
    }
  }
}
