// Creates icon.ico from icon.png (pure Node, no dependencies).
// A .ico may contain PNG-encoded images; Windows accepts a single 256x256 PNG entry
// and scales it for smaller sizes. Run automatically by the build scripts.
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const pngPath = path.join(dir, "icon.png");
const icoPath = path.join(dir, "icon.ico");

function pngSize(buf) {
  // PNG signature + IHDR: width at byte 16, height at byte 20 (big-endian)
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") throw new Error("icon.png is not a PNG file");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function main() {
  if (!fs.existsSync(pngPath)) {
    console.error("make-icon: icon.png not found");
    process.exit(1);
  }
  const png = fs.readFileSync(pngPath);
  const { width, height } = pngSize(png);
  if (width !== height || width < 256) {
    console.error(`make-icon: icon.png must be square and at least 256x256 (got ${width}x${height})`);
    process.exit(1);
  }
  // ICO header (6 bytes) + 1 directory entry (16 bytes) + PNG data
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0); // 0 means 256
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit depth
  entry.writeUInt32LE(png.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset
  fs.writeFileSync(icoPath, Buffer.concat([header, entry, png]));
  console.log(`make-icon: wrote icon.ico (${width}x${height}, ${png.length} bytes)`);
}

main();
