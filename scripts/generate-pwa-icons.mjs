import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const PUBLIC_ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_ICON_PATH = path.join(ROOT, "src", "app", "icon.svg");

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="48" y1="32" x2="464" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="55%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="flameGrad" x1="256" y1="78" x2="256" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="24" y="24" width="464" height="464" rx="92" stroke="#ffffff" stroke-opacity="0.16" stroke-width="6"/>
  <!-- Steam / Show Kitchen Flame Accent -->
  <path d="M256 80c18 22 26 40 20 56-4 12-12 18-20 22-8-4-16-10-20-22-6-16 2-34 20-56z" fill="url(#flameGrad)"/>
  <path d="M196 106c10 14 14 26 10 38-3 8-8 12-13 15-5-3-10-7-12-14-4-12 2-25 15-39z" fill="#fbbf24" fill-opacity="0.9"/>
  <path d="M316 106c10 14 14 26 10 38-3 8-8 12-13 15-5-3-10-7-12-14-4-12 2-25 15-39z" fill="#fbbf24" fill-opacity="0.9"/>
  <!-- Cloche Knob -->
  <circle cx="256" cy="190" r="20" fill="#ffffff"/>
  <!-- Cloche Dome -->
  <path d="M116 332c0-78 62.68-140 140-140s140 62 140 140H116z" fill="#ffffff"/>
  <!-- Subtle Dome Highlight -->
  <path d="M158 308c8-46 42-80 86-88" stroke="#bae6fd" stroke-width="14" stroke-linecap="round"/>
  <!-- Serving Tray Base -->
  <rect x="86" y="348" width="340" height="30" rx="15" fill="#ffffff"/>
  <!-- Brand Tag -->
  <rect x="176" y="398" width="160" height="36" rx="18" fill="#0f172a" fill-opacity="0.35"/>
  <text x="256" y="422" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="21" font-weight="800" letter-spacing="2">SHOW BÜFE</text>
