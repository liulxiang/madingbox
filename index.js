/**
 * 码叮百宝箱 · Host half
 *
 * 第一期两个能力：
 *   1. 截图 —— 调用系统原生 screencapture（全屏 / 区域 / 窗口），文件落到下载目录；
 *   2. 二维码 —— 本地编码（byte 模式，L/M/Q/H 纠错），输出 PNG + SVG，并用 macOS Vision 识别图片；不联网。
 *
 * 所有 HTTP 路由都走 connection 信任检查；文件路由只允许访问本插件自己的输出目录。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const QRCode = require('./vendor/qrcode/index.js');

export const name = 'mading-toolbox';
export const version = '0.1.0';
export const inject = ['webServer', 'tools', 'connection'];

const PREFIX = '/mading-toolbox/api';
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_QR_BYTES = 2900;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const SCREENSHOT_TIMEOUT_MS = 5 * 60 * 1000;
const DECODE_SCRIPT = fileURLToPath(new URL('./vendor/qrdecode.js', import.meta.url));

const HOME = os.homedir();
const ROOT = process.env.MADING_TOOLBOX_DIR
  ? path.resolve(process.env.MADING_TOOLBOX_DIR)
  : path.join(HOME, 'Downloads', '码叮百宝箱');
const SHOT_DIR = path.join(ROOT, '截图');
const QR_DIR = path.join(ROOT, '二维码');
const JXA_CACHE = path.join(os.tmpdir(), 'mading-toolbox-jxa');

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export function apply(ctx) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(QR_DIR, { recursive: true });
  fs.mkdirSync(JXA_CACHE, { recursive: true });

  const route = {
    kind: 'prefix',
    path: PREFIX,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://dsh.internal');
      const method = url.pathname.startsWith(`${PREFIX}/`)
        ? url.pathname.slice(PREFIX.length + 1)
        : '';
      try {
        await dispatch(ctx, req, res, method, url);
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 500;
        const code = error instanceof ApiError ? error.code : 'internal-error';
        const message = error instanceof Error ? error.message : String(error);
        if (!(error instanceof ApiError)) console.error('[mading-toolbox]', error);
        json(res, status, { ok: false, error: { code, message } });
      }
    },
  };

  ctx.effect(() => ctx.webServer.register(route), 'mading-toolbox: /mading-toolbox/api');

  ctx.effect(() => ctx.tools.register(screenshotTool()), 'mading-toolbox: screenshot tool');
  ctx.effect(() => ctx.tools.register(qrTool()), 'mading-toolbox: qr tool');
  ctx.effect(() => ctx.tools.register(qrDecodeTool()), 'mading-toolbox: qr decode tool');
}

/* ------------------------------------------------------------------ routes */

