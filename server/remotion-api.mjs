import http from 'node:http';
import path from 'node:path';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderVideo } from './render.mjs';

const REMOTION_RENDER_SERVER_PORT = 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'out');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function serveFile(res, filePath) {
  const fileStat = await stat(filePath);
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Content-Length': fileStat.size,
  });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${REMOTION_RENDER_SERVER_PORT}`}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/render') {
      const body = await readRequestBody(req);
      const config = body.config;

      if (!config || typeof config !== 'object') {
        sendJson(res, 400, { error: 'A config object is required' });
        return;
      }

      const result = await renderVideo(config);
      sendJson(res, 200, {
        id: result.id,
        url: `/renders/${encodeURIComponent(result.fileName)}`,
      });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/renders/')) {
      const fileName = path.basename(pathname.replace(/^\/renders\//, ''));
      const filePath = path.join(outputDir, fileName);

      if (!existsSync(filePath)) {
        sendJson(res, 404, { error: 'Rendered file not found' });
        return;
      }

      await serveFile(res, filePath);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Remotion API error:', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown Remotion render error',
    });
  }
});

await mkdir(outputDir, { recursive: true });

server.listen(REMOTION_RENDER_SERVER_PORT, () => {
  console.log(`Remotion render API listening on http://127.0.0.1:${REMOTION_RENDER_SERVER_PORT}`);
});
