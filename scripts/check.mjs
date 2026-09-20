import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { games } from '../dist/games.js';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
function verifyReference(file, ref) {
  if (/^(https?:|data:|#)/.test(ref)) return;
  const target = path.resolve(path.dirname(file), ref.split(/[?#]/)[0]);
  if (!target.startsWith(root) || !existsSync(target)) throw new Error(`Broken asset: ${path.relative(root, file)} -> ${ref}`);
}
const ids = new Set();
for (const game of games) {
  if (!/^[a-z][a-z0-9-]*$/.test(game.id) || ids.has(game.id)) throw new Error('Duplicate or invalid game id');
  ids.add(game.id);
  if (!game.entry.startsWith(`./games/${game.id}/`)) throw new Error('Game entry must live in its own module');
  for (const ref of [game.entry, game.cover, game.background]) verifyReference(path.join(root, 'games.js'), ref);
  if (!game.modes.length || new Set(game.modes.map(mode => mode.id)).size !== game.modes.length) throw new Error('Missing or duplicate modes');
}
for (const file of walk(root)) {
  const extension = path.extname(file);
  if (!['.js', '.html', '.css', '.webmanifest'].includes(extension)) continue;
  const source = readFileSync(file, 'utf8');
  if (extension === '.js') {
    execFileSync(process.execPath, ['--check', file]);
    for (const [, ref] of source.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)) verifyReference(file, ref);
  }
  if (extension === '.html') for (const [, ref] of source.matchAll(/(?:src|href)="([^"\n]+)"/g)) verifyReference(file, ref);
  if (extension === '.css') for (const [, ref] of source.matchAll(/url\(['"]([^'"]+)['"]\)/g)) verifyReference(file, ref);
  if (extension === '.webmanifest') for (const icon of JSON.parse(source).icons) verifyReference(file, icon.src);
}
console.log(`Verified ${games.length} game module(s), JavaScript syntax and local asset references.`);