async function dispatch(ctx, req, res, method, url) {
  const connection = ctx.get('connection');
  if (!connection) {
    json(res, 503, { ok: false, error: { code: 'no-connection', message: '连接信任服务不可用，请重启 DSH 后再试' } });
    return;
  }
  const rejection = connection.requestRejection(req);
  if (rejection !== undefined) {
    json(res, rejection, { ok: false, error: { code: 'unauthorized', message: '请求未通过来源检查' } });
    return;
  }

  if (req.method === 'GET' && method === 'status') {
    json(res, 200, {
      ok: true,
      version,
      platform: process.platform,
      capabilities: {
        screenshot: process.platform === 'darwin' && fs.existsSync('/usr/sbin/screencapture'),
        interactive: process.platform === 'darwin',
        clipboard: process.platform === 'darwin' && fs.existsSync('/usr/bin/osascript'),
        qrDecode: process.platform === 'darwin' && fs.existsSync('/usr/bin/osascript'),
      },
      dirs: {
        root: ROOT,
        screenshots: SHOT_DIR,
        qr: QR_DIR,
        displayRoot: displayPath(ROOT),
      },
    });
    return;
  }

  if (req.method === 'GET' && method === 'history') {
    const kind = url.searchParams.get('kind') === 'qr' ? 'qr' : url.searchParams.get('kind') === 'shot' ? 'shot' : 'all';
    const items = await listHistory(kind);
    json(res, 200, { ok: true, items });
    return;
  }

  if (req.method === 'GET' && method === 'file') {
    await serveFile(req, res, url);
    return;
  }

  if (req.method === 'POST' && method === 'screenshot') {
    const body = await readJson(req);
    const item = await takeScreenshot(body);
    json(res, 200, { ok: true, cancelled: Boolean(item.cancelled), ...(item.cancelled ? {} : { item }) });
    return;
  }

  if (req.method === 'POST' && method === 'qr-preview') {
    const body = await readJson(req);
    json(res, 200, { ok: true, ...previewQr(body) });
    return;
  }

  if (req.method === 'POST' && method === 'qr') {
    const body = await readJson(req);
    const item = await saveQr(body);
    json(res, 200, { ok: true, item });
    return;
  }

  if (req.method === 'POST' && method === 'qr-decode') {
    const body = await readJson(req);
    const result = await decodeQrFile(body.path);
    json(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'POST' && method === 'pick-image') {
    const picked = await pickImage();
    json(res, 200, { ok: true, ...picked });
    return;
  }

  if (req.method === 'POST' && method === 'reveal') {
    const body = await readJson(req);
    const file = await safeExistingPath(body.path, true);
    const stat = await fsp.stat(file);
    const args = stat.isDirectory() ? [file] : ['-R', file];
    const result = await run('/usr/bin/open', args, { timeoutMs: 15000 });
    if (result.code !== 0) throw new ApiError(500, 'reveal-failed', result.stderr || '无法在访达中显示');
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && method === 'clipboard') {
    const body = await readJson(req);
    const file = await safeExistingPath(body.path, false);
    if (path.extname(file).toLowerCase() !== '.png') {
      throw new ApiError(400, 'clipboard-png-only', '只能把 PNG 图片复制到剪贴板');
    }
    const script = `set the clipboard to (read (POSIX file "${appleString(file)}") as «class PNGf»)`;
    const result = await run('/usr/bin/osascript', ['-e', script], { timeoutMs: 15000 });
    if (result.code !== 0) throw new ApiError(500, 'clipboard-failed', result.stderr || '复制到剪贴板失败');
    json(res, 200, { ok: true });
    return;
  }

  json(res, 404, { ok: false, error: { code: 'not-found', message: '未知接口' } });
}

/* --------------------------------------------------------------- screenshot */

async function takeScreenshot(input, signal) {
  if (process.platform !== 'darwin') {
    throw new ApiError(400, 'unsupported-platform', '第一期截图只支持 macOS');
  }
  if (!fs.existsSync('/usr/sbin/screencapture')) {
    throw new ApiError(503, 'screencapture-missing', '系统里找不到 screencapture');
  }

  const mode = ['screen', 'region', 'window'].includes(input.mode) ? input.mode : 'screen';
  const delay = clampInt(input.delay, 0, 10, 0);
  const cursor = Boolean(input.cursor);
  const label = { screen: '全屏', region: '区域', window: '窗口' }[mode];
  const fileName = uniqueName(
    SHOT_DIR,
    ensurePng(safeBaseName(input.filename) || `截图-${stamp()}-${label}`),
  );
  const file = path.join(SHOT_DIR, fileName);

  const args = ['-x', '-t', 'png'];
  if (delay > 0) args.push('-T', String(delay));
  if (cursor) args.push('-C');
  if (mode === 'region') args.push('-i');
  else if (mode === 'window') args.push('-w', '-o');
  else args.push('-m');
  args.push(file);

  const result = await run('/usr/sbin/screencapture', args, { timeoutMs: SCREENSHOT_TIMEOUT_MS, signal });
  const exists = fs.existsSync(file) && fs.statSync(file).size > 0;

  if (!exists) {
    if (result.timedOut) throw new ApiError(504, 'timeout', '截图等待超时');
    // 原生截图面板按 Esc 会以 1 退出且不产出文件；真正的权限/设备错误会带 stderr。
    if (result.code === 1 && !/error|denied|not authorized|no such|cannot/i.test(result.stderr)) {
      return { cancelled: true };
    }
    throw new ApiError(500, 'capture-failed', cleanError(result.stderr) || `截图失败（退出码 ${result.code}）`);
  }

  const stat = await fsp.stat(file);
  const dims = await pngDimensions(file);
  return itemFor('shot', file, stat, dims);
}

/* --------------------------------------------------------------------- QR */

function previewQr(input) {
  const spec = buildQr(input);
  return {
    svg: spec.svg,
    version: spec.version,
    modules: spec.modules,
    width: spec.pixelSize,
    height: spec.pixelSize,
    bytes: Buffer.byteLength(spec.text, 'utf8'),
    ecc: spec.ecc,
  };
}

async function saveQr(input) {
  const spec = buildQr(input);
  const base = ensurePng(safeBaseName(input.filename) || `二维码-${stamp()}`);
  const fileName = uniqueName(QR_DIR, base);
  const file = path.join(QR_DIR, fileName);
  const svgFile = file.replace(/\.png$/i, '.svg');
  const png = renderPng(spec);
  await fsp.writeFile(file, png);
  await fsp.writeFile(svgFile, spec.svg, 'utf8');
  const stat = await fsp.stat(file);
  const item = itemFor('qr', file, stat, { width: spec.pixelSize, height: spec.pixelSize });
  item.svgUrl = fileUrl(svgFile);
  item.svgPath = svgFile;
  item.version = spec.version;
  item.modules = spec.modules;
  item.textBytes = Buffer.byteLength(spec.text, 'utf8');
  return item;
}

async function decodeQrFile(raw) {
  const file = await safeImagePath(raw);
  const stat = await fsp.stat(file);
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new ApiError(413, 'image-too-large', `图片超过 ${Math.round(MAX_IMAGE_BYTES / 1048576)}MB 上限`);
  }
  const result = await run(
    '/usr/bin/osascript',
    ['-l', 'JavaScript', DECODE_SCRIPT, file],
    { timeoutMs: 45000, env: { TMPDIR: JXA_CACHE } },
  );
  if (result.code !== 0) {
    throw new ApiError(500, 'decode-failed', cleanError(result.stderr) || '图片识别失败（需要 macOS 的 Vision 支持）');
  }
  let parsed;
  try {
    const output = result.stdout.trim().split('\n').filter(Boolean).pop() || '';
    parsed = JSON.parse(output);
  } catch {
    throw new ApiError(500, 'decode-failed', '图片识别返回了无法解析的结果');
  }
  if (!parsed?.ok) throw new ApiError(500, 'decode-failed', '系统没有识别出这张图片里的二维码');
  const codes = Array.isArray(parsed.codes) ? parsed.codes.filter((code) => typeof code === 'string' && code !== '') : [];
  return { path: file, name: path.basename(file), codes };
}

