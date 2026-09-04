// Gera os ícones PNG do PWA a partir dos SVGs em public/.
// Uso: node scripts/generate-icons.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public", "icon.svg");
const MASKABLE = join(ROOT, "public", "icon-maskable.svg");
const OUT = join(ROOT, "public", "icons");

await mkdir(OUT, { recursive: true });

for (const size of [192, 512]) {
  await sharp(SRC).resize(size, size).png().toFile(join(OUT, `icon-${size}.png`));
}
await sharp(MASKABLE).resize(512, 512).png().toFile(join(OUT, "icon-512-maskable.png"));
await sharp(SRC).resize(180, 180).png().toFile(join(OUT, "apple-touch-icon.png"));

console.log("Ícones PWA gerados em public/icons/.");