#!/usr/bin/env node
/*
 * Derives every on-site asset from the single source logo file
 * (images/raw/logo/logo.jpg): the header's icon-only brand mark (background
 * keyed out to transparent), the browser favicon/apple-touch-icon, and the
 * social share preview image (og-cover.jpg).
 */
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'images', 'raw', 'logo', 'logo.jpg');
const OUT_DIR = path.join(__dirname, '..', 'images');
const LOGO_DIR = path.join(OUT_DIR, 'logo');

// The logo's icon sits in this region of the 1563x1563 source, above the
// wordmark. Re-crop here if the source logo file changes.
const ICON_CROP = { left: 600, top: 400, width: 320, height: 320 };
const ICON_BG = [195, 196, 188]; // flat background colour behind the icon
const KEY_INNER = 18; // fully transparent within this colour distance
const KEY_OUTER = 55; // fully opaque beyond this colour distance

function colorDistance(r, g, b) {
  return Math.sqrt((r - ICON_BG[0]) ** 2 + (g - ICON_BG[1]) ** 2 + (b - ICON_BG[2]) ** 2);
}

async function buildBrandIcon() {
  const { data, info } = await sharp(SRC)
    .extract(ICON_CROP)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const d = colorDistance(data[i], data[i + 1], data[i + 2]);
    let alpha;
    if (d <= KEY_INNER) alpha = 0;
    else if (d >= KEY_OUTER) alpha = 255;
    else alpha = Math.round(((d - KEY_INNER) / (KEY_OUTER - KEY_INNER)) * 255);
    data[i + 3] = alpha;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .trim()
    .webp({ quality: 95 })
    .toFile(path.join(LOGO_DIR, 'brand-icon.webp'));
}

async function buildFavicons() {
  await sharp(SRC).resize(32, 32).png().toFile(path.join(OUT_DIR, 'favicon.png'));
  await sharp(SRC).resize(180, 180).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
}

async function buildOgCover() {
  const targetW = 1200;
  const targetH = 630;
  const logoHeight = 520;

  const resizedLogo = await sharp(SRC).resize({ height: logoHeight }).toBuffer();

  await sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 3,
      background: { r: ICON_BG[0], g: ICON_BG[1], b: ICON_BG[2] },
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT_DIR, 'og-cover.jpg'));
}

async function main() {
  const fs = require('fs');
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  await buildBrandIcon();
  await buildFavicons();
  await buildOgCover();
  console.log('Logo assets built: images/logo/brand-icon.webp, images/favicon.png, images/apple-touch-icon.png, images/og-cover.jpg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