async function pickImage() {
  const script = 'POSIX path of (choose file with prompt "选择要识别的二维码图片" of type {"public.image"})';
  const result = await run('/usr/bin/osascript', ['-e', script], { timeoutMs: 5 * 60 * 1000 });
  if (result.code !== 0) {
    const detail = `${result.stderr}\n${result.stdout}`;
    if (/user cancel|用户已取消|-128/i.test(detail)) return { cancelled: true };
    throw new ApiError(500, 'pick-failed', cleanError(result.stderr) || '没有选择图片');
  }
  const picked = result.stdout.trim();
  if (!picked) return { cancelled: true };
  return { path: picked };
}

async function safeImagePath(raw) {
  if (typeof raw !== 'string' || raw === '') throw new ApiError(400, 'bad-path', '缺少图片路径');
  let resolved;
  try {
    resolved = await fsp.realpath(path.resolve(raw));
  } catch {
    throw new ApiError(404, 'not-found', '图片不存在');
  }
  const stat = await fsp.stat(resolved);
  if (!stat.isFile()) throw new ApiError(400, 'not-file', '目标不是文件');
  const ext = path.extname(resolved).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.tiff', '.tif', '.bmp', '.heic'].includes(ext)) {
    throw new ApiError(400, 'bad-image', '只支持常见图片格式（PNG / JPEG / WebP / GIF / TIFF / BMP / HEIC）');
  }
  return resolved;
}

