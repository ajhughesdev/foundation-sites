const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(process.env.ROOT || process.cwd());
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || '4173');

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function safeResolveUrlPath(urlPath) {
  const cleaned = urlPath.replace(/\\/g, '/');
  const joined = path.join(root, cleaned);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

function send(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode;
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(body);
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);

  if (decodedPath === '/' || decodedPath === '/__health') {
    send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const resolved = safeResolveUrlPath(decodedPath);

  if (!resolved) {
    send(res, 403, 'Forbidden');
    return;
  }

  let filePath = resolved;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    // ignore
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES.get(ext) || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');

    if (method === 'HEAD') {
      res.statusCode = 200;
      res.end();
      return;
    }

    res.statusCode = 200;
    res.end(data);
  } catch {
    send(res, 404, 'Not Found');
  }
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[f7-static-server] Serving ${root} at http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
