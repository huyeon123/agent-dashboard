import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';
import { apiMiddleware } from '../server/index';

// ELECTRON_VITE_DEV=1 일 때만 Vite dev server(5173)에 연결
// electron . 단독 실행 또는 패키징된 .app은 모두 내장 HTTP 서버 사용
const useViteDev = process.env.ELECTRON_VITE_DEV === '1';

function setupDataDir(): void {
  if (app.isPackaged) {
    // 패키징된 앱에서 data/는 electron-builder extraResources로 Resources/data/에 복사됨
    process.env.DASHBOARD_DATA_DIR = path.join(process.resourcesPath, 'data');
  }
  // 개발 시에는 환경변수 미설정 → server 코드가 process.cwd()/data 로 fallback
}

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
    // SPA fallback
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

async function startServer(distDir: string): Promise<number> {
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

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 3000);
    });
  });
}

function createWindow(url: string): void {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'Agent Dashboard',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(url);
}

function setupAutoUpdater(): void {
  // 패키징된 앱에서만 자동 업데이트 활성화
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '업데이트 발견',
      message: '새 버전이 있습니다. 백그라운드에서 다운로드합니다.',
      buttons: ['확인'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드됐습니다. 앱을 재시작하면 설치됩니다.',
      buttons: ['지금 재시작', '나중에'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // 업데이트 서버 연결 실패는 조용히 무시
  });
}

app.whenReady().then(async () => {
  setupDataDir();

  let url: string;

  if (useViteDev) {
    // npm run dev:electron 시: Vite dev server가 API 미들웨어까지 처리 (HMR 지원)
    url = 'http://localhost:5173';
  } else {
    // electron . 또는 패키징된 .app: 내장 HTTP 서버로 dist/ 서빙
    const distDir = app.isPackaged
      ? path.join(__dirname, '../dist')
      : path.join(process.cwd(), 'dist');
    const port = await startServer(distDir);
    url = `http://127.0.0.1:${port}`;
  }

  createWindow(url);
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
