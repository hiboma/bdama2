import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, 'src');
const distDir = join(__dirname, 'dist');

import { mkdirSync, cpSync } from 'fs';
mkdirSync(distDir, { recursive: true });

const template = readFileSync(join(srcDir, 'index.html'), 'utf-8');
const gameJs = readFileSync(join(srcDir, 'assets', 'js', 'game.js'), 'utf-8');

const output = template.replace('@@GAME_JS@@', gameJs.trimEnd());

cpSync(join(srcDir, 'assets'), join(distDir, 'assets'), { recursive: true });
writeFileSync(join(distDir, 'index.html'), output);

console.log('Built dist/index.html');
