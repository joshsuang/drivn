// Generates the PWA icons as PNGs with no image dependencies.
//
// Chrome's installability check wants real raster icons, and the repo only had an
// SVG favicon. Rather than commit opaque binaries nobody can regenerate, the
// icons are drawn here from the app's own palette and written as PNGs.
//
//   node scripts/generate-icons.mjs
//
// Design: a full-bleed dark square (so it survives Android's maskable crop) with
// an accent gauge ring and needle.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BACKGROUND = [13, 15, 18, 255] // base-950
const RING = [91, 108, 255, 255] // accent
const NEEDLE = [139, 147, 255, 255] // accent-light

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  // bytes 10-12 stay zero: deflate, adaptive filtering, no interlace

  // Each scanline is prefixed with its filter type (0 = none).
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------------ geometry

/** Shortest distance from a point to a line segment. */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

const toRad = (deg) => (deg * Math.PI) / 180

/** Is this point on the gauge ring? The arc sweeps 270°, opening at the bottom. */
function onRing(x, y, cx, cy, radius, thickness) {
  const dx = x - cx
  const dy = y - cy
  const distance = Math.hypot(dx, dy)
  if (Math.abs(distance - radius) > thickness / 2) return false
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const normalized = (angle + 360) % 360
  // Covers 135° → 45° the long way round, i.e. everything except the bottom.
  return normalized >= 135 || normalized <= 45
}

function render(size) {
  const scale = size / 512
  const cx = size / 2
  const cy = size / 2
  const radius = 168 * scale
  const thickness = 46 * scale
  const needleWidth = 26 * scale
  const needleAngle = toRad(300)
  const hubRadius = 34 * scale
  const innerRadius = 62 * scale

  const needleFrom = { x: cx - Math.cos(needleAngle) * innerRadius, y: cy - Math.sin(needleAngle) * innerRadius }
  const needleTo = { x: cx + Math.cos(needleAngle) * (radius - thickness / 2), y: cy + Math.sin(needleAngle) * (radius - thickness / 2) }

  const rgba = Buffer.alloc(size * size * 4)
  const samples = 3 // 3x3 supersampling for smooth edges
  const step = 1 / samples
  const offset = step / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ringHits = 0
      let needleHits = 0
      let hubHits = 0

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + sx * step + offset
          const py = y + sy * step + offset
          if (onRing(px, py, cx, cy, radius, thickness)) ringHits++
          if (Math.hypot(px - cx, py - cy) <= hubRadius) hubHits++
          else if (
            distanceToSegment(px, py, needleFrom.x, needleFrom.y, needleTo.x, needleTo.y) <= needleWidth / 2
          ) {
            needleHits++
          }
        }
      }

      const total = samples * samples
      const ring = ringHits / total
      const needle = needleHits / total
      const hub = hubHits / total

      // Paint needle, then hub, then ring over the background.
      let color = BACKGROUND
      if (needle > 0) color = mix(color, NEEDLE, needle)
      if (hub > 0) color = mix(color, NEEDLE, hub)
      if (ring > 0) color = mix(color, RING, ring)

      const index = (y * size + x) * 4
      rgba[index] = color[0]
      rgba[index + 1] = color[1]
      rgba[index + 2] = color[2]
      rgba[index + 3] = 255
    }
  }

  return encodePng(size, size, rgba)
}

function mix(base, over, alpha) {
  return [
    Math.round(base[0] + (over[0] - base[0]) * alpha),
    Math.round(base[1] + (over[1] - base[1]) * alpha),
    Math.round(base[2] + (over[2] - base[2]) * alpha),
    255,
  ]
}

// --------------------------------------------------------------------- main

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  // Full-bleed so Android's maskable crop never clips the gauge.
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of targets) {
  writeFileSync(join(OUT_DIR, name), render(size))
  console.log(`wrote public/${name} (${size}x${size})`)
}
