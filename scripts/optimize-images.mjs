import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
const mapping = {};
let before = 0, after = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;
    const size = (await stat(file)).size;
    if (size < 40000) continue;
    const output = await sharp(file).webp({ quality: 90, effort: 5 }).toBuffer();
    if (output.length >= size * 0.9) continue;
    const dest = file.replace(/\.[^.]+$/, '.optimized.webp');
    await writeFile(dest, output);
    mapping['/' + file.slice('public/'.length)] = '/' + dest.slice('public/'.length);
    before += size; after += output.length;
  }
}
await walk('public/img');
await writeFile('lib/optimized-images.json', JSON.stringify(mapping, null, 2) + '\n');
console.log(JSON.stringify({ images: Object.keys(mapping).length, before, after, saved: before - after }));
