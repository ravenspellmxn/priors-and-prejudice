// Builds the lazy 3D view for station 06: src3d/be-the-mouse.src.js -> be-the-mouse.js (one ESM file, three tree-shaken).
// The repo has no node_modules; esbuild and three come from the diorama workspace (override with DEPS=/path/to/node_modules).
import { createRequire } from 'node:module';
const DEPS = process.env.DEPS || `${process.env.HOME}/src/diorama-scenes/node_modules`;
const { build } = createRequire(DEPS + '/')('esbuild');
await build({ entryPoints: ['src3d/be-the-mouse.src.js'], bundle: true, format: 'esm', target: ['es2020'], minify: true,
  outfile: 'be-the-mouse.js', nodePaths: [DEPS], legalComments: 'eof', logLevel: 'info' });
