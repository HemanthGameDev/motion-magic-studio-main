import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const remotionEntry = path.join(projectRoot, 'remotion', 'index.ts');
const outputDir = path.join(projectRoot, 'out');

let bundlePromise = null;

async function getServeUrl() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: remotionEntry,
      onProgress: () => undefined,
    });
  }

  return bundlePromise;
}

export async function renderVideo(config) {
  await mkdir(outputDir, { recursive: true });

  const serveUrl = await getServeUrl();
  const inputProps = { config };
  const composition = await selectComposition({
    serveUrl,
    id: 'Video',
    inputProps,
    logLevel: 'error',
  });

  const id = randomUUID();
  const outputLocation = path.join(outputDir, `${id}.mp4`);

  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    outputLocation,
    inputProps,
    overwrite: true,
    logLevel: 'error',
  });

  return {
    id,
    outputLocation,
    fileName: path.basename(outputLocation),
  };
}
