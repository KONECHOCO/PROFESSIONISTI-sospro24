// npm run build, poi: node scripts/preview-csp.mjs — server locale che serve dist/ con la stessa CSP di nginx, per provarla prima della pubblicazione.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const conf = readFileSync(new URL('../deploy/nginx-sospro24.conf', import.meta.url), 'utf8');
const csp = conf.match(/Content-Security-Policy "([^"]+)"/)[1];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(root, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream', 'Content-Security-Policy': csp.replace('; upgrade-insecure-requests', '') });
  res.end(readFileSync(f));
}).listen(5180, () => console.log('CSP preview on http://localhost:5180'));