</svg>
`;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBytes = Buffer.alloc(4);
  lenBytes.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBytes, typeBytes, data, crcBytes]);
}

function encodeRgbaPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter None
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendPixel(buf, idx, r, g, b, alpha) {
  const a = clamp01(alpha);
  if (a <= 0) return;
  const inv = 1 - a;
  buf[idx] = Math.round(buf[idx] * inv + r * a);
  buf[idx + 1] = Math.round(buf[idx + 1] * inv + g * a);
  buf[idx + 2] = Math.round(buf[idx + 2] * inv + b * a);
  buf[idx + 3] = Math.min(255, Math.round(buf[idx + 3] + (255 - buf[idx + 3]) * a));
}

function sdRoundedBox(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - halfW + radius;
  const qy = Math.abs(py - cy) - halfH + radius;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return out + inside - radius;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay || 1));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function renderShowBufeIcon(size, { maskable = false, monochrome = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const scaleFactor = maskable ? 0.72 : 0.88;
  const aa = 1.5 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const idx = (y * size + x) * 4;

      // 1. Background
      if (!monochrome) {
        const bgDist = maskable
          ? -1
          : sdRoundedBox(u, v, 0.5, 0.5, 0.5, 0.5, 0.22);
        const bgCov = clamp01(0.5 - bgDist / aa);
        if (bgCov > 0) {
          const t = clamp01(u * 0.45 + v * 0.65);
          // Gradient: #0ea5e9 (14,165,233) -> #0284c7 (2,132,199) -> #0f172a (15,23,42)
          let r, g, b;
          if (t < 0.6) {
            const k = t / 0.6;
            r = lerp(14, 2, k);
            g = lerp(165, 132, k);
            b = lerp(233, 199, k);
          } else {
            const k = (t - 0.6) / 0.4;
            r = lerp(2, 15, k);
            g = lerp(132, 23, k);
            b = lerp(199, 42, k);
          }
          buf[idx] = Math.round(r);
          buf[idx + 1] = Math.round(g);
          buf[idx + 2] = Math.round(b);
          buf[idx + 3] = Math.round(bgCov * 255);
        }
      }

      // Normalize coordinates into canonical [-0.5, 0.5] icon artwork space
      const cx = (u - 0.5) / scaleFactor;
      const cy = (v - 0.5) / scaleFactor;

      // 2. Amber flame/steam droplet above cloche
      const flameDist = Math.min(
        sdSegment(cx, cy, 0, -0.34, 0, -0.25) - 0.032 * (1 - clamp01((-0.25 - cy) / 0.14)),
        sdSegment(cx, cy, -0.11, -0.29, -0.09, -0.23) - 0.018,
        sdSegment(cx, cy, 0.11, -0.29, 0.09, -0.23) - 0.018
      );
      const flameCov = clamp01(0.5 - flameDist / aa);
      if (flameCov > 0) {
        if (monochrome) {
          blendPixel(buf, idx, 255, 255, 255, flameCov);
        } else {
          blendPixel(buf, idx, 251, 191, 36, flameCov);
        }
      }

      // 3. Cloche knob
      const knobDist = Math.hypot(cx, cy + 0.16) - 0.042;
      const knobCov = clamp01(0.5 - knobDist / aa);
      if (knobCov > 0) {
        blendPixel(buf, idx, 255, 255, 255, knobCov);
      }

      // 4. Cloche semi-circle dome (bottom at y = 0.13)
      const domeY = 0.13;
      const domeRadius = 0.27;
      const circDist = Math.hypot(cx, cy - domeY) - domeRadius;
      const cutDist = cy - domeY;
      const domeDist = Math.max(circDist, cutDist);
      const domeCov = clamp01(0.5 - domeDist / aa);
      if (domeCov > 0) {
        blendPixel(buf, idx, 255, 255, 255, domeCov);
        // Subtle sky highlight arc on left inside dome
        if (!monochrome) {
          const arcDist = Math.abs(Math.hypot(cx, cy - domeY) - 0.205) - 0.013;
          const inUpperLeft = cx < -0.03 && cy < 0.06 && cy > -0.09;
          if (inUpperLeft) {
            const arcCov = clamp01(0.5 - arcDist / aa);
            blendPixel(buf, idx, 186, 230, 253, arcCov * 0.9);
          }
        }
      }

      // 5. Serving Tray Base
      const trayDist = sdRoundedBox(cx, cy, 0, 0.195, 0.33, 0.032, 0.025);
      const trayCov = clamp01(0.5 - trayDist / aa);
      if (trayCov > 0) {
        blendPixel(buf, idx, 255, 255, 255, trayCov);
      }

      // 6. Accent base pill bar (shows kitchen heat glow under tray)
      const barDist = sdRoundedBox(cx, cy, 0, 0.285, 0.22, 0.022, 0.018);
      const barCov = clamp01(0.5 - barDist / aa);
      if (barCov > 0) {
        if (monochrome) {
          blendPixel(buf, idx, 255, 255, 255, barCov * 0.8);
        } else {
          blendPixel(buf, idx, 251, 191, 36, barCov);
        }
      }
    }
  }

  return encodeRgbaPng(size, size, buf);
}

fs.mkdirSync(PUBLIC_ICONS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(APP_ICON_PATH), { recursive: true });

fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, "logo.svg"), LOGO_SVG, "utf-8");
fs.writeFileSync(APP_ICON_PATH, LOGO_SVG, "utf-8");

const targets = [
  { file: "icon-192x192.png", size: 192, opts: { maskable: false } },
  { file: "icon-512x512.png", size: 512, opts: { maskable: false } },
  { file: "icon-maskable-192x192.png", size: 192, opts: { maskable: true } },
  { file: "icon-maskable-512x512.png", size: 512, opts: { maskable: true } },
  { file: "apple-touch-icon.png", size: 180, opts: { maskable: true } },
  { file: "badge-72x72.png", size: 72, opts: { monochrome: true } },
];

for (const t of targets) {
  const png = renderShowBufeIcon(t.size, t.opts);
  const out = path.join(PUBLIC_ICONS_DIR, t.file);
  fs.writeFileSync(out, png);
  console.log(`Generated ${t.file} (${png.length} bytes)`);
}
console.log("Generated logo.svg & src/app/icon.svg");