function buildQr(input) {
  const text = typeof input.text === 'string' ? input.text : '';
  if (text.trim() === '') throw new ApiError(400, 'empty-text', '请输入要生成二维码的内容');
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAX_QR_BYTES) {
    throw new ApiError(400, 'too-long', `内容太长：${bytes} 字节，二维码上限约 ${MAX_QR_BYTES} 字节`);
  }

  const ecc = String(input.ecc || input.errorCorrectionLevel || 'M').toUpperCase();
  if (!['L', 'M', 'Q', 'H'].includes(ecc)) {
    throw new ApiError(400, 'bad-ecc', '纠错级别只能是 L / M / Q / H');
  }
  const size = clampInt(input.size, 128, 2048, 512);
  const margin = clampInt(input.margin, 0, 8, 4);
  const dark = parseColor(input.dark, '#111827');
  const light = parseColor(input.light, '#ffffff');

  let qr;
  try {
    qr = QRCode.create(text, { errorCorrectionLevel: ecc });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ApiError(400, 'encode-failed', /too big/i.test(message) ? '内容太长，超出二维码容量' : `二维码编码失败：${message}`);
  }

  const modules = qr.modules.size;
  const total = modules + margin * 2;
  const scale = Math.max(1, Math.floor(size / total));
  const contentSize = total * scale;
  const pixelSize = Math.max(size, contentSize);
  const offset = Math.floor((pixelSize - contentSize) / 2);

  return {
    text,
    ecc,
    size,
    margin,
    dark,
    light,
    qr,
    version: qr.version,
    modules,
    total,
    scale,
    offset,
    pixelSize,
    svg: renderSvg(qr.modules, margin, pixelSize, scale, offset, dark, light),
  };
}

function renderSvg(matrix, margin, pixelSize, scale, offset, dark, light) {
  const runs = [];
  for (let row = 0; row < matrix.size; row++) {
    let col = 0;
    while (col < matrix.size) {
      if (!matrix.get(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < matrix.size && matrix.get(row, col)) col++;
      runs.push(`<rect x="${start + margin}" y="${row + margin}" width="${col - start}" height="1"/>`);
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}" shape-rendering="crispEdges">`,
    `<rect width="${pixelSize}" height="${pixelSize}" fill="${light.hex}"/>`,
    `<g fill="${dark.hex}" transform="translate(${offset} ${offset}) scale(${scale})">${runs.join('')}</g>`,
    '</svg>',
  ].join('');
}

function renderPng(spec) {
  const { scale, offset, dark, light, qr } = spec;
  const width = spec.pixelSize;
  const height = width;
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);

  const lightRow = Buffer.alloc(width * 3);
  for (let x = 0; x < width; x++) {
    lightRow[x * 3] = light.r;
    lightRow[x * 3 + 1] = light.g;
    lightRow[x * 3 + 2] = light.b;
  }
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    lightRow.copy(raw, y * stride + 1);
  }

  const darkPixel = Buffer.from([dark.r, dark.g, dark.b]);
  const darkRow = Buffer.alloc(scale * 3);
  for (let i = 0; i < scale; i++) darkPixel.copy(darkRow, i * 3);

  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x0 = offset + (col + spec.margin) * scale;
      for (let py = 0; py < scale; py++) {
        const y = offset + (row + spec.margin) * scale + py;
        raw.set(darkRow, y * stride + 1 + x0 * 3);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const tag = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
  return Buffer.concat([length, tag, data, crc]);
}

/* ----------------------------------------------------------------- files */

async function listHistory(kind) {
  const sources = kind === 'qr'
    ? [['qr', QR_DIR]]
    : kind === 'shot'
      ? [['shot', SHOT_DIR]]
      : [['shot', SHOT_DIR], ['qr', QR_DIR]];
  const items = [];
  for (const [itemKind, dir] of sources) {
    let names;
    try {
      names = await fsp.readdir(dir);
    } catch {
      continue;
    }
    for (const fileName of names) {
      if (!fileName.toLowerCase().endsWith('.png')) continue;
      const full = path.join(dir, fileName);
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat?.isFile()) continue;
      const dims = await pngDimensions(full);
      items.push(itemFor(itemKind, full, stat, dims));
    }
  }
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items.slice(0, 36);
}

function itemFor(kind, file, stat, dims) {
  return {
    id: `${kind}:${path.basename(file)}`,
    kind,
    name: path.basename(file),
    path: file,
    url: fileUrl(file),
    size: stat.size,
    createdAt: stat.mtimeMs,
    width: dims?.width || 0,
    height: dims?.height || 0,
  };
}

function fileUrl(file) {
  return `${PREFIX}/file?path=${encodeURIComponent(file)}`;
}

