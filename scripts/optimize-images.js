#!/usr/bin/env node
/*
 * Processes images/raw/<folder>/* into images/<folder>/* as WebP + JPEG fallback.
 * hero images are capped at 1920px wide, everything else at 800px wide (aspect preserved).
 * Quality is stepped down per-image until the output is under the 200KB target.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAW_DIR = path.join(__dirname, '..', 'images', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'images');
const TARGET_BYTES = 200 * 1024;
const HERO_MAX_WIDTH = 1920;
const DEFAULT_MAX_WIDTH = 800;
const QUALITY_STEPS = [85, 80, 75, 70, 65, 60, 55, 50, 45, 40];
const JPEG_QUALITY_FLOOR = 50;

const FOLDERS = ['hero', 'treatments', 'andrea', 'products', 'space'];

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(0) + 'KB';
}

async function encodeUnderTarget(pipeline, format) {
  let last = null;
  for (const quality of QUALITY_STEPS) {
    if (format === 'jpeg' && quality < JPEG_QUALITY_FLOOR) break;
    const buf = await pipeline
      .clone()[format](
        format === 'webp'
          ? { quality, effort: 6 }
          : { quality, mozjpeg: true }
      )
      .toBuffer();
    last = { buf, quality };
    if (buf.length <= TARGET_BYTES) return last;
  }
  return last; // best effort at floor quality
}

async function processImage(folder, filename) {
  const srcPath = path.join(RAW_DIR, folder, filename);
  const originalSize = fs.statSync(srcPath).size;
  const maxWidth = folder === 'hero' ? HERO_MAX_WIDTH : DEFAULT_MAX_WIDTH;
  const base = path.parse(filename).name;

  const resized = sharp(srcPath).resize({
    width: maxWidth,
    withoutEnlargement: true,
    fit: 'inside',
  });
  const meta = await resized.clone().metadata();

  const webp = await encodeUnderTarget(resized, 'webp');
  const jpeg = await encodeUnderTarget(resized, 'jpeg');

  const outDir = path.join(OUT_DIR, folder);
  fs.mkdirSync(outDir, { recursive: true });
  const webpPath = path.join(outDir, `${base}.webp`);
  const jpegPath = path.join(outDir, `${base}.jpg`);
  fs.writeFileSync(webpPath, webp.buf);
  fs.writeFileSync(jpegPath, jpeg.buf);

  return {
    folder,
    filename,
    width: meta.width,
    height: meta.height,
    originalSize,
    webpSize: webp.buf.length,
    webpQuality: webp.quality,
    jpegSize: jpeg.buf.length,
    jpegQuality: jpeg.quality,
  };
}

async function main() {
  const results = [];
  for (const folder of FOLDERS) {
    const srcDir = path.join(RAW_DIR, folder);
    if (!fs.existsSync(srcDir)) continue;
    const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
    for (const file of files) {
      const r = await processImage(folder, file);
      results.push(r);
      const flagWebp = r.webpSize > TARGET_BYTES ? '  [!] over target' : '';
      console.log(
        `${r.folder}/${file}: ${fmtKB(r.originalSize)} -> webp ${fmtKB(r.webpSize)} (q${r.webpQuality}), jpg ${fmtKB(r.jpegSize)} (q${r.jpegQuality})${flagWebp}`
      );
    }
  }

  // Summary
  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalWebp = results.reduce((s, r) => s + r.webpSize, 0);
  const totalJpeg = results.reduce((s, r) => s + r.jpegSize, 0);

  console.log('\n=== Before / After Summary ===\n');
  console.log(
    'Folder'.padEnd(12) +
      'Files'.padEnd(7) +
      'Original'.padEnd(12) +
      'WebP'.padEnd(12) +
      'JPEG fallback'.padEnd(16) +
      'Savings (WebP)'
  );
  for (const folder of FOLDERS) {
    const rows = results.filter((r) => r.folder === folder);
    if (!rows.length) continue;
    const orig = rows.reduce((s, r) => s + r.originalSize, 0);
    const webp = rows.reduce((s, r) => s + r.webpSize, 0);
    const jpeg = rows.reduce((s, r) => s + r.jpegSize, 0);
    const savings = (100 * (1 - webp / orig)).toFixed(1) + '%';
    console.log(
      folder.padEnd(12) +
        String(rows.length).padEnd(7) +
        fmtKB(orig).padEnd(12) +
        fmtKB(webp).padEnd(12) +
        fmtKB(jpeg).padEnd(16) +
        savings
    );
  }
  console.log('-'.repeat(70));
  console.log(
    'TOTAL'.padEnd(12) +
      String(results.length).padEnd(7) +
      fmtKB(totalOriginal).padEnd(12) +
      fmtKB(totalWebp).padEnd(12) +
      fmtKB(totalJpeg).padEnd(16) +
      (100 * (1 - totalWebp / totalOriginal)).toFixed(1) + '%'
  );

  const overTarget = results.filter((r) => r.webpSize > TARGET_BYTES);
  if (overTarget.length) {
    console.log(`\n${overTarget.length} image(s) still over the 200KB target at floor quality:`);
    for (const r of overTarget) console.log(`  - ${r.folder}/${r.filename}: ${fmtKB(r.webpSize)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
