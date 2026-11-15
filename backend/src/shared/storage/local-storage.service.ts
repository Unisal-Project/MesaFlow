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

    const [processedImage, thumbnail] = await this.processImage(file);
    const fileName = `${randomUUID()}.webp`;

    const destination = path.join(this.uploadDirectory, fileName);

    await writeFile(destination, processedImage, { flag: "wx" });
    try {
      await writeFile(
        destination.replace(/\.webp$/, "-thumb.webp"),
        thumbnail,
        { flag: "wx" },
      );
    } catch (error) {
      await this.delete(fileName);
      throw error;
    }

    return `${productImagePublicPrefix}/${fileName}`;
  }

  async delete(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);

    for (const name of [fileName, fileName.replace(/\.webp$/, "-thumb.webp")]) {
      try {
        await unlink(path.join(this.uploadDirectory, name));
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  private async processImage(file: UploadFile): Promise<[Buffer, Buffer]> {
    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ]);

    if (!allowedMimeTypes.has(file.mimeType)) {
      throw new AppError(
        "Formato de imagem não permitido. Use JPG, PNG, WebP ou AVIF",
        415,
      );
    }

    try {
      const image = sharp(file.buffer, {
        failOn: "warning",
        limitInputPixels: 25_000_000,
      });
      const metadata = await image.metadata();

      const allowedFormat =
        ["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
        (metadata.format === "heif" && metadata.compression === "av1");
      if (!allowedFormat) {
        throw new AppError(
          "Formato de imagem não permitido. Use JPG, PNG, WebP ou AVIF",
          415,
        );
      }
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
        throw new AppError("Arquivo de imagem inválido", 415);
      }

      const variant = (size: number, quality: number) =>
        image
          .clone()
          .rotate()
          .resize({
            width: size,
            height: size,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality })
          .toBuffer();
      return await Promise.all([variant(1200, 82), variant(400, 75)]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Não foi possível processar a imagem", 415);
    }
  }
}