async function serveFile(req, res, url) {
  const file = await safeExistingPath(url.searchParams.get('path'), false);
  const stat = await fsp.stat(file);
  if (!stat.isFile()) throw new ApiError(404, 'not-file', '目标不是文件');

  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const download = url.searchParams.get('download') === '1';
  const baseName = path.basename(file);
  const headers = {
    'content-type': mime,
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
  };
  if (download) {
    const ascii = baseName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    headers['content-disposition'] = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(baseName)}`;
  }

  const range = req.headers.range;
  if (typeof range === 'string' && /^bytes=\d*-\d*$/.test(range.trim())) {
    const [startText, endText] = range.trim().slice(6).split('-');
    let start = startText === '' ? NaN : Number(startText);
    let end = endText === '' ? NaN : Number(endText);
    if (Number.isNaN(start)) {
      start = Math.max(0, stat.size - (Number.isNaN(end) ? 0 : end));
      end = stat.size - 1;
    } else if (Number.isNaN(end)) {
      end = stat.size - 1;
    }
    if (start < 0 || end >= stat.size || start > end) {
      res.writeHead(416, { 'content-range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${stat.size}`,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'content-length': stat.size });
  fs.createReadStream(file).pipe(res);
}

async function safeExistingPath(raw, allowRoot) {
  if (typeof raw !== 'string' || raw === '') throw new ApiError(400, 'bad-path', '缺少文件路径');
  let resolved;
  try {
    resolved = await fsp.realpath(path.resolve(raw));
  } catch {
    throw new ApiError(404, 'not-found', '文件不存在');
  }
  const root = await fsp.realpath(ROOT);
  if (resolved === root) {
    if (allowRoot) return resolved;
    throw new ApiError(403, 'forbidden', '不能访问该路径');
  }
  if (!isInsideDir(root, resolved)) throw new ApiError(403, 'forbidden', '不能访问输出目录以外的文件');
  return resolved;
}

function isInsideDir(root, file) {
  const rel = path.relative(root, file);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/* ----------------------------------------------------------------- tools */

function screenshotTool() {
  return {
    name: 'mading_screenshot',
    description:
      '用 macOS 原生截图抓屏并把 PNG 存到「下载/码叮百宝箱/截图」。' +
      'mode=screen 抓主显示器，region 进入框选，window 点选窗口；delay 为延迟秒数（0-10），cursor 控制是否带上鼠标指针。' +
      'region/window 会弹出系统截图面板，需要用户当场操作。',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['screen', 'region', 'window'], description: '截图方式，默认 screen。' },
        delay: { type: 'integer', minimum: 0, maximum: 10, description: '延迟秒数，默认 0。' },
        cursor: { type: 'boolean', description: '是否包含鼠标指针，默认 false。' },
        filename: { type: 'string', description: '可选文件名（不含路径），会自动补 .png。' },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          cancelled: { type: 'boolean' },
          path: { type: 'string' },
          name: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          size: { type: 'number' },
          mode: { type: 'string' },
        },
        required: ['ok'],
      },
      render(_args, value) {
        const v = value || {};
        if (v.cancelled) return [{ type: 'text', text: '截图已取消（用户在系统面板按了 Esc）。' }];
        const lines = [
          `已保存截图：${v.path || ''}`,
          `尺寸：${v.width || '?'} × ${v.height || '?'}`,
          `大小：${formatBytes(v.size)}`,
          `方式：${v.mode || 'screen'}`,
        ];
        return [{ type: 'text', text: lines.join('\n') }];
      },
    },
    timeoutMs: SCREENSHOT_TIMEOUT_MS + 30000,
    execute: async (args, exec) => {
      const mode = ['screen', 'region', 'window'].includes(args.mode) ? args.mode : 'screen';
      const result = await takeScreenshot(args, exec?.signal);
      if (result.cancelled) return { ok: true, cancelled: true };
      return {
        ok: true,
        cancelled: false,
        path: result.path,
        name: result.name,
        width: result.width,
        height: result.height,
        size: result.size,
        mode,
      };
    },
  };
}

