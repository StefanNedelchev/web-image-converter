import { build } from 'esbuild';
import { mkdir, readFile, writeFile, rm, copyFile, cp } from 'node:fs/promises';
import { injectManifest } from 'workbox-build';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] || 'prod';
const isDev = mode === 'dev';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'src');
const outDir = path.join(rootDir, 'dist');

const entry = path.join(sourceDir, 'app', 'main.ts');
const outJsDir = path.join(outDir, 'js');

// Clean dist directory before building
await rm(outDir, { recursive: true, force: true });
await mkdir(outJsDir, { recursive: true });

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  sourcemap: isDev,
  minify: true,
  outdir: outJsDir,
  entryNames: '[name]-[hash]',
  metafile: true,
});

// Get the actual generated filename from metafile
const outputFiles = Object.keys(result.metafile.outputs).filter(
  (file) => file.endsWith('.js') && !file.endsWith('.map'),
);
if (outputFiles.length !== 1) {
  throw new Error('Expected exactly one output JS file.');
}
const generatedJsFile = path.basename(outputFiles[0]);

const indexHtml = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
if (!indexHtml.includes('app/main.ts')) {
  throw new Error('Expected script src "app/main.ts" in src/index.html.');
}
const updatedHtml = indexHtml.replace('app/main.ts', `js/${generatedJsFile}`);
await writeFile(path.join(outDir, 'index.html'), updatedHtml);
await copyFile(
  path.join(sourceDir, 'manifest.webmanifest'),
  path.join(outDir, 'manifest.webmanifest'),
);
await cp(
  path.join(sourceDir, 'assets'),
  path.join(outDir, 'assets'),
  { recursive: true },
);

console.log(`✓ Built ${generatedJsFile} (${mode} mode, sourcemap: ${isDev})`);

// Build service worker from TypeScript
const swEntry = path.join(sourceDir, 'service-worker.ts');
const swTempDest = path.join(outDir, 'sw-temp.js');

await build({
  entryPoints: [swEntry],
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  sourcemap: isDev,
  minify: true,
  outfile: swTempDest,
});

// Inject precache manifest into the compiled service worker
const { count, size, warnings } = await injectManifest({
  swSrc: swTempDest,
  swDest: path.join(outDir, 'service-worker.js'),
  globDirectory: outDir,
  globPatterns: [
    '**/*.{html,js,css,webmanifest,png,jpg,jpeg,gif,svg,ico}',
  ],
  globIgnores: ['sw-temp.js'],
});

// Clean up temp file
await rm(swTempDest, { force: true });

if (warnings.length > 0) {
  console.warn('⚠ Warnings:', warnings);
}
console.log(`✓ Generated service-worker.js (precached ${count} files, ${(size / 1024).toFixed(2)} KB)`);
