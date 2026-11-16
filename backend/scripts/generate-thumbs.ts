import { access, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/** Executar com cwd backend (mesmo diretório de uploads usado pelo servidor). */
export async function generateThumbs(
  directory = path.resolve("uploads/products"),
) {
  let generated = 0;
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".webp") ||
      entry.name.endsWith("-thumb.webp")
    )
      continue;
    const destination = path.join(
      directory,
      entry.name.replace(/\.webp$/, "-thumb.webp"),
    );
    try {
      await access(destination);
      continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const thumbnail = await sharp(path.join(directory, entry.name))
      .rotate()
      .resize({
        width: 400,
        height: 400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();
    try {
      await writeFile(destination, thumbnail, { flag: "wx" });
      generated++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return generated;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(`Miniaturas geradas: ${await generateThumbs()}`);
}
