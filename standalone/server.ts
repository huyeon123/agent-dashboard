import { createServer, IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { apiMiddleware } from '../server/index';

const PORT = 51730;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStatic(req: IncomingMessage, res: ServerResponse, distDir: string): void {
  const url = req.url || '/';
  const urlPath = url.split('?')[0];
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const distDir = path.join(__dirname, '..', 'dist');

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if ((req.url || '').startsWith('/api/')) {
    await apiMiddleware(req, res, () => {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });
    return;
  }
  serveStatic(req, res, distDir);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`이미 실행 중입니다. 브라우저를 열고 있습니다: ${url}`);
    exec(`open ${url}`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`Agent Dashboard 시작됨: ${url}`);
  console.log('종료하려면 Ctrl+C를 누르세요.');
  exec(`open ${url}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log('\nAgent Dashboard 종료 중...');
    server.close(() => process.exit(0));
  });
}
