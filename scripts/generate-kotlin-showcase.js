/**
 * Generate a showcase image of Kotlin content-aware icons.
 * Produces both dark and light versions.
 *
 * Usage: node scripts/generate-kotlin-showcase.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.resolve(__dirname, '../themes/icons/file');
const OUTPUT_DIR = path.resolve(__dirname, '../assets/img');

const ICON_SIZE = 32;
const PADDING = 20;
const LABEL_HEIGHT = 20;
const ROW_GAP = 12;
const COL_GAP = 20;

const ICONS = [
    { file: 'kotlin', label: 'Kotlin' },
    { file: 'kotlinClass', label: 'Class' },
    { file: 'kotlinAbstractClass', label: 'Abstract' },
    { file: 'kotlinInterface', label: 'Interface' },
    { file: 'kotlinObject', label: 'Object' },
    { file: 'kotlinEnum', label: 'Enum' },
    { file: 'kotlinAnnotation', label: 'Annotation' },
    { file: 'kotlinTypeAlias', label: 'TypeAlias' },
];

async function generateShowcase(variant) {
    const isDark = variant === 'dark';
    const suffix = isDark ? '_dark' : '';
    const bgColor = isDark ? '#2b2d30' : '#f7f8fa';
    const textColor = isDark ? '#bcc0cc' : '#4e5157';
    const borderColor = isDark ? '#3c3f41' : '#d1d5db';

    const cellWidth = ICON_SIZE + COL_GAP * 2;
    const cellHeight = ICON_SIZE + LABEL_HEIGHT + ROW_GAP;
    const cols = ICONS.length;
    const width = cols * cellWidth + PADDING * 2;
    const height = cellHeight + PADDING * 2;

    // Build SVG with labels
    let iconComposites = [];
    let svgLabels = '';

    for (let i = 0; i < ICONS.length; i++) {
        const icon = ICONS[i];
        let svgFile = path.join(ICONS_DIR, `${icon.file}${suffix}.svg`);
        if (!fs.existsSync(svgFile)) {
            svgFile = path.join(ICONS_DIR, `${icon.file}.svg`);
        }

        if (!fs.existsSync(svgFile)) {
            console.warn(`  ⚠ Missing: ${icon.file}${suffix}.svg`);
            continue;
        }

        const x = PADDING + i * cellWidth + (cellWidth - ICON_SIZE) / 2;
        const y = PADDING;

        const svgBuf = await sharp(svgFile)
            .resize(ICON_SIZE, ICON_SIZE)
            .png()
            .toBuffer();

        iconComposites.push({
            input: svgBuf,
            left: Math.round(x),
            top: Math.round(y),
        });

        // Label below icon
        const labelX = PADDING + i * cellWidth + cellWidth / 2;
        const labelY = PADDING + ICON_SIZE + ROW_GAP + LABEL_HEIGHT / 2;
        svgLabels += `<text x="${labelX}" y="${labelY}" 
            font-family="Inter, -apple-system, sans-serif" font-size="11" 
            fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${icon.label}</text>\n`;
    }

    // Create base image with background
    const bgSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" rx="8" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
        ${svgLabels}
    </svg>`;

    const result = await sharp(Buffer.from(bgSvg))
        .png()
        .composite(iconComposites)
        .toBuffer();

    const outputFile = path.join(OUTPUT_DIR, `kotlin-icons-${variant}.png`);
    await sharp(result).toFile(outputFile);
    console.log(`  ✓ ${path.basename(outputFile)}`);
}

async function main() {
    console.log('Generating Kotlin icon showcases...');
    await generateShowcase('dark');
    await generateShowcase('light');
    console.log('Done!');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
