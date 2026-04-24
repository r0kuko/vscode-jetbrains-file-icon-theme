#!/usr/bin/env node
/**
 * fetch-jb-icons.js
 *
 * Downloads SVG icons from intellij-icons.jetbrains.design and saves them
 * to themes/icons/file/.
 *
 * Each entry in ICONS declares:
 *   iconPath  – the path segment after the base URL (no .svg suffix, no _dark suffix)
 *   saveName  – the filename stem used when writing to the output directory
 *
 * Both the light variant (<saveName>.svg) and the dark variant
 * (<saveName>_dark.svg) are downloaded for every entry.
 *
 * Usage:
 *   node scripts/fetch-jb-icons.js
 *
 * Add/remove entries in ICONS to control what gets downloaded.
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = 'https://intellij-icons.jetbrains.design/icons';

/** Output directory (relative to repo root). */
const OUT_DIR = path.resolve(__dirname, '../themes/icons/file');

/**
 * Icons to fetch.
 * @type {{ iconPath: string; saveName: string }[]}
 */
const ICONS = [
  // Kotlin platform icons
  {
    iconPath: 'KotlinBaseResourcesIcons/org/jetbrains/kotlin/idea/icons/expui/kotlinGradleScript',
    saveName: 'kotlinGradleScript',
  },
  {
    iconPath: 'KotlinBaseResourcesIcons/org/jetbrains/kotlin/idea/icons/expui/kotlinScript',
    saveName: 'kotlinScript',
  },
  {
    iconPath: 'KotlinBaseResourcesIcons/org/jetbrains/kotlin/idea/icons/expui/kotlinJs',
    saveName: 'kotlinJs',
  },
  {
    iconPath: 'KotlinBaseResourcesIcons/org/jetbrains/kotlin/idea/icons/expui/kotlinNative',
    saveName: 'kotlinNative',
  },

  // ── Add more icons below ──────────────────────────────────────────────────
  // Example:
  // {
  //   iconPath: 'AllIcons/expui/fileTypes/text',
  //   saveName: 'text',
  // },
];

// ─── Downloader ───────────────────────────────────────────────────────────────

/**
 * Downloads a single URL to a file, following up to `maxRedirects` redirects.
 * @param {string} url
 * @param {string} dest
 * @param {number} [maxRedirects=5]
 * @returns {Promise<void>}
 */
function download(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (maxRedirects <= 0) {
            return reject(new Error(`Too many redirects for ${url}`));
          }
          return download(res.headers.location, dest, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume(); // drain to free memory
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      })
      .on('error', (err) => reject(err));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  let ok = 0;
  let failed = 0;

  for (const { iconPath, saveName } of ICONS) {
    for (const variant of ['', '_dark']) {
      const url = `${BASE_URL}/${iconPath}${variant}.svg`;
      const dest = path.join(OUT_DIR, `${saveName}${variant}.svg`);

      process.stdout.write(`  downloading ${saveName}${variant}.svg ... `);
      try {
        await download(url, dest);
        console.log('✓');
        ok++;
      } catch (err) {
        console.log(`✗  (${err.message})`);
        failed++;
      }
    }
  }

  console.log(`\n${ok} downloaded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
