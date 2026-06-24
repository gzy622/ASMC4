import sharp from "sharp";
import { mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const resources = join(root, "resources");

mkdirSync(resources, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#166534"/>
  <path d="M18 17h28v34H18z" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round"/>
  <path d="m24 34 6 6 11-14" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function main() {
  const iconPng = await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  await sharp(iconPng).toFile(join(resources, "icon.png"));
  console.log("[assets] resources/icon.png (1024×1024)");

  const splashWidth = 2732;
  const splashHeight = 2732;
  const iconSize = Math.round(splashWidth * 0.28);
  const iconTop = Math.round(splashHeight * 0.25);

  const splashIcon = await sharp(Buffer.from(svg))
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  const splashCanvas = await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: { r: 244, g: 244, b: 244, alpha: 1 }
    }
  })
    .composite([
      {
        input: splashIcon,
        top: iconTop,
        left: Math.round((splashWidth - iconSize) / 2)
      }
    ])
    .png()
    .toFile(join(resources, "splash.png"));

  console.log("[assets] resources/splash.png (2732×2732)");
}

main().catch(e => { console.error(e); process.exit(1); });
