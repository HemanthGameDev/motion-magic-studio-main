import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const renderOutputDir = path.join(projectRoot, 'render-output');
const PORT = Number(process.env.PORT || 5050);
const renderConfigs = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function getBaseUrl() {
  if (process.env.RENDER_BASE_URL) {
    return process.env.RENDER_BASE_URL;
  }

  return `http://127.0.0.1:${PORT}`;
}

function ensureFfmpegAvailable() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('FFmpeg is required for backend rendering. Install ffmpeg and ensure it is available on PATH.');
  }
}

function runFfmpeg({ fps, framePattern, outputPath }) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-y',
      '-framerate',
      String(fps),
      '-start_number',
      '0',
      '-i',
      framePattern,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '18',
      outputPath,
    ], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function captureFrames({ renderId, config, width, height, fps }) {
  const tempRoot = path.join(os.tmpdir(), `motion-render-${renderId}`);
  const framesDir = path.join(tempRoot, 'frames');
  const outputPath = path.join(renderOutputDir, `${renderId}.mp4`);

  await mkdir(framesDir, { recursive: true });
  await mkdir(renderOutputDir, { recursive: true });
  renderConfigs.set(renderId, config);

  let browser;

  try {
    ensureFfmpegAvailable();

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/render-player?configId=${encodeURIComponent(renderId)}`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    await page.waitForFunction(() => Boolean(window.__MOTION_RENDER__?.ready), undefined, { timeout: 20000 });
    const durationMs = await page.evaluate(() => window.__MOTION_RENDER__?.getDurationMs() ?? 0);
    const totalFrames = Math.max(2, Math.ceil((durationMs / 1000) * fps) + 1);
    const stage = page.locator('[data-render-stage="true"]');
    await stage.waitFor({ state: 'visible', timeout: 10000 });

    for (let index = 0; index < totalFrames; index += 1) {
      const seconds = index / fps;
      await page.evaluate(async (timeSeconds) => {
        await window.__MOTION_RENDER__?.seek(timeSeconds);
      }, seconds);

      const framePath = path.join(framesDir, `frame_${String(index).padStart(4, '0')}.png`);
      await stage.screenshot({
        path: framePath,
        type: 'png',
      });
    }

    await runFfmpeg({
      fps,
      framePattern: path.join(framesDir, 'frame_%04d.png'),
      outputPath,
    });

    return outputPath;
  } finally {
    renderConfigs.delete(renderId);
    if (browser) {
      await browser.close();
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function serveFile(res, filePath) {
  const fileStat = await stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fileStat.size,
  });

  createReadStream(filePath).pipe(res);
}

async function handleStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const staticFile = path.join(distDir, relativePath);
  const renderFile = path.join(renderOutputDir, pathname.replace(/^\/renders\//, ''));

  if (pathname.startsWith('/renders/') && existsSync(renderFile)) {
    await serveFile(res, renderFile);
    return true;
  }

  if (existsSync(staticFile)) {
    await serveFile(res, staticFile);
    return true;
  }

  if (existsSync(path.join(distDir, 'index.html'))) {
    await serveFile(res, path.join(distDir, 'index.html'));
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/render-config/')) {
      const id = pathname.split('/').pop();
      if (!id || !renderConfigs.has(id)) {
        sendJson(res, 404, { error: 'Render config not found' });
        return;
      }

      sendJson(res, 200, { config: renderConfigs.get(id) });
      return;
    }

    if (req.method === 'POST' && pathname === '/render') {
      const body = await readRequestBody(req);
      const config = body.config;

      if (!config || typeof config !== 'object') {
        sendJson(res, 400, { error: 'A config object is required' });
        return;
      }

      const width = Math.max(320, Number(body.width ?? config.size?.width ?? 1080));
      const height = Math.max(320, Number(body.height ?? config.size?.height ?? 1920));
      const fps = Math.max(12, Math.min(60, Number(body.fps ?? 30)));
      const renderId = randomUUID();

      const outputPath = await captureFrames({
        renderId,
        config,
        width,
        height,
        fps,
      });

      const filename = path.basename(outputPath);
      sendJson(res, 200, {
        id: renderId,
        url: `/renders/${filename}`,
      });
      return;
    }

    if (req.method === 'GET') {
      const served = await handleStatic(req, res, pathname);
      if (served) {
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Render server error:', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown render error',
    });
  }
});

async function ensureOutputDirs() {
  await mkdir(renderOutputDir, { recursive: true });

  if (!existsSync(distDir)) {
    const notePath = path.join(renderOutputDir, '.keep');
    await writeFile(notePath, 'Render output directory');
  }
}

await ensureOutputDirs();

server.listen(PORT, () => {
  console.log(`Render server listening on http://127.0.0.1:${PORT}`);
  if (!existsSync(path.join(distDir, 'index.html'))) {
    console.warn('No dist build found. Run "npm run build" or set RENDER_BASE_URL to an existing frontend server.');
  }
});
