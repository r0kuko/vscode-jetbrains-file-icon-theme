/**
 * Download JetBrains icon SVGs from the intellij-icons CDN.
 *
 * Usage:
 *   node scripts/download-jb-icons.js
 *
 * Icons are defined in the ICONS array below. Each entry specifies:
 *   - name: the icon file name on the CDN (without _dark suffix or .svg extension)
 *   - output: local file name to save as (without theme suffix or .svg)
 *   - hasDark: whether a _dark variant exists (default true)
 *   - base: CDN path prefix (defaults to KotlinBaseResourcesIcons path)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.resolve(__dirname, '../themes/icons/file');

const KOTLIN_BASE = 'KotlinBaseResourcesIcons/org/jetbrains/kotlin/idea/icons/expui';

const ICONS = [
    { name: 'abstractClassKotlin', output: 'kotlinAbstractClass' },
    { name: 'classKotlin', output: 'kotlinClass' },
    { name: 'objectKotlin', output: 'kotlinObject' },
    { name: 'interfaceKotlin', output: 'kotlinInterface' },
    { name: 'enumKotlin', output: 'kotlinEnum' },
    { name: 'annotationKotlin', output: 'kotlinAnnotation' },
    { name: 'typeAlias', output: 'kotlinTypeAlias' },
];

function buildUrl(base, iconName, dark) {
    const suffix = dark ? '_dark' : '';
    return `https://intellij-icons.jetbrains.design/icons/${base}/${iconName}${suffix}.svg`;
}

function download(url) {
    return new Promise((resolve, reject) => {
        const request = (url) => {
            https.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                    return;
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                res.on('error', reject);
            }).on('error', reject);
        };
        request(url);
    });
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let downloaded = 0;
    let failed = 0;

    for (const icon of ICONS) {
        const base = icon.base || KOTLIN_BASE;
        const hasDark = icon.hasDark !== false;

        // Light variant (no suffix)
        const lightUrl = buildUrl(base, icon.name, false);
        const lightPath = path.join(OUTPUT_DIR, `${icon.output}.svg`);

        try {
            const svg = await download(lightUrl);
            fs.writeFileSync(lightPath, svg, 'utf8');
            console.log(`  ✓ ${icon.output}.svg`);
            downloaded++;
        } catch (err) {
            console.error(`  ✗ ${icon.output}.svg — ${err.message}`);
            failed++;
        }

        // Dark variant
        if (hasDark) {
            const darkUrl = buildUrl(base, icon.name, true);
            const darkPath = path.join(OUTPUT_DIR, `${icon.output}_dark.svg`);

            try {
                const svg = await download(darkUrl);
                fs.writeFileSync(darkPath, svg, 'utf8');
                console.log(`  ✓ ${icon.output}_dark.svg`);
                downloaded++;
            } catch (err) {
                console.error(`  ✗ ${icon.output}_dark.svg — ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`\nDone: ${downloaded} downloaded, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main();
