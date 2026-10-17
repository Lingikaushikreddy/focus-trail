import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('./app/', import.meta.url);
const reports = new URL('../../evidence/demo/', import.meta.url);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const report = url.pathname.startsWith('/reports/');
    const name = report ? url.pathname.slice('/reports/'.length) : url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) { res.writeHead(400); res.end('Invalid path'); return; }
    const data = await readFile(new URL(name, report ? reports : root));
    const ext = name.split('.').pop();
    res.writeHead(200, { 'content-type': ext === 'html' ? 'text/html; charset=utf-8' : ext === 'js' ? 'text/javascript; charset=utf-8' : ext === 'css' ? 'text/css; charset=utf-8' : 'application/json; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('File not found'); }
});
server.listen(Number(process.env.PORT ?? 49371), '127.0.0.1', () => console.log('Focus Trail demo: http://127.0.0.1:' + (process.env.PORT ?? 49371)));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
