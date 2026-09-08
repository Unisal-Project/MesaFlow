export type UploadFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export abstract class StorageService {
  abstract uploadProductImage(file: UploadFile): Promise<string>;

  abstract delete(filePath: string): Promise<void>;
}
