#!/usr/bin/env node
/**
 * generate-powershell-icons.js
 *
 * Generates composite PowerShell icon variants by overlaying badge icons
 * on the shell base icon with proper masking (cutout + transparent gap).
 *
 * Badge is placed at bottom-right. The base icon is masked using the badge's
 * actual path shapes (with stroke expansion) to cut out the badge area.
 * Each path subpath is rendered separately so evenodd holes are filled solid.
 *
 * Usage:
 *   node scripts/generate-powershell-icons.js
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../themes/icons/file');
const BASE_URL = 'https://intellij-icons.jetbrains.design/icons';

// ─── Badge Definitions ────────────────────────────────────────────────────────

const ICONS = [
  {
    saveName: 'psShellModule',
    badgePath: 'AllIcons/expui/nodes/module8x8',
    badgeScale: 0.88,
    badgeX: 8.5,
    badgeY: 8.5,
    badgeOrigSize: 8,
    cutoutMode: 'none',
  },
  {
    saveName: 'psShellData',
    badgePath: 'AllIcons/expui/fileTypes/properties',
    badgeScale: 0.5,
    badgeX: 7.5,
    badgeY: 7.5,
    badgeOrigSize: 16,
    cutoutMode: 'stroke',
    expandPx: 0.8,
  },
  {
    saveName: 'psShellXml',
    badgePath: 'AllIcons/expui/fileTypes/xml',
    badgeScale: 0.45,
    badgeX: 8.0,
    badgeY: 8.0,
    badgeOrigSize: 16,
    cutoutMode: 'stroke',
    expandPx: 0.95,
  },
  {
    saveName: 'psShellTest',
    badgePath: 'AllIcons/expui/runConfigurations/junitTestMark',
    badgeScale: 1.0,
    badgeX: 0,
    badgeY: 0,
    badgeOrigSize: 16,
    cutoutMode: 'stroke',
    expandPx: 0.8,
    special: 'junitTestMark',
  },
];

// ─── SVG Parsing Helpers ──────────────────────────────────────────────────────

/**
 * Extract inner content from an SVG string,
 * stripping the outer <svg> wrapper, comments, defs, clip-path wrappers.
 */
function extractSvgInner(svgStr) {
  let s = svgStr.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<defs>[\s\S]*?<\/defs>/g, '');
  s = s.replace(/<g\s+clip-path="[^"]*">/g, '').replace(/<\/g>/g, '');
  s = s.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return s.trim();
}

function attrVal(s, name) {
  const m = s.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/**
 * Split an SVG path `d` attribute into individual subpaths.
 * Each subpath starts with M/m.
 */
function splitSubpaths(d) {
  return d.split(/(?=[Mm])/).map(s => s.trim()).filter(Boolean);
}

/**
 * Extract mask cutout elements from badge SVG inner content.
 * Returns an array of SVG element strings with fill/stroke set to black.
 *
 * Each path subpath is rendered as a separate element so that
 * evenodd holes are filled solid (each subpath individually filled).
 * Stroke provides the outward expansion; stroke-linejoin="miter" keeps
 * angular corners matching the JetBrains expui icon style.
 */
function extractMaskElements(svgInner, strokeWidth) {
  const sw = Math.round(strokeWidth * 1000) / 1000;
  const strokeAttrs = `fill="black" stroke="black" stroke-width="${sw}" stroke-linejoin="miter"`;
  const elements = [];

  // Extract <path> elements
  const pathRe = /<path[^>]*\bd="([^"]+)"[^>]*\/?>/g;
  let m;
  while ((m = pathRe.exec(svgInner)) !== null) {
    const subpaths = splitSubpaths(m[1]);
    for (const sp of subpaths) {
      elements.push(`<path d="${sp}" ${strokeAttrs}/>`);
    }
  }

  // Extract <rect> elements
  const rectRe = /<rect\s+([^>]*)\/?>/g;
  while ((m = rectRe.exec(svgInner)) !== null) {
    const attrs = m[1];
    const x = attrVal(attrs, 'x') || '0';
    const y = attrVal(attrs, 'y') || '0';
    const w = attrVal(attrs, 'width');
    const h = attrVal(attrs, 'height');
    const rx = attrVal(attrs, 'rx') || '0';
    elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${strokeAttrs}/>`);
  }

  return elements;
}

// ─── SVG Composition ──────────────────────────────────────────────────────────

function buildSvg(baseInner, badgeInner, config, maskId) {
  const { badgeScale: scale, badgeX: tx, badgeY: ty, cutoutMode, special } = config;
  const expandPx = config.expandPx || 0.8;

  // Determine badge transform
  let badgeTransform, maskTransform;
  if (special === 'junitTestMark') {
    // Reposition from top-right (x:7.5-16, y:0-6) to bottom-right
    badgeTransform = 'translate(0.5, 10)';
    maskTransform = badgeTransform;
  } else {
    badgeTransform = `translate(${tx}, ${ty}) scale(${scale})`;
    maskTransform = badgeTransform;
  }

  // No cutout — just overlay badge on base
  if (cutoutMode === 'none') {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
${baseInner}
<g transform="${badgeTransform}">
  ${badgeInner}
</g>
</svg>`;
  }

  // Stroke-based cutout: render badge shapes with fill+stroke in mask.
  // strokeWidth in badge's LOCAL coordinate space:
  //   effective outward expansion = strokeWidth_local * scale / 2
  //   so strokeWidth_local = expandPx * 2 / scale
  const localStrokeWidth = special === 'junitTestMark'
    ? expandPx * 2      // scale=1, no scaling in transform
    : expandPx * 2 / scale;

  const maskElements = extractMaskElements(badgeInner, localStrokeWidth);
  const maskShapesStr = maskElements.map(e => `      ${e}`).join('\n');

  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <mask id="${maskId}">
    <rect width="16" height="16" fill="white"/>
    <g transform="${maskTransform}">
${maskShapesStr}
    </g>
  </mask>
</defs>
<g mask="url(#${maskId})">
  ${baseInner}
</g>
<g transform="${badgeTransform}">
  ${badgeInner}
</g>
</svg>`;
}

// ─── Network ──────────────────────────────────────────────────────────────────

function download(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error(`Too many redirects for ${url}`));
        return download(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const baseLightSvg = await download(`${BASE_URL}/AllIcons/expui/fileTypes/shell.svg`);
  const baseDarkSvg = await download(`${BASE_URL}/AllIcons/expui/fileTypes/shell_dark.svg`);
  const baseLightInner = extractSvgInner(baseLightSvg);
  const baseDarkInner = extractSvgInner(baseDarkSvg);

  let ok = 0, failed = 0;

  for (const config of ICONS) {
    for (const variant of ['', '_dark']) {
      const isDark = variant === '_dark';
      const baseInner = isDark ? baseDarkInner : baseLightInner;
      const badgeUrl = `${BASE_URL}/${config.badgePath}${variant}.svg`;

      try {
        const badgeSvg = await download(badgeUrl);
        const badgeInner = extractSvgInner(badgeSvg);

        const maskId = `cutout_${config.saveName}${variant}`;
        const svg = buildSvg(baseInner, badgeInner, config, maskId);

        const outFile = path.join(OUT_DIR, `${config.saveName}${variant}.svg`);
        fs.writeFileSync(outFile, svg, 'utf8');
        console.log(`  ✓  ${config.saveName}${variant}.svg`);
        ok++;
      } catch (err) {
        console.error(`  ✗  ${config.saveName}${variant}.svg — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nGenerated ${ok} icon files → ${OUT_DIR}`);
  if (failed > 0) process.exit(1);
}

main();
