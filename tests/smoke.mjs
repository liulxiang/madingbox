/**
 * 码叮百宝箱 · 本地冒烟测试
 * 不启动 DSH：用最小 ctx 把路由和 agent 工具接出来，直接打 HTTP。
 * 运行：node tests/smoke.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mading-toolbox-'));
process.env.MADING_TOOLBOX_DIR = outputDir;

const { apply } = await import('../index.js');

const routeBox = {};
const tools = [];
const ctx = {
  get(name) {
    return name === 'connection' ? { requestRejection: () => undefined } : undefined;
  },
  effect(fn) {
    const dispose = fn();
    return dispose || (() => {});
  },
  webServer: {
    register(route) {
      routeBox.route = route;
      return () => {};
    },
  },
  tools: {
    register(tool) {
      tools.push(tool);
      return () => {};
    },
  },
};
apply(ctx);

assert.ok(routeBox.route, 'route registered');
assert.equal(tools.length, 3, 'three agent tools registered');
assert.deepEqual(
  tools.map((tool) => tool.name).sort(),
  ['mading_qr', 'mading_qr_decode', 'mading_screenshot'],
);

const server = http.createServer((req, res) => routeBox.route.handler(req, res));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/mading-toolbox/api`;

async function call(method, pathname, body, headers) {
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { res, data };
}

try {
  const status = await call('GET', '/status');
  assert.equal(status.res.status, 200);
  assert.equal(status.data.ok, true);
  assert.equal(status.data.dirs.root, outputDir);
  console.log('status ok:', status.data.capabilities);

  const preview = await call('POST', '/qr-preview', {
    text: '你好，码叮百宝箱 https://example.com',
    ecc: 'M',
    size: 512,
  });
  assert.equal(preview.res.status, 200);
  assert.match(preview.data.svg, /^<svg /);
  assert.ok(preview.data.modules >= 21);
  console.log('qr preview ok:', preview.data.version, preview.data.modules, preview.data.width);

  const saved = await call('POST', '/qr', {
    text: '你好，码叮百宝箱 https://example.com',
    size: 256,
    ecc: 'H',
    margin: 2,
    dark: '#0b1220',
    light: '#ffffff',
    filename: '冒烟测试',
  });
  assert.equal(saved.res.status, 200);
  assert.ok(fs.existsSync(saved.data.item.path));
  assert.ok(fs.existsSync(saved.data.item.svgPath));
  const png = fs.readFileSync(saved.data.item.path);
  assert.equal(png.readUInt32BE(0), 0x89504e47);
  assert.equal(png.readUInt32BE(16), saved.data.item.width);
  assert.equal(png.readUInt32BE(20), saved.data.item.height);
  console.log('qr saved ok:', saved.data.item.name, saved.data.item.width, saved.data.item.size);

  const file = await call('GET', `/file?path=${encodeURIComponent(saved.data.item.path)}`);
  assert.equal(file.res.status, 200);
  assert.equal(file.res.headers.get('content-type'), 'image/png');
  assert.equal(file.data.readUInt32BE(0), 0x89504e47);

  const ranged = await call(
    'GET',
    `/file?path=${encodeURIComponent(saved.data.item.path)}`,
    undefined,
    { range: 'bytes=0-15' },
  );
  assert.equal(ranged.res.status, 206);
  assert.equal(ranged.data.length, 16);

  const history = await call('GET', '/history?kind=qr');
  assert.equal(history.res.status, 200);
  assert.ok(history.data.items.some((item) => item.name === saved.data.item.name));

  const escaped = await call('GET', `/file?path=${encodeURIComponent('/etc/hosts')}`);
  assert.equal(escaped.res.status, 403);
  assert.equal(escaped.data.error.code, 'forbidden');

  const qrTool = tools.find((tool) => tool.name === 'mading_qr');
  const toolResult = await qrTool.execute({ text: 'agent tool smoke', size: 200 });
  assert.equal(toolResult.ok, true);
  assert.ok(fs.existsSync(toolResult.path));
  const rendered = qrTool.output.render({}, toolResult);
  assert.match(rendered[0].text, /二维码已生成/);
  console.log('agent qr tool ok:', path.basename(toolResult.path));

  if (process.platform === 'darwin') {
    const decoded = await call('POST', '/qr-decode', { path: saved.data.item.path });
    assert.equal(decoded.res.status, 200);
    assert.ok(decoded.data.codes.includes('你好，码叮百宝箱 https://example.com'));
    console.log('qr decode ok:', decoded.data.codes.length, 'code(s)');

    const decodeTool = tools.find((tool) => tool.name === 'mading_qr_decode');
    const decodeResult = await decodeTool.execute({ path: saved.data.item.path });
    assert.ok(decodeResult.codes.length >= 1);
    const decodeRendered = decodeTool.output.render({}, decodeResult);
    assert.match(decodeRendered[0].text, /识别到/);
    console.log('agent qr decode tool ok:', decodeResult.name);

    const notImage = await call('POST', '/qr-decode', { path: '/etc/hosts' });
    assert.equal(notImage.res.status, 400);
    assert.equal(notImage.data.error.code, 'bad-image');
  } else {
    console.log('qr decode skipped: macOS Vision only');
  }

  if (process.platform === 'darwin') {
    const shot = await call('POST', '/screenshot', { mode: 'screen', filename: '冒烟测试截图' });
    if (shot.res.status === 200 && shot.data.ok && !shot.data.cancelled) {
      assert.ok(fs.existsSync(shot.data.item.path));
      const shotPng = fs.readFileSync(shot.data.item.path);
      assert.equal(shotPng.readUInt32BE(0), 0x89504e47);
      console.log('screenshot ok:', shot.data.item.name, shot.data.item.width, 'x', shot.data.item.height);
    } else {
      console.log('screenshot skipped/failed:', shot.res.status, shot.data?.error || shot.data);
    }
  }

  console.log('ALL SMOKE TESTS PASSED');
  console.log('output:', outputDir);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
