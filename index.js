/**
 * 码叮工具箱 · Host half
 *
 * 四个本地能力：
 *   1. 截图 —— 调用系统原生 screencapture（全屏 / 区域 / 窗口），文件落到下载目录；
 *   2. 二维码 —— 本地编码（byte 模式，L/M/Q/H 纠错），输出 PNG + SVG，并用 macOS Vision 识别图片；
 *   3. 图片压缩 —— 调系统 sips 缩放 / 转码 / 调 JPEG 质量，原图不动；
 *   4. JSON —— 格式化、最小化、校验，给侧栏与 Agent 共用。
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
export const version = '0.3.0';
export const inject = ['webServer', 'tools', 'connection'];

const PREFIX = '/mading-toolbox/api';
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_QR_BYTES = 2900;
const DOT_STYLES = ['square', 'rounded', 'dot', 'diamond'];
const EYE_STYLES = ['square', 'rounded', 'circle'];
const DOT_STYLE_NAMES = { square: '方块', rounded: '圆角', dot: '圆点', diamond: '菱形' };
const EYE_STYLE_NAMES = { square: '方块', rounded: '圆角', circle: '圆形' };
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_COMPRESS_BYTES = 80 * 1024 * 1024;
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const SCREENSHOT_TIMEOUT_MS = 5 * 60 * 1000;
const COMPRESS_TIMEOUT_MS = 2 * 60 * 1000;
const DECODE_SCRIPT = fileURLToPath(new URL('./vendor/qrdecode.js', import.meta.url));

const HOME = os.homedir();
const DEFAULT_ROOT = path.join(HOME, 'Downloads', '码叮工具箱');
const LEGACY_ROOT = path.join(HOME, 'Downloads', '码叮百宝箱');
const ROOT = process.env.MADING_TOOLBOX_DIR
  ? path.resolve(process.env.MADING_TOOLBOX_DIR)
  : DEFAULT_ROOT;
const SHOT_DIR = path.join(ROOT, '截图');
const QR_DIR = path.join(ROOT, '二维码');
const COMPRESS_DIR = path.join(ROOT, '压缩');
const JXA_CACHE = path.join(os.tmpdir(), 'mading-toolbox-jxa');

function migrateLegacyRoot() {
  if (process.env.MADING_TOOLBOX_DIR) return;
  if (fs.existsSync(ROOT) || !fs.existsSync(LEGACY_ROOT)) return;
  try {
    fs.renameSync(LEGACY_ROOT, ROOT);
  } catch {
    /* 跨卷或权限不足时保留旧目录，新输出继续写到新目录 */
  }
}

const COMPRESS_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.heic', '.tif', '.tiff', '.bmp']);

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
};

