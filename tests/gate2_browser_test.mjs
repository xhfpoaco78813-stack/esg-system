import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = Number(process.env.CDP_PORT || 9333);
const webPort = Number(process.env.TEST_WEB_PORT || 8766);
const profile = path.join(root, `.edge-gate2-cdp-${Date.now()}`);
const artifactDir = path.join(root, 'test-results');
const harnessPath = path.join(root, '_gate2_harness.html');
await mkdir(artifactDir, { recursive: true });

let harness = await readFile(path.join(root, 'index.html'), 'utf8');
harness = harness.replace('<head>', '<head><script src="tests/gate2_browser_probe.js"></script>');
harness = harness.replace('</body>', '<script src="tests/gate2_browser_run.js"></script></body>');
await writeFile(harnessPath, harness, 'utf8');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'}).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(webPort, '127.0.0.1', resolve); });

const browser = spawn(edge, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-breakpad',
  '--disable-features=msEdgeFirstRunExperience', '--remote-allow-origins=*',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let target;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const list = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
    target = list.find(row => row.type === 'page');
    if (target) break;
  } catch {}
  await delay(100);
}
if (!target) { browser.kill(); throw new Error('Edge DevTools target did not start'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map();
ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
};
function send(method, params = {}) {
  const id = ++sequence;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Page.enable');
await send('Runtime.enable');

async function runViewport(name, width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: `http://127.0.0.1:${webPort}/_gate2_harness.html?viewport=${name}&t=${Date.now()}` });
  let evaluated;
  for (let attempt = 0; attempt < 50; attempt++) {
    await delay(100);
    evaluated = await send('Runtime.evaluate', {
      expression: `({result:document.documentElement.dataset.gate2Result,details:JSON.parse(document.documentElement.dataset.gate2Details||'{}'),innerWidth,scrollWidth:document.documentElement.scrollWidth,url:location.href,title:document.title})`,
      returnByValue: true,
    });
    if (evaluated.result.value.result) break;
  }
  const value = evaluated.result.value;
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(artifactDir, `gate2-${name}.png`), Buffer.from(screenshot.data, 'base64'));
  const pass = value.result === 'PASS' && value.innerWidth === width && value.scrollWidth <= width;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} ${width}x${height}  ${JSON.stringify(value)}`);
  return pass;
}

let passed = false;
try {
  const desktop = await runViewport('desktop', 1440, 1000, false);
  const mobile = await runViewport('mobile-390', 390, 844, true);
  passed = desktop && mobile;
} finally {
  ws.close();
  browser.kill();
  await new Promise(resolve => server.close(resolve));
  await rm(harnessPath, { force: true });
}
if (!passed) process.exitCode = 1;
