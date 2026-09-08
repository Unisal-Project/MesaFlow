import path from "node:path";

export const uploadsRootDirectory = path.resolve(process.cwd(), "uploads");

export const productUploadsDirectory = path.join(
  uploadsRootDirectory,
  "products",
);

export const productImagePublicPrefix = "/uploads/products";
