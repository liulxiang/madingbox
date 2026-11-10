/**
 * 码叮工具箱 · 本地冒烟测试
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
assert.equal(tools.length, 5, 'five agent tools registered');
assert.deepEqual(
  tools.map((tool) => tool.name).sort(),
  ['mading_compress', 'mading_json', 'mading_qr', 'mading_qr_decode', 'mading_screenshot'],
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
    text: '你好，码叮工具箱 https://example.com',
    ecc: 'M',
    size: 512,
  });
  assert.equal(preview.res.status, 200);
  assert.match(preview.data.svg, /^<svg /);
  assert.ok(preview.data.modules >= 21);
  console.log('qr preview ok:', preview.data.version, preview.data.modules, preview.data.width);

  const saved = await call('POST', '/qr', {
    text: '你好，码叮工具箱 https://example.com',
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

  const styledPreview = await call('POST', '/qr-preview', {
    text: '你好，码叮工具箱 https://example.com',
    ecc: 'M',
    size: 512,
    dotStyle: 'dot',
    eyeStyle: 'circle',
  });
  assert.equal(styledPreview.res.status, 200);
  assert.equal(styledPreview.data.dotStyle, 'dot');
  assert.equal(styledPreview.data.eyeStyle, 'circle');
  assert.match(styledPreview.data.svg, /<circle /);

  const styledSaved = await call('POST', '/qr', {
    text: 'styled qr smoke https://example.com/style',
    size: 512,
    ecc: 'M',
    dotStyle: 'rounded',
    eyeStyle: 'rounded',
    filename: '风格冒烟',
  });
  assert.equal(styledSaved.res.status, 200);
  assert.equal(styledSaved.data.item.dotStyle, 'rounded');
  assert.equal(styledSaved.data.item.eyeStyle, 'rounded');
  assert.ok(fs.existsSync(styledSaved.data.item.path));

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
    assert.ok(decoded.data.codes.includes('你好，码叮工具箱 https://example.com'));
    console.log('qr decode ok:', decoded.data.codes.length, 'code(s)');

    const styleText = '样式解码 https://example.com/style-check';
    for (const dotStyle of ['square', 'rounded', 'dot', 'diamond']) {
      for (const eyeStyle of ['square', 'rounded', 'circle']) {
        if (dotStyle === 'square' && eyeStyle === 'square') continue;
        const combo = await call('POST', '/qr', {
          text: styleText,
          size: 512,
          ecc: 'M',
          dotStyle,
          eyeStyle,
          filename: `风格-${dotStyle}-${eyeStyle}`,
        });
        assert.equal(combo.res.status, 200);
        const read = await call('POST', '/qr-decode', { path: combo.data.item.path });
        assert.equal(read.res.status, 200);
        assert.ok(
          read.data.codes.includes(styleText),
          `style ${dotStyle}/${eyeStyle} should stay scannable`,
        );
      }
    }
    console.log('qr styles ok: 12 combinations decode');

    const smallDiamond = await call('POST', '/qr', {
      text: 'too small',
      size: 128,
      dotStyle: 'diamond',
    });
    assert.equal(smallDiamond.res.status, 400);
    assert.equal(smallDiamond.data.error.code, 'diamond-too-small');

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
    const imageInfo = await call('POST', '/image-info', { path: saved.data.item.path });
    assert.equal(imageInfo.res.status, 200);
    assert.equal(imageInfo.data.width, saved.data.item.width);
    assert.equal(imageInfo.data.height, saved.data.item.height);
    console.log('image info ok:', imageInfo.data.width, 'x', imageInfo.data.height);

    const compressed = await call('POST', '/compress', {
      path: saved.data.item.path,
      quality: 60,
      maxEdge: 128,
      format: 'jpeg',
    });
    assert.equal(compressed.res.status, 200);
    assert.ok(fs.existsSync(compressed.data.item.path));
    assert.equal(compressed.data.format, 'jpeg');
    assert.ok(compressed.data.item.width <= 128);
    assert.equal(compressed.data.item.width, compressed.data.item.height);
    const jpegBytes = fs.readFileSync(compressed.data.item.path);
    assert.equal(jpegBytes[0], 0xff);
    assert.equal(jpegBytes[1], 0xd8);
    console.log('compress ok:', compressed.data.item.name, compressed.data.ratio + '% smaller');

    const compressedHistory = await call('GET', '/history?kind=compress');
    assert.equal(compressedHistory.res.status, 200);
    assert.ok(compressedHistory.data.items.some((item) => item.name === compressed.data.item.name));
    const allHistory = await call('GET', '/history?kind=all');
    assert.ok(allHistory.data.items.some((item) => item.kind === 'compress'));

    const compressTool = tools.find((tool) => tool.name === 'mading_compress');
    const compressResult = await compressTool.execute({ path: saved.data.item.path, maxEdge: 96, format: 'png' });
    assert.equal(compressResult.ok, true);
    assert.equal(compressResult.width, 96);
    const compressRendered = compressTool.output.render({}, compressResult);
    assert.match(compressRendered[0].text, /压缩完成/);
    console.log('agent compress tool ok:', path.basename(compressResult.path));
  } else {
    console.log('compress skipped: macOS sips only');
  }

  const jsonOk = await call('POST', '/json', {
    text: '{"name":"码叮","list":[1,2,3]}',
    action: 'format',
    indent: '2',
  });
  assert.equal(jsonOk.res.status, 200);
  assert.equal(jsonOk.data.valid, true);
  assert.match(jsonOk.data.output, /\n  "name"/);

  const jsonMin = await call('POST', '/json', {
    text: '{\n  "a": 1,\n  "b": [2, 3]\n}',
    action: 'minify',
  });
  assert.equal(jsonMin.data.valid, true);
  assert.equal(jsonMin.data.output, '{"a":1,"b":[2,3]}');

  const jsonFile = path.join(outputDir, 'sample.json');
  fs.writeFileSync(jsonFile, '{"file":true,"n":2}', 'utf8');
  const jsonFromFile = await call('POST', '/json', { path: jsonFile, action: 'format' });
  assert.equal(jsonFromFile.data.valid, true);
  assert.match(jsonFromFile.data.output, /"file": true/);
  console.log('json file ok');

  const jsonBad = await call('POST', '/json', {
    text: '{"a": 1,}',
    action: 'validate',
  });
  assert.equal(jsonBad.res.status, 200);
  assert.equal(jsonBad.data.valid, false);
  assert.ok(jsonBad.data.error.line >= 1);
  console.log('json endpoint ok:', jsonBad.data.error.message);

  const jsonTool = tools.find((tool) => tool.name === 'mading_json');
  const jsonResult = await jsonTool.execute({ action: 'format', text: '{"x":[1,{"y":true}]}' });
  assert.equal(jsonResult.valid, true);
  const jsonRendered = jsonTool.output.render({}, jsonResult);
  assert.match(jsonRendered[0].text, /格式化完成/);
  console.log('agent json tool ok');

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
