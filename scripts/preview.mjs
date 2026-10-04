import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const portArgument = process.argv.find(argument => argument.startsWith('--port='));
const baseArgument = process.argv.find(argument => argument.startsWith('--base='));
const port = Number(portArgument?.split('=')[1] || 4173);
const requestedBase = baseArgument?.slice('--base='.length) || '/';
const base = `/${requestedBase.split('/').filter(Boolean).join('/')}${requestedBase === '/' ? '' : '/'}`;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

  if (url.pathname === base.slice(0, -1)) {
    response.writeHead(308, { Location: base });
    response.end();
    return;
  }

  if (!url.pathname.startsWith(base)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  const filePath = resolve(join(root, relativePath));
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Planner preview: http://127.0.0.1:${port}${base}`);
});