export function apply(ctx) {
  migrateLegacyRoot();
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(QR_DIR, { recursive: true });
  fs.mkdirSync(COMPRESS_DIR, { recursive: true });
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
  ctx.effect(() => ctx.tools.register(compressTool()), 'mading-toolbox: compress tool');
  ctx.effect(() => ctx.tools.register(jsonTool()), 'mading-toolbox: json tool');
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
        compress: process.platform === 'darwin' && fs.existsSync('/usr/bin/sips'),
        json: true,
      },
      dirs: {
        root: ROOT,
        screenshots: SHOT_DIR,
        qr: QR_DIR,
        compressed: COMPRESS_DIR,
        displayRoot: displayPath(ROOT),
      },
    });
    return;
  }

  if (req.method === 'GET' && method === 'history') {
    const rawKind = url.searchParams.get('kind');
    const kind = ['qr', 'shot', 'compress'].includes(rawKind) ? rawKind : 'all';
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

  if (req.method === 'POST' && method === 'image-info') {
    const body = await readJson(req);
    json(res, 200, { ok: true, ...(await imageInfo(body.path)) });
    return;
  }

  if (req.method === 'POST' && method === 'compress') {
    const body = await readJson(req);
    json(res, 200, { ok: true, ...(await compressImage(body)) });
    return;
  }

  if (req.method === 'POST' && method === 'json') {
    const body = await readJson(req);
    const text = await readJsonSource(body);
    json(res, 200, transformJson(text, body));
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
    const ext = path.extname(file).toLowerCase();
    const appleClass = ext === '.png' ? 'PNGf' : ext === '.jpg' || ext === '.jpeg' ? 'JPEG' : '';
    if (!appleClass) {
      throw new ApiError(400, 'clipboard-unsupported', '只能把 PNG / JPEG 图片复制到剪贴板');
    }
    const script = `set the clipboard to (read (POSIX file "${appleString(file)}") as «class ${appleClass}»)`;
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
    dotStyle: spec.dotStyle,
    eyeStyle: spec.eyeStyle,
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
  item.dotStyle = spec.dotStyle;
  item.eyeStyle = spec.eyeStyle;
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
  const script = 'POSIX path of (choose file with prompt "选择一张图片" of type {"public.image"})';
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

/* ---------------------------------------------------------- compress image */

async function safeCompressPath(raw) {
  const file = await safeImagePath(raw);
  const ext = path.extname(file).toLowerCase();
  if (!COMPRESS_EXTS.has(ext)) {
    throw new ApiError(400, 'bad-compress-image', '图片压缩暂不支持 GIF（会丢掉动画），请用 PNG / JPEG / WebP / HEIC / TIFF / BMP');
  }
  const stat = await fsp.stat(file);
  if (stat.size > MAX_COMPRESS_BYTES) {
    throw new ApiError(413, 'image-too-large', `图片超过 ${Math.round(MAX_COMPRESS_BYTES / 1048576)}MB 上限`);
  }
  if (stat.size === 0) throw new ApiError(400, 'empty-image', '图片是空文件');
  return file;
}

async function imageDimensions(file) {
  const result = await run('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { timeoutMs: 30000 });
  if (result.code !== 0) return { width: 0, height: 0 };
  const width = Number(/pixelWidth:\s*(\d+)/.exec(result.stdout)?.[1] || 0);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(result.stdout)?.[1] || 0);
  return { width, height };
}

async function imageInfo(raw) {
  const file = await safeCompressPath(raw);
  const stat = await fsp.stat(file);
  const dims = await imageDimensions(file);
  return {
    path: file,
    name: path.basename(file),
    size: stat.size,
    width: dims.width,
    height: dims.height,
    format: path.extname(file).slice(1).toLowerCase(),
  };
}

async function compressImage(input) {
  if (process.platform !== 'darwin' || !fs.existsSync('/usr/bin/sips')) {
    throw new ApiError(503, 'sips-missing', '当前系统没有 sips，无法压缩图片');
  }
  const file = await safeCompressPath(input.path);
  const originalStat = await fsp.stat(file);
  const originalDims = await imageDimensions(file);
  const ext = path.extname(file).toLowerCase();

  const requested = String(input.format || 'auto').toLowerCase();
  const format = requested === 'png' ? 'png' : requested === 'jpeg' || requested === 'jpg' ? 'jpeg' : ext === '.png' ? 'png' : 'jpeg';
  const quality = clampInt(input.quality, 1, 100, 78);
  const maxEdge = clampInt(input.maxEdge, 0, 12000, 0);
  const stem = safeBaseName(path.basename(file, ext)) || '图片';
  const suffix = format === 'jpeg' ? '.jpg' : '.png';
  const fileName = uniqueName(COMPRESS_DIR, `${stem}-压缩${suffix}`);
  const out = path.join(COMPRESS_DIR, fileName);

  const args = ['-s', 'format', format];
  if (format === 'jpeg') args.push('-s', 'formatOptions', String(quality));
  if (maxEdge > 0) args.push('-Z', String(maxEdge));
  args.push(file, '--out', out);

  const result = await run('/usr/bin/sips', args, { timeoutMs: COMPRESS_TIMEOUT_MS });
  if (result.code !== 0) {
    throw new ApiError(500, 'compress-failed', cleanError(result.stderr) || '系统没能压缩这张图片');
  }
  const stat = await fsp.stat(out).catch(() => null);
  if (!stat?.isFile() || stat.size === 0) {
    throw new ApiError(500, 'compress-failed', '压缩没有产出有效文件');
  }

  const dims = await imageDimensions(out);
  const item = itemFor('compress', out, stat, dims);
  return {
    item,
    original: {
      path: file,
      name: path.basename(file),
      size: originalStat.size,
      width: originalDims.width,
      height: originalDims.height,
      format: ext.slice(1),
    },
    format,
    quality: format === 'jpeg' ? quality : null,
    maxEdge,
    saved: originalStat.size - stat.size,
    ratio: originalStat.size > 0 ? Math.round(((originalStat.size - stat.size) / originalStat.size) * 100) : 0,
  };
}

/* ------------------------------------------------------------------- JSON */

function jsonErrorInfo(error, text) {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = /position\s+(\d+)/i.exec(message);
  const lineColumnMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  let position = positionMatch ? Number(positionMatch[1]) : null;
  let line = lineColumnMatch ? Number(lineColumnMatch[1]) : null;
  let column = lineColumnMatch ? Number(lineColumnMatch[2]) : null;
  if (line === null && position !== null) {
    const before = text.slice(0, position);
    line = before.split('\n').length;
    column = position - before.lastIndexOf('\n');
  }
  const info = { message };
  if (line !== null) info.line = line;
  if (column !== null) info.column = column;
  if (position !== null) info.position = position;
  return info;
}

function transformJson(text, input = {}) {
  const action = ['format', 'minify', 'validate'].includes(input.action) ? input.action : 'format';
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  const inputBytes = Buffer.byteLength(source, 'utf8');
  if (source.trim() === '') {
    return {
      ok: true,
      valid: false,
      action,
      inputBytes,
      error: { message: '输入为空' },
    };
  }
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    return { ok: true, valid: false, action, inputBytes, error: jsonErrorInfo(error, source) };
  }
  const indent = input.indent === 'tab' ? '\t' : Number(input.indent) === 4 ? 4 : 2;
  const output = action === 'format' ? JSON.stringify(value, null, indent) : action === 'minify' ? JSON.stringify(value) : null;
  const compact = JSON.stringify(value);
  const keys = value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length : null;
  const length = Array.isArray(value) ? value.length : null;
  const result = {
    ok: true,
    valid: true,
    action,
    inputBytes,
    bytes: Buffer.byteLength(compact, 'utf8'),
    lines: output ? output.split('\n').length : source.split('\n').length,
    type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
  };
  if (output !== null) result.output = output;
  if (keys !== null) result.keys = keys;
  if (length !== null) result.length = length;
  return result;
}

async function readJsonSource(input) {
  if (typeof input.text === 'string') return input.text;
  if (typeof input.path !== 'string' || input.path === '') {
    throw new ApiError(400, 'bad-input', '需要提供 text 或 path');
  }
  let file;
  try {
    file = await fsp.realpath(path.resolve(input.path));
  } catch {
    throw new ApiError(404, 'not-found', 'JSON 文件不存在');
  }
  const stat = await fsp.stat(file);
  if (!stat.isFile()) throw new ApiError(400, 'not-file', '目标不是文件');
  if (stat.size > MAX_JSON_BYTES) {
    throw new ApiError(413, 'json-too-large', `JSON 文件超过 ${Math.round(MAX_JSON_BYTES / 1048576)}MB 上限`);
  }
  const ext = path.extname(file).toLowerCase();
  if (!['.json', '.jsonc', '.txt', '.geojson', '.ndjson'].includes(ext)) {
    throw new ApiError(400, 'bad-json-file', '只读取 .json / .jsonc / .txt / .geojson / .ndjson 文件');
  }
  return fsp.readFile(file, 'utf8');
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
  const dotStyle = String(input.dotStyle || 'square').toLowerCase();
  if (!DOT_STYLES.includes(dotStyle)) {
    throw new ApiError(400, 'bad-dot-style', '码点样式只能是 square / rounded / dot / diamond');
  }
  const eyeStyle = String(input.eyeStyle || 'square').toLowerCase();
  if (!EYE_STYLES.includes(eyeStyle)) {
    throw new ApiError(400, 'bad-eye-style', '码眼样式只能是 square / rounded / circle');
  }
  if (dotStyle === 'diamond' && size < 192) {
    throw new ApiError(400, 'diamond-too-small', '菱形码点在 192px 以下不容易识别，请把像素尺寸调到 192 以上');
  }
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
    dotStyle,
    eyeStyle,
    dark,
    light,
    qr,
    version: qr.version,
    modules,
    total,
    scale,
    offset,
    pixelSize,
    svg: renderSvg(qr.modules, margin, pixelSize, scale, offset, dark, light, dotStyle, eyeStyle),
  };
}

