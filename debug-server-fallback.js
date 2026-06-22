const http = require('http');
const fs = require('fs');
const path = require('path');

const sessionId = 'razorpay-checkout-bug';
const outDir = path.join(process.cwd(), '.dbg');
const host = '127.0.0.1';
const port = 7777;
const logFile = path.join(outDir, `trae-debug-log-${sessionId}.ndjson`);
const envFile = path.join(outDir, `${sessionId}.env`);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(logFile, '');
fs.writeFileSync(envFile, `DEBUG_SERVER_URL=http://${host}:${port}/event\nDEBUG_SESSION_ID=${sessionId}\n`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS' && req.url === '/event') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ status: 'ok', sessionId, logFile }));
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/logs')) {
    const content = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(content.split(/\r?\n/).filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    })));
    return;
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    fs.writeFileSync(logFile, '');
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body || '{}');
        if (!event.ts) event.ts = Date.now();
        fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(port, host, () => {
  console.log('@@DEBUG_SERVER_INFO');
  console.log(JSON.stringify({
    api_url: `http://${host}:${port}/event`,
    session_id: sessionId,
    log_dir: outDir,
    log_file: logFile,
    env_file: envFile
  }, null, 2));
  console.log('@@END_DEBUG_SERVER_INFO');
});
