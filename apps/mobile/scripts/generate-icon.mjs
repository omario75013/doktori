import sharp from "sharp";
import { writeFileSync } from "fs";

const SIZE = 1024;
const R = Math.round(SIZE * 0.22);

// Scale factor: Lucide icons use 24x24 viewBox
// We want the stethoscope centered in the icon with padding
const SCALE = SIZE * 0.6 / 24; // ~25.6x scale
const OFFSET_X = SIZE * 0.22; // center horizontally (stethoscope is ~20 units wide)
const OFFSET_Y = SIZE * 0.15; // slight top offset
const SW = 2.2; // stroke width in Lucide units (default is 2, slightly thicker)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${R}" ry="${R}" fill="#0891B2"/>
  <g transform="translate(${OFFSET_X}, ${OFFSET_Y}) scale(${SCALE})"
     fill="none" stroke="white" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 2v2"/>
    <path d="M5 2v2"/>
    <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/>
    <path d="M8 15a6 6 0 0 0 12 0v-3"/>
    <circle cx="20" cy="10" r="2"/>
  </g>
  <circle cx="${SIZE * 0.78}" cy="${SIZE * 0.17}" r="${SIZE * 0.05}" fill="#22C55E"/>
</svg>`;

console.log("Generating icons...");

const buf = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toBuffer();
writeFileSync("assets/images/icon.png", buf);
writeFileSync("assets/images/splash-icon.png", buf);
console.log("  ✓ icon.png + splash-icon.png");

// Adaptive: same stethoscope on transparent (Android uses backgroundColor from app.json)
const adaptiveSvg = svg
  .replace('fill="#0891B2"', 'fill="none"')
  .replace('fill="#22C55E"', 'fill="none"');
const adaptiveBuf = await sharp(Buffer.from(adaptiveSvg)).resize(SIZE, SIZE).png().toBuffer();
writeFileSync("assets/images/adaptive-icon.png", adaptiveBuf);
console.log("  ✓ adaptive-icon.png");

const faviconBuf = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();
writeFileSync("assets/images/favicon.png", faviconBuf);
console.log("  ✓ favicon.png");

console.log("Done!");
