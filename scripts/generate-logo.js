/**
 * Generate an enhanced logo icon by adding a sparkle (✦) badge
 * to the bottom-right corner of the original icon.
 *
 * Usage: node scripts/generate-logo.js
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');

const INPUT = path.resolve(__dirname, '../assets/img/icon.png');
const OUTPUT = path.resolve(__dirname, '../assets/img/icon-enhanced.png');

async function main() {
  const image = sharp(INPUT);
  const { width, height } = await image.metadata();

  // Badge size and position (bottom-right)
  const badgeSize = Math.round(width * 0.5)// 0.32);
//   const margin = Math.round(width * 0.04);
  const margin = Math.round(width * 0.04);

  // Create an SVG sparkle symbol (white, no background)
  const svg = `
    <svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
      <text x="65%" y="75%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${badgeSize * 0.85}" font-weight="bold"
            fill="#FFFFFF">✦</text>
    </svg>`;

  const badge = Buffer.from(svg);

  const result = await image
    .composite([
      {
        input: badge,
        top: height - badgeSize - margin,
        left: width - badgeSize - margin,
      },
    ])
    .png()
    .toBuffer();

  await sharp(result).toFile(OUTPUT);

  console.log(`Done! Enhanced icon saved to: ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