function isEyeCell(row, col, size) {
  return (row < 7 && col < 7)
    || (row < 7 && col >= size - 7)
    || (row >= size - 7 && col < 7);
}

function renderSvg(matrix, margin, pixelSize, scale, offset, dark, light, dotStyle, eyeStyle) {
  const size = matrix.size;
  const round = (value) => Number(value.toFixed(3));
  const cells = [];

  if (dotStyle === 'square') {
    for (let row = 0; row < size; row++) {
      let col = 0;
      while (col < size) {
        if (!matrix.get(row, col) || isEyeCell(row, col, size)) {
          col++;
          continue;
        }
        const start = col;
        while (col < size && matrix.get(row, col) && !isEyeCell(row, col, size)) col++;
        cells.push(`<rect x="${start + margin}" y="${row + margin}" width="${col - start}" height="1"/>`);
      }
    }
  } else {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!matrix.get(row, col) || isEyeCell(row, col, size)) continue;
        const x = col + margin;
        const y = row + margin;
        if (dotStyle === 'rounded') {
          cells.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.3"/>`);
        } else if (dotStyle === 'dot') {
          cells.push(`<circle cx="${round(x + 0.5)}" cy="${round(y + 0.5)}" r="0.48"/>`);
        } else {
          cells.push(`<path d="M ${round(x + 0.5)} ${y} L ${x + 1} ${round(y + 0.5)} L ${round(x + 0.5)} ${y + 1} L ${x} ${round(y + 0.5)} Z"/>`);
        }
      }
    }
  }

  const eyes = [[0, 0], [0, size - 7], [size - 7, 0]].map(([row, col]) => {
    const x = col + margin;
    const y = row + margin;
    if (eyeStyle === 'circle') {
      return `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3.5"/>`
        + `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="2.5" fill="${light.hex}"/>`
        + `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5"/>`;
    }
    const outer = eyeStyle === 'rounded' ? ' rx="1.8"' : '';
    const inner = eyeStyle === 'rounded' ? ' rx="1.2"' : '';
    const center = eyeStyle === 'rounded' ? ' rx="0.7"' : '';
    return `<rect x="${x}" y="${y}" width="7" height="7"${outer}/>`
      + `<rect x="${x + 1}" y="${y + 1}" width="5" height="5"${inner} fill="${light.hex}"/>`
      + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3"${center}/>`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}" shape-rendering="geometricPrecision">`,
    `<rect width="${pixelSize}" height="${pixelSize}" fill="${light.hex}"/>`,
    `<g fill="${dark.hex}" transform="translate(${offset} ${offset}) scale(${scale})">${cells.join('')}${eyes.join('')}</g>`,
    '</svg>',
  ].join('');
}

function paintPixel(raw, stride, width, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= width || y >= width || alpha <= 0) return;
  const index = y * stride + 1 + x * 3;
  const a = Math.min(1, alpha);
  raw[index] = Math.round(raw[index] * (1 - a) + color.r * a);
  raw[index + 1] = Math.round(raw[index + 1] * (1 - a) + color.g * a);
  raw[index + 2] = Math.round(raw[index + 2] * (1 - a) + color.b * a);
}

function paintShape(raw, stride, width, x0, y0, w, h, color, inside) {
  const samples = 3;
  const total = samples * samples;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          if (inside(x0 + px + (sx + 0.5) / samples, y0 + py + (sy + 0.5) / samples)) hits++;
        }
      }
      if (hits > 0) paintPixel(raw, stride, width, x0 + px, y0 + py, color, hits / total);
    }
  }
}

function paintSquare(raw, stride, width, x0, y0, size, color) {
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) paintPixel(raw, stride, width, x0 + px, y0 + py, color, 1);
  }
}

function paintRoundedRect(raw, stride, width, x0, y0, w, h, radius, color) {
  if (radius <= 0) {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) paintPixel(raw, stride, width, x0 + px, y0 + py, color, 1);
    }
    return;
  }
  const r = Math.min(radius, w / 2, h / 2);
  paintShape(raw, stride, width, x0, y0, w, h, color, (ax, ay) => {
    const px = ax - x0;
    const py = ay - y0;
    if (px < 0 || py < 0 || px > w || py > h) return false;
    const dx = Math.abs(px - w / 2) - (w / 2 - r);
    const dy = Math.abs(py - h / 2) - (h / 2 - r);
    const ox = Math.max(dx, 0);
    const oy = Math.max(dy, 0);
    return ox * ox + oy * oy <= r * r;
  });
}

function paintCircle(raw, stride, width, cx, cy, radius, color) {
  const x0 = Math.floor(cx - radius);
  const y0 = Math.floor(cy - radius);
  const w = Math.ceil(cx + radius) - x0;
  const h = Math.ceil(cy + radius) - y0;
  paintShape(raw, stride, width, x0, y0, w, h, color, (ax, ay) => {
    const dx = ax - cx;
    const dy = ay - cy;
    return dx * dx + dy * dy <= radius * radius;
  });
}

function paintDiamond(raw, stride, width, cx, cy, half, color) {
  const x0 = Math.floor(cx - half);
  const y0 = Math.floor(cy - half);
  const w = Math.ceil(cx + half) - x0;
  const h = Math.ceil(cy + half) - y0;
  paintShape(raw, stride, width, x0, y0, w, h, color, (ax, ay) => (
    Math.abs(ax - cx) + Math.abs(ay - cy) <= half
  ));
}

function paintEye(raw, stride, width, x, y, unit, style, dark, light) {
  const span = unit * 7;
  if (style === 'circle') {
    const cx = x + span / 2;
    const cy = y + span / 2;
    paintCircle(raw, stride, width, cx, cy, span / 2, dark);
    paintCircle(raw, stride, width, cx, cy, (span / 2) * (5 / 7), light);
    paintCircle(raw, stride, width, cx, cy, (span / 2) * (3 / 7), dark);
    return;
  }
  if (style === 'square') {
    paintSquare(raw, stride, width, x, y, span, dark);
    paintSquare(raw, stride, width, x + unit, y + unit, span - unit * 2, light);
    paintSquare(raw, stride, width, x + unit * 2, y + unit * 2, span - unit * 4, dark);
    return;
  }
  const outerRadius = unit * 1.8;
  const innerRadius = unit * 1.2;
  const centerRadius = unit * 0.7;
  paintRoundedRect(raw, stride, width, x, y, span, span, outerRadius, dark);
  paintRoundedRect(raw, stride, width, x + unit, y + unit, span - unit * 2, span - unit * 2, innerRadius, light);
  paintRoundedRect(raw, stride, width, x + unit * 2, y + unit * 2, span - unit * 4, span - unit * 4, centerRadius, dark);
}

function renderPng(spec) {
  const { scale, offset, dark, light, qr } = spec;
  const dotStyle = spec.dotStyle || 'square';
  const eyeStyle = spec.eyeStyle || 'square';
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

  const size = qr.modules.size;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!qr.modules.get(row, col) || isEyeCell(row, col, size)) continue;
      const x = offset + (col + spec.margin) * scale;
      const y = offset + (row + spec.margin) * scale;
      if (dotStyle === 'square') {
        paintSquare(raw, stride, width, x, y, scale, dark);
      } else if (dotStyle === 'rounded') {
        paintRoundedRect(raw, stride, width, x, y, scale, scale, scale * 0.28, dark);
      } else if (dotStyle === 'dot') {
        paintCircle(raw, stride, width, x + scale / 2, y + scale / 2, scale * 0.48, dark);
      } else {
        paintDiamond(raw, stride, width, x + scale / 2, y + scale / 2, scale / 2, dark);
      }
    }
  }

  for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    paintEye(
      raw,
      stride,
      width,
      offset + (col + spec.margin) * scale,
      offset + (row + spec.margin) * scale,
      scale,
      eyeStyle,
      dark,
      light,
    );
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
      : kind === 'compress'
        ? [['compress', COMPRESS_DIR]]
        : [['shot', SHOT_DIR], ['qr', QR_DIR], ['compress', COMPRESS_DIR]];
  const items = [];
  for (const [itemKind, dir] of sources) {
    let names;
    try {
      names = await fsp.readdir(dir);
    } catch {
      continue;
    }
    const exts = itemKind === 'compress' ? ['.png', '.jpg', '.jpeg', '.webp'] : ['.png'];
    for (const fileName of names) {
      const lower = fileName.toLowerCase();
      if (!exts.some((ext) => lower.endsWith(ext))) continue;
      const full = path.join(dir, fileName);
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat?.isFile()) continue;
      const dims = lower.endsWith('.png') ? await pngDimensions(full) : await imageDimensions(full);
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
      '用 macOS 原生截图抓屏并把 PNG 存到「下载/码叮工具箱/截图」。' +
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
      '把文字/网址/Wi-Fi/邮箱等内容生成二维码，保存在「下载/码叮工具箱/二维码」，同时输出 PNG 和 SVG。' +
      '支持纠错级别 L/M/Q/H、像素尺寸 128-2048、静区 0-8 模块、前景/背景色（#RRGGBB），' +
      '以及码点样式 square/rounded/dot/diamond（方块/圆角/圆点/菱形）和码眼样式 square/rounded/circle（方块/圆角/圆形）。',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '二维码内容。' },
        size: { type: 'integer', minimum: 128, maximum: 2048, description: '目标像素尺寸，默认 512。' },
        ecc: { type: 'string', enum: ['L', 'M', 'Q', 'H'], description: '纠错级别，默认 M。' },
        margin: { type: 'integer', minimum: 0, maximum: 8, description: '静区宽度（模块数），默认 4。' },
        dotStyle: { type: 'string', enum: DOT_STYLES, description: '码点样式：方块 / 圆角 / 圆点 / 菱形，默认方块。' },
        eyeStyle: { type: 'string', enum: EYE_STYLES, description: '码眼样式：方块 / 圆角 / 圆形，默认方块。' },
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
          dotStyle: { type: 'string' },
          eyeStyle: { type: 'string' },
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
            `样式：码点 ${DOT_STYLE_NAMES[v.dotStyle] || '方块'} · 码眼 ${EYE_STYLE_NAMES[v.eyeStyle] || '方块'}`,
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
        dotStyle: item.dotStyle,
        eyeStyle: item.eyeStyle,
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

function compressTool() {
  return {
    name: 'mading_compress',
    description:
      '用 macOS 系统 sips 压缩本地图片：可调 JPEG 质量与最长边，输出到「下载/码叮工具箱/压缩」。' +
      '支持 PNG / JPEG / WebP / HEIC / TIFF / BMP 输入；GIF 会丢动画，入口会拒绝。' +
      'format=auto 时 PNG 保持 PNG、其余转 JPEG。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '本地图片绝对路径。' },
        quality: { type: 'integer', minimum: 1, maximum: 100, description: 'JPEG 质量，默认 78。' },
        maxEdge: { type: 'integer', minimum: 0, maximum: 12000, description: '最长边像素；0 表示不缩放。' },
        format: { type: 'string', enum: ['auto', 'jpeg', 'png'], description: '输出格式，默认 auto。' },
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
          width: { type: 'number' },
          height: { type: 'number' },
          size: { type: 'number' },
          originalSize: { type: 'number' },
          saved: { type: 'number' },
          ratio: { type: 'number' },
          format: { type: 'string' },
        },
        required: ['ok', 'path'],
      },
      render(_args, value) {
        const v = value || {};
        const ratioText = v.ratio > 0 ? `节省 ${v.ratio}%` : v.ratio < 0 ? `增大 ${Math.abs(v.ratio)}%` : '大小基本不变';
        return [{
          type: 'text',
          text: [
            `压缩完成：${v.path || ''}`,
            `尺寸：${v.width || '?'} × ${v.height || '?'}`,
            `大小：${formatBytes(v.originalSize)} → ${formatBytes(v.size)}（${ratioText}）`,
            `格式：${v.format || 'auto'}`,
          ].join('\n'),
        }];
      },
    },
    timeoutMs: COMPRESS_TIMEOUT_MS + 30000,
    execute: async (args) => {
      const result = await compressImage(args);
      return {
        ok: true,
        path: result.item.path,
        name: result.item.name,
        width: result.item.width,
        height: result.item.height,
        size: result.item.size,
        originalSize: result.original.size,
        saved: result.saved,
        ratio: result.ratio,
        format: result.format,
      };
    },
  };
}

function jsonTool() {
  return {
    name: 'mading_json',
    description:
      '校验、格式化或压缩 JSON，不联网。可直接传 text，也可传本地 .json/.jsonc/.txt/.geojson 文件路径。' +
      'action=format 输出 2/4 空格或 tab 缩进；minify 去掉所有空白；validate 只检查并给出行列位置。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['format', 'minify', 'validate'], description: '操作，默认 format。' },
        text: { type: 'string', description: 'JSON 文本；与 path 二选一，text 优先。' },
        path: { type: 'string', description: '本地 JSON 文件路径。' },
        indent: { type: 'string', enum: ['2', '4', 'tab'], description: 'format 的缩进，默认 2。' },
      },
      required: [],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          valid: { type: 'boolean' },
          action: { type: 'string' },
          output: { type: 'string' },
          inputBytes: { type: 'number' },
          bytes: { type: 'number' },
          lines: { type: 'number' },
          type: { type: 'string' },
          keys: { type: 'number' },
          length: { type: 'number' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              line: { type: 'number' },
              column: { type: 'number' },
              position: { type: 'number' },
            },
          },
        },
        required: ['ok', 'valid'],
      },
      render(_args, value) {
        const v = value || {};
        if (!v.valid) {
          const where = v.error?.line ? `（第 ${v.error.line} 行第 ${v.error.column} 列）` : '';
          return [{ type: 'text', text: `JSON 不合法${where}：${v.error?.message || '解析失败'}` }];
        }
        if (v.action === 'validate') {
          return [{ type: 'text', text: `JSON 合法：${v.type || '?'}${v.keys != null ? `，${v.keys} 个键` : ''}${v.length != null ? `，${v.length} 项` : ''}，${v.bytes} 字节` }];
        }
        const body = String(v.output || '');
        const clipped = body.length > 4000 ? `${body.slice(0, 4000)}\n…（已截断）` : body;
        return [{ type: 'text', text: `${v.action === 'minify' ? '最小化' : '格式化'}完成：${v.lines} 行 · ${v.bytes} 字节\n\n${clipped}` }];
      },
    },
    timeoutMs: 30000,
    execute: async (args) => {
      const text = await readJsonSource(args);
      const result = transformJson(text, args);
      return result;
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