function qrTool() {
  return {
    name: 'mading_qr',
    description:
      '把文字/网址/Wi-Fi/邮箱等内容生成二维码，保存在「下载/码叮百宝箱/二维码」，同时输出 PNG 和 SVG。' +
      '支持纠错级别 L/M/Q/H、像素尺寸 128-2048、静区 0-8 模块，以及前景/背景色（#RRGGBB）。',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '二维码内容。' },
        size: { type: 'integer', minimum: 128, maximum: 2048, description: '目标像素尺寸，默认 512。' },
        ecc: { type: 'string', enum: ['L', 'M', 'Q', 'H'], description: '纠错级别，默认 M。' },
        margin: { type: 'integer', minimum: 0, maximum: 8, description: '静区宽度（模块数），默认 4。' },
        dark: { type: 'string', description: '前景色 #RRGGBB，默认 #111827。' },
        light: { type: 'string', description: '背景色 #RRGGBB，默认 #FFFFFF。' },
        filename: { type: 'string', description: '可选文件名（不含路径），会自动补 .png。' },
      },
      required: ['text'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          path: { type: 'string' },
          svgPath: { type: 'string' },
          name: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          version: { type: 'number' },
          modules: { type: 'number' },
        },
        required: ['ok', 'path'],
      },
      render(_args, value) {
        const v = value || {};
        return [{
          type: 'text',
          text: [
            `二维码已生成：${v.path || ''}`,
            `SVG：${v.svgPath || ''}`,
            `版本：${v.version || '?'}（${v.modules || '?'} × ${v.modules || '?'} 模块，${v.width || '?'}px）`,
          ].join('\n'),
        }];
      },
    },
    timeoutMs: 60000,
    execute: async (args) => {
      const item = await saveQr(args);
      return {
        ok: true,
        path: item.path,
        svgPath: item.svgPath,
        name: item.name,
        width: item.width,
        height: item.height,
        version: item.version,
        modules: item.modules,
      };
    },
  };
}

function qrDecodeTool() {
  return {
    name: 'mading_qr_decode',
    description:
      '识别一张本地图片里的二维码（macOS Vision），返回图中的全部文本内容。' +
      '适合读取别人发来的二维码截图、海报或相机照片；不联网，也不修改原图。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '本地图片的绝对路径（PNG / JPEG / WebP / HEIC 等）。' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          path: { type: 'string' },
          name: { type: 'string' },
          codes: { type: 'array', items: { type: 'string' } },
        },
        required: ['ok', 'codes'],
      },
      render(_args, value) {
        const v = value || {};
        if (!v.codes?.length) return [{ type: 'text', text: '这张图片里没有识别到二维码。' }];
        const lines = [`在 ${v.name || v.path || '图片'} 里识别到 ${v.codes.length} 个二维码：`];
        v.codes.forEach((code, index) => {
          lines.push('', `#${index + 1}`, code);
        });
        return [{ type: 'text', text: lines.join('\n') }];
      },
    },
    timeoutMs: 60000,
    execute: async (args) => {
      const result = await decodeQrFile(args.path);
      return { ok: true, path: result.path, name: result.name, codes: result.codes };
    },
  };
}

/* --------------------------------------------------------------- helpers */

function json(res, status, body) {
  if (res.headersSent) return;
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'too-large', '请求体超过 1MB 上限');
    chunks.push(buffer);
  }
  if (size === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    throw new ApiError(400, 'bad-json', '请求体不是合法 JSON');
  }
}

function run(command, args, options = {}) {
  const { timeoutMs = 60000, signal, env } = options;
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: env ? { ...process.env, ...env } : process.env,
      });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let aborted = false;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      fn(value);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    timer.unref?.();

    const onAbort = () => {
      aborted = true;
      child.kill('SIGTERM');
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish(reject, error));
    child.on('close', (code) => {
      if (aborted) {
        finish(reject, Object.assign(new Error('操作已取消'), { name: 'AbortError' }));
        return;
      }
      finish(resolve, { code: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

async function pngDimensions(file) {
  try {
    const handle = await fsp.open(file, 'r');
    try {
      const buffer = Buffer.alloc(24);
      const { bytesRead } = await handle.read(buffer, 0, 24, 0);
      if (bytesRead < 24) return null;
      if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

function parseColor(raw, fallback) {
  const value = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : fallback;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) throw new ApiError(400, 'bad-color', `颜色格式不对：${value}（应为 #RRGGBB）`);
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    hex: `#${hex.toLowerCase()}`,
  };
}

function clampInt(raw, min, max, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function safeBaseName(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\.png$/i, '')
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function ensurePng(name) {
  return /\.png$/i.test(name) ? name : `${name}.png`;
}

function uniqueName(dir, fileName) {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  let candidate = fileName;
  let index = 2;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem}-${index}${ext}`;
    index++;
  }
  return candidate;
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function appleString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function cleanError(value) {
  return String(value || '').trim().split('\n').slice(0, 2).join(' ').slice(0, 300);
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${n} B`;
}

function displayPath(file) {
  return file.startsWith(HOME) ? `~${file.slice(HOME.length)}` : file;
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
