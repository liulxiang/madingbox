/**
 * 码叮工具箱 · Client half
 * 侧栏入口 + 主面板。React 直接渲染进 slot，不套 iframe，全部使用 DSH 主题 token。
 */
window.__ModuleLoader__.load({
  id: 'dsh-mading-toolbox',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    const DOMAIN = 'mading-toolbox';
    const API = '/mading-toolbox/api';
    const PANEL_ID = 'mading-toolbox';
    const REPO_URL = 'https://github.com/liulxiang/madingbox.git';

    const zh = {
      'nav.label': '码叮工具箱',
      'app.title': '码叮工具箱',
      'app.subtitle': '四件小工具，全部在本机完成',
      'app.source': '开源地址',
      'app.sourceHint': '在 GitHub 上查看源码（liulxiang/madingbox）',
      'app.phase': '本地工具箱',
      'tab.shot': '截图',
      'tab.qr': '二维码',
      'tab.compress': '图片压缩',
      'tab.json': 'JSON',
      'shot.title': '截一张图',
      'shot.mode': '截图方式',
      'shot.screen': '全屏',
      'shot.screenDesc': '主显示器整屏',
      'shot.region': '区域',
      'shot.regionDesc': '拖拽框选一块',
      'shot.window': '窗口',
      'shot.windowDesc': '点选一个窗口',
      'shot.delay': '延迟（秒）',
      'shot.cursor': '包含鼠标指针',
      'shot.filename': '文件名',
      'shot.filenamePlaceholder': '可选，留空自动命名',
      'shot.capture': '开始截图',
      'shot.capturing': '等待系统截图…',
      'shot.hint': '区域与窗口模式会打开系统截图面板，按 Esc 取消。',
      'shot.history': '最近截图',
      'shot.empty': '还没有截图。选一种方式，截第一张。',
      'qr.title': '做一个二维码',
      'qr.content': '内容',
      'qr.placeholder': '网址、文字、联系方式……都可以',
      'qr.size': '像素尺寸',
      'qr.ecc': '纠错级别',
      'qr.margin': '静区（模块）',
      'qr.dotStyle': '码点样式',
      'qr.eyeStyle': '码眼样式',
      'qr.style.square': '方块',
      'qr.style.rounded': '圆角',
      'qr.style.dot': '圆点',
      'qr.style.diamond': '菱形',
      'qr.style.circle': '圆形',
      'qr.dark': '前景色',
      'qr.light': '背景色',
      'qr.save': '保存 PNG + SVG',
      'qr.saving': '保存中…',
      'qr.decode': '识别图片',
      'qr.decoding': '识别中…',
      'qr.decoded': '识别结果',
      'qr.noCode': '这张图片里没有识别到二维码',
      'qr.copy': '复制',
      'qr.use': '填入',
      'toast.copiedText': '文本已复制',
      'qr.preview': '预览',
      'qr.previewEmpty': '左边输入内容，这里会实时出现二维码。',
      'qr.version': '版本',
      'qr.history': '最近二维码',
      'qr.empty': '还没有二维码。',
      'qr.saved': '已保存',
      'compress.title': '压缩一张图',
      'compress.pick': '选择图片',
      'compress.path': '图片路径',
      'compress.pathPlaceholder': '绝对路径，或点「选择图片」',
      'compress.format': '输出格式',
      'compress.auto': '自动',
      'compress.quality': 'JPEG 质量',
      'compress.maxEdge': '最长边',
      'compress.noResize': '不缩放',
      'compress.run': '开始压缩',
      'compress.running': '压缩中…',
      'compress.history': '最近压缩',
      'compress.empty': '还没有压缩过图片。',
      'compress.result': '压缩结果',
      'compress.original': '原图',
      'compress.output': '输出',
      'compress.saved': '节省',
      'compress.grew': '增大',
      'compress.same': '基本不变',
      'compress.unsupported': '当前系统没有 sips，无法压缩图片',
      'compress.hint': '支持 PNG / JPEG / WebP / HEIC / TIFF / BMP；GIF 会丢动画，暂不支持。',
      'compress.noFile': '还没有选择图片。',
      'compress.done': '压缩完成',
      'compress.dimensions': '尺寸',
      'compress.formatLabel': '格式',
      'compress.ratioLabel': '体积变化',
      'toast.compressed': '图片已压缩',
      'json.title': 'JSON 格式化',
      'json.input': '输入',
      'json.placeholder': '把 JSON 粘贴到这里……',
      'json.action': '操作',
      'json.format': '格式化',
      'json.minify': '最小化',
      'json.validate': '校验',
      'json.indent': '缩进',
      'json.twoSpaces': '2 空格',
      'json.fourSpaces': '4 空格',
      'json.tab': 'Tab',
      'json.output': '输出',
      'json.copy': '复制结果',
      'json.valid': 'JSON 合法',
      'json.invalid': 'JSON 不合法',
      'json.empty': '先输入一段 JSON。',
      'json.stats': '统计',
      'json.lines': '行',
      'json.keys': '键',
      'json.items': '项',
      'json.done': '处理完成',
      'json.errorAt': '出错位置',
      'json.validOf': '解析通过',
      'toast.copiedJson': 'JSON 已复制',
      'action.reveal': '在访达中显示',
      'action.copy': '复制图片',
      'action.download': '下载',
      'action.close': '关闭',
      'action.openFolder': '打开输出目录',
      'action.view': '查看大图',
      'action.retry': '重试',
      'state.ready': '就绪',
      'state.offline': 'Host 未连接',
      'state.unsupported': '当前系统不支持截图',
      'toast.savedShot': '截图已保存',
      'toast.savedQr': '二维码已保存',
      'toast.cancelled': '已取消截图',
      'toast.copied': '图片已复制到剪贴板',
      'toast.revealed': '已在访达中显示',
      'error.history': '历史记录读取失败',
      'error.generic': '操作失败',
      'common.optional': '可选',
      'common.pixels': '像素',
      'common.modules': '模块',
      'common.bytes': '字节',
      'common.loading': '加载中…',
    };

    const en = {
      'nav.label': 'Mading Toolbox',
      'app.title': 'Mading Toolbox',
      'app.subtitle': 'Four small tools, all on your Mac',
      'app.source': 'Source',
      'app.sourceHint': 'View source on GitHub (liulxiang/madingbox)',
      'app.phase': 'Local toolbox',
      'tab.shot': 'Screenshot',
      'tab.qr': 'QR code',
      'tab.compress': 'Compress',
      'tab.json': 'JSON',
      'shot.title': 'Take a screenshot',
      'shot.mode': 'Capture mode',
      'shot.screen': 'Screen',
      'shot.screenDesc': 'Main display',
      'shot.region': 'Region',
      'shot.regionDesc': 'Drag to select',
      'shot.window': 'Window',
      'shot.windowDesc': 'Click a window',
      'shot.delay': 'Delay (seconds)',
      'shot.cursor': 'Include cursor',
      'shot.filename': 'File name',
      'shot.filenamePlaceholder': 'Optional, auto-named if empty',
      'shot.capture': 'Capture',
      'shot.capturing': 'Waiting for capture…',
      'shot.hint': 'Region and window modes open the system capture panel. Press Esc to cancel.',
      'shot.history': 'Recent screenshots',
      'shot.empty': 'No screenshots yet. Pick a mode to take the first one.',
      'qr.title': 'Create a QR code',
      'qr.content': 'Content',
      'qr.placeholder': 'A URL, some text, contact details — anything',
      'qr.size': 'Pixel size',
      'qr.ecc': 'Error correction',
      'qr.margin': 'Quiet zone (modules)',
      'qr.dotStyle': 'Dot style',
      'qr.eyeStyle': 'Eye style',
      'qr.style.square': 'Square',
      'qr.style.rounded': 'Rounded',
      'qr.style.dot': 'Dot',
      'qr.style.diamond': 'Diamond',
      'qr.style.circle': 'Circle',
      'qr.dark': 'Foreground',
      'qr.light': 'Background',
      'qr.save': 'Save PNG + SVG',
      'qr.saving': 'Saving…',
      'qr.decode': 'Scan image',
      'qr.decoding': 'Scanning…',
      'qr.decoded': 'Scan result',
      'qr.noCode': 'No QR code found in that image',
      'qr.copy': 'Copy',
      'qr.use': 'Use it',
      'toast.copiedText': 'Text copied',
      'qr.preview': 'Preview',
      'qr.previewEmpty': 'Type on the left and the QR code appears here.',
      'qr.version': 'Version',
      'qr.history': 'Recent QR codes',
      'qr.empty': 'No QR codes yet.',
      'qr.saved': 'Saved',
      'compress.title': 'Compress an image',
      'compress.pick': 'Choose image',
      'compress.path': 'Image path',
      'compress.pathPlaceholder': 'Absolute path, or choose an image',
      'compress.format': 'Output format',
      'compress.auto': 'Auto',
      'compress.quality': 'JPEG quality',
      'compress.maxEdge': 'Longest edge',
      'compress.noResize': 'No resize',
      'compress.run': 'Compress',
      'compress.running': 'Compressing…',
      'compress.history': 'Recent compressions',
      'compress.empty': 'No compressed images yet.',
      'compress.result': 'Result',
      'compress.original': 'Original',
      'compress.output': 'Output',
      'compress.saved': 'Saved',
      'compress.grew': 'Grew',
      'compress.same': 'About the same',
      'compress.unsupported': 'sips is not available on this system',
      'compress.hint': 'PNG / JPEG / WebP / HEIC / TIFF / BMP. GIF is not supported because it would lose animation.',
      'compress.noFile': 'No image selected yet.',
      'compress.done': 'Compressed',
      'compress.dimensions': 'Dimensions',
      'compress.formatLabel': 'Format',
      'compress.ratioLabel': 'Size change',
      'toast.compressed': 'Image compressed',
      'json.title': 'JSON formatter',
      'json.input': 'Input',
      'json.placeholder': 'Paste JSON here…',
      'json.action': 'Action',
      'json.format': 'Format',
      'json.minify': 'Minify',
      'json.validate': 'Validate',
      'json.indent': 'Indent',
      'json.twoSpaces': '2 spaces',
      'json.fourSpaces': '4 spaces',
      'json.tab': 'Tab',
      'json.output': 'Output',
      'json.copy': 'Copy result',
      'json.valid': 'Valid JSON',
      'json.invalid': 'Invalid JSON',
      'json.empty': 'Type some JSON first.',
      'json.stats': 'Stats',
      'json.lines': 'lines',
      'json.keys': 'keys',
      'json.items': 'items',
      'json.done': 'Done',
      'json.errorAt': 'Error at',
      'json.validOf': 'Parse OK',
      'toast.copiedJson': 'JSON copied',
      'action.reveal': 'Show in Finder',
      'action.copy': 'Copy image',
      'action.download': 'Download',
      'action.close': 'Close',
      'action.openFolder': 'Open output folder',
      'action.view': 'View',
      'action.retry': 'Retry',
      'state.ready': 'Ready',
      'state.offline': 'Host offline',
      'state.unsupported': 'Screenshots are not supported here',
      'toast.savedShot': 'Screenshot saved',
      'toast.savedQr': 'QR code saved',
      'toast.cancelled': 'Capture cancelled',
      'toast.copied': 'Image copied to clipboard',
      'toast.revealed': 'Revealed in Finder',
      'error.history': 'Could not load history',
      'error.generic': 'Something went wrong',
      'common.optional': 'Optional',
      'common.pixels': 'px',
      'common.modules': 'modules',
      'common.bytes': 'bytes',
      'common.loading': 'Loading…',
    };

    let translate = (key) => key;
    const t = (key) => {
      const value = translate(key);
      return value === key ? key : value;
    };

    const SHOT_MODES = [
      { id: 'screen', label: 'shot.screen', desc: 'shot.screenDesc' },
      { id: 'region', label: 'shot.region', desc: 'shot.regionDesc' },
      { id: 'window', label: 'shot.window', desc: 'shot.windowDesc' },
    ];
    const SIZES = [256, 384, 512, 768, 1024, 1536, 2048];
    const ECCS = [
      { id: 'L', label: 'L · 7%' },
      { id: 'M', label: 'M · 15%' },
      { id: 'Q', label: 'Q · 25%' },
      { id: 'H', label: 'H · 30%' },
    ];
    const DOT_STYLES = [
      { id: 'square', label: 'qr.style.square' },
      { id: 'rounded', label: 'qr.style.rounded' },
      { id: 'dot', label: 'qr.style.dot' },
      { id: 'diamond', label: 'qr.style.diamond' },
    ];
    const EYE_STYLES = [
      { id: 'square', label: 'qr.style.square' },
      { id: 'rounded', label: 'qr.style.rounded' },
      { id: 'circle', label: 'qr.style.circle' },
    ];

    const CSS = `
.mt-root{height:100%;overflow:auto;padding:26px 30px 48px;color:var(--dsw-alias-label-primary,#111827);background:var(--dsw-alias-bg-layer-2,#f5f6f8);box-sizing:border-box}
.mt-root *{box-sizing:border-box}
.mt-shell{max-width:1120px;margin:0 auto}
.mt-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px}
.mt-logo{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:none;color:#fff;background:linear-gradient(145deg,#4d6bfe,#2740b8);box-shadow:0 8px 20px rgba(48,77,222,.28)}
.mt-headmain{min-width:0;flex:1}
.mt-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-static-deepseek-500,#4d6bfe);font-weight:600;margin-bottom:4px}
.mt-title{font-size:21px;line-height:1.3;font-weight:650;margin:0;letter-spacing:-.01em}
.mt-subtitle{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#8b93a7);margin:4px 0 0}
.mt-sourcelink{display:inline-flex;align-items:center;gap:4px;margin-left:7px;color:var(--dsw-static-deepseek-500,#4d6bfe);text-decoration:none;font-size:12px;font-weight:500;border-radius:4px}
.mt-sourcelink:hover{text-decoration:underline}
.mt-sourcelink:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:2px}
.mt-sourcelink svg{flex:none}
.mt-headside{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.mt-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));background:var(--dsw-alias-bg-layer-1,#fff);font-size:11.5px;color:var(--dsw-alias-label-secondary,#5a6376);max-width:300px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mt-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#16a34a);flex:none}
.mt-dot.off{background:var(--dsw-alias-state-error-primary,#dc2626)}
.mt-linkbtn{border:0;background:transparent;color:var(--dsw-static-deepseek-500,#4d6bfe);font:inherit;font-size:12px;cursor:pointer;padding:4px 2px;border-radius:6px}
.mt-linkbtn:hover{text-decoration:underline}
.mt-linkbtn:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:2px}
.mt-tabs{display:inline-flex;padding:4px;gap:2px;border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));margin-bottom:18px;flex-wrap:wrap}
.mt-tab{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5a6376);font:inherit;font-size:13px;font-weight:550;height:32px;padding:0 16px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s,color .15s}
.mt-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.05))}
.mt-tab.on{background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-primary,#111827)}
.mt-tab:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:1px}
.mt-grid{display:grid;grid-template-columns:minmax(300px,382px) minmax(0,1fr);gap:18px;align-items:start}
.mt-card{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));border-radius:16px;padding:18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.mt-card + .mt-card{margin-top:18px}
.mt-cardhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.mt-cardtitle{font-size:14px;font-weight:600;margin:0;display:flex;align-items:center;gap:8px}
.mt-count{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#8b93a7);background:var(--dsw-alias-bg-layer-2,#f1f3f7);border-radius:999px;padding:2px 7px}
.mt-field{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
.mt-label{font-size:12px;font-weight:550;color:var(--dsw-alias-label-secondary,#5a6376);display:flex;justify-content:space-between;gap:8px}
.mt-opt{font-weight:400;color:var(--dsw-alias-label-tertiary,#9aa2b4)}
.mt-input,.mt-select,.mt-area{width:100%;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary,#111827);background:var(--dsw-alias-bg-layer-2,#f6f7f9);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));border-radius:10px;padding:9px 11px;outline:none;transition:border-color .15s,box-shadow .15s}
.mt-input:focus,.mt-select:focus,.mt-area:focus{border-color:var(--dsw-static-deepseek-500,#4d6bfe);box-shadow:0 0 0 3px rgba(77,107,254,.16)}
.mt-area{resize:vertical;min-height:104px;line-height:1.55;font-family:inherit}
.mt-hint{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#8b93a7)}
.mt-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.mt-mode{appearance:none;font:inherit;text-align:left;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));background:var(--dsw-alias-bg-layer-2,#f7f8fa);color:var(--dsw-alias-label-primary,#111827);border-radius:12px;padding:10px 10px 9px;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
.mt-mode:hover{border-color:var(--dsw-alias-border-l4,rgba(15,23,42,.24))}
.mt-mode:active{transform:scale(.985)}
.mt-mode.on{border-color:var(--dsw-static-deepseek-500,#4d6bfe);background:rgba(77,107,254,.09)}
.mt-mode:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:1px}
.mt-mode-name{display:block;font-size:12.5px;font-weight:600}
.mt-mode-desc{display:block;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8b93a7);margin-top:3px;line-height:1.35}
.mt-row{display:flex;gap:10px}
.mt-row > *{flex:1;min-width:0}
.mt-stylerow{margin-bottom:14px;align-items:flex-start}
.mt-stylerow .mt-field{margin-bottom:0}
.mt-styleopts{display:flex;gap:5px;flex-wrap:wrap}
.mt-styleopt{appearance:none;font:inherit;font-size:11px;line-height:1;display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5a6376);cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.mt-styleopt:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.05))}
.mt-styleopt.on{border-color:var(--dsw-static-deepseek-500,#4d6bfe);color:var(--dsw-static-deepseek-500,#4d6bfe);background:rgba(77,107,254,.09)}
.mt-styleopt:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:1px}
.mt-styleopt svg{flex:none}
.mt-check{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-secondary,#5a6376);cursor:pointer;user-select:none;margin:2px 0 16px}
.mt-check input{width:15px;height:15px;accent-color:var(--dsw-static-deepseek-500,#4d6bfe);margin:0;cursor:pointer}
.mt-btn{appearance:none;font:inherit;font-size:13px;font-weight:600;border-radius:10px;height:38px;padding:0 16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;transition:filter .15s,background .15s,border-color .15s;white-space:nowrap}
.mt-btn.primary{background:var(--dsw-static-deepseek-500,#4d6bfe);color:#fff;width:100%}
.mt-btn.primary:hover:not(:disabled){filter:brightness(1.06)}
.mt-btn.ghost{background:var(--dsw-alias-bg-layer-2,#f4f5f8);border-color:var(--dsw-alias-border-l2,rgba(15,23,42,.1));color:var(--dsw-alias-label-primary,#111827)}
.mt-btn.ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.mt-btn:disabled{opacity:.55;cursor:not-allowed}
.mt-btn:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:2px}
.mt-btn.sm{height:30px;font-size:12px;padding:0 10px;border-radius:8px}
.mt-spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:mt-spin .7s linear infinite;flex:none}
.mt-spinner.dark{border-color:rgba(77,107,254,.2);border-top-color:var(--dsw-static-deepseek-500,#4d6bfe)}
.mt-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.mt-thumb{appearance:none;font:inherit;text-align:left;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));border-radius:12px;background:var(--dsw-alias-bg-layer-2,#f6f7f9);padding:6px;cursor:pointer;overflow:hidden;transition:border-color .15s,transform .1s;min-width:0}
.mt-thumb:hover{border-color:var(--dsw-alias-border-l4,rgba(15,23,42,.3))}
.mt-thumb:active{transform:scale(.99)}
.mt-thumb:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:2px}
.mt-thumbimg{display:block;width:100%;height:118px;object-fit:contain;border-radius:8px;background:repeating-conic-gradient(var(--dsw-alias-bg-layer-1,#fff) 0 25%,var(--dsw-alias-bg-layer-2,#eef0f4) 0 50%) 0 0/16px 16px;image-rendering:auto}
.mt-thumbmeta{display:block;padding:6px 3px 2px}
.mt-thumbname{display:block;font-size:11px;color:var(--dsw-alias-label-primary,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-thumbsub{display:block;font-size:10px;color:var(--dsw-alias-label-tertiary,#9aa2b4);margin-top:2px}
.mt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:34px 12px;color:var(--dsw-alias-label-tertiary,#8b93a7);font-size:12.5px;line-height:1.55;border:1px dashed var(--dsw-alias-border-l2,rgba(15,23,42,.14));border-radius:12px}
.mt-empty svg{opacity:.55}
.mt-previewwrap{position:relative;border-radius:14px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));padding:14px;display:flex;align-items:center;justify-content:center;min-height:300px;transition:background .2s}
.mt-qr{width:100%;max-width:330px;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center}
.mt-qr svg{width:100%;height:100%;display:block;image-rendering:pixelated;border-radius:4px}
.mt-previewloading{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b93a7)}
.mt-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.mt-tag{font-size:10.5px;color:var(--dsw-alias-label-secondary,#5a6376);background:var(--dsw-alias-bg-layer-2,#f3f4f7);border-radius:6px;padding:3px 7px}
.mt-saved{display:flex;align-items:center;gap:9px;margin-top:14px;padding:10px 11px;border-radius:11px;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.22);color:var(--dsw-alias-state-success-primary,#15803d);font-size:12px;font-weight:550}
.mt-savedmain{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mt-decoded{margin-top:14px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));border-radius:12px;background:var(--dsw-alias-bg-layer-2,#f7f8fa);padding:11px}
.mt-decodedhead{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#111827);margin-bottom:8px}
.mt-decodedhead .mt-decodedname{flex:1;min-width:0;font-weight:400;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b93a7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-coderow{border-top:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));padding:8px 0}
.mt-coderow:first-of-type{border-top:0;padding-top:2px}
.mt-code{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-all;color:var(--dsw-alias-label-primary,#111827);max-height:110px;overflow:auto;margin:0 0 6px}
.mt-codeact{display:flex;gap:8px;justify-content:flex-end}
.mt-iconbtn{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5a6376);font:inherit;font-size:11px;border-radius:7px;padding:3px 8px;cursor:pointer}
.mt-iconbtn:hover{color:var(--dsw-alias-label-primary,#111827);border-color:var(--dsw-alias-border-l4,rgba(15,23,42,.28))}
.mt-iconbtn:focus-visible{outline:2px solid var(--dsw-static-deepseek-500,#4d6bfe);outline-offset:1px}
.mt-error{display:flex;gap:8px;align-items:flex-start;margin-bottom:14px;padding:9px 11px;border-radius:10px;background:rgba(220,38,38,.07);border:1px solid rgba(220,38,38,.2);color:var(--dsw-alias-state-error-primary,#b91c1c);font-size:12px;line-height:1.5}
.mt-warn{display:flex;gap:8px;align-items:flex-start;margin-bottom:14px;padding:9px 11px;border-radius:10px;background:rgba(217,119,6,.08);border:1px solid rgba(217,119,6,.22);color:var(--dsw-alias-state-warn-primary,#b45309);font-size:12px;line-height:1.5}
.mt-colorfield{display:flex;align-items:center;gap:8px;background:var(--dsw-alias-bg-layer-2,#f6f7f9);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));border-radius:10px;padding:5px 8px 5px 5px}
.mt-colorfield input[type=color]{width:34px;height:30px;padding:0;border:0;border-radius:7px;background:transparent;cursor:pointer}
.mt-colorhex{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary,#5a6376);text-transform:uppercase}
.mt-range{width:100%;height:22px;accent-color:var(--dsw-static-deepseek-500,#4d6bfe);cursor:pointer}
.mt-fileinfo{display:flex;flex-direction:column;gap:2px;margin:-4px 0 14px;padding:8px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2,#f6f7f9);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08))}
.mt-fileinfoname{font-size:12px;color:var(--dsw-alias-label-primary,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-fileinfosub{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8b93a7)}
.mt-nofile{margin:-4px 0 14px}
.mt-result{margin-top:16px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08))}
.mt-resulthead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:600;margin-bottom:9px}
.mt-resultimg{display:block;width:100%;max-height:220px;object-fit:contain;border-radius:10px;background:repeating-conic-gradient(var(--dsw-alias-bg-layer-1,#fff) 0 25%,var(--dsw-alias-bg-layer-2,#eef0f4) 0 50%) 0 0/16px 16px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08))}
.mt-resultopen{margin-top:9px;padding:0}
.mt-badge{font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:999px;white-space:nowrap}
.mt-badge.ok{color:var(--dsw-alias-state-success-primary,#15803d);background:rgba(22,163,74,.1)}
.mt-badge.bad{color:var(--dsw-alias-state-error-primary,#b91c1c);background:rgba(220,38,38,.09)}
.mt-jsonin{min-height:240px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;white-space:pre;overflow:auto;tab-size:2}
.mt-jsonbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.mt-jsonactions{display:flex;gap:8px;flex-wrap:wrap}
.mt-jsonactions .mt-btn.primary{width:auto}
.mt-inline{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b93a7);white-space:nowrap}
.mt-select-sm{width:auto;padding:4px 7px;font-size:11.5px;border-radius:7px}
.mt-jsonoutwrap{margin-top:4px;border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.1));border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.mt-jsonouthead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 11px;font-size:11.5px;font-weight:550;color:var(--dsw-alias-label-secondary,#5a6376);border-bottom:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));background:var(--dsw-alias-bg-layer-1,#fff)}
.mt-jsonout{margin:0;padding:12px;max-height:380px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.55;white-space:pre;color:var(--dsw-alias-label-primary,#111827);tab-size:2}
.mt-jsonerror{margin-top:0}
.mt-jsonstats{margin-top:10px}
.mt-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(8,11,20,.58);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:28px;animation:mt-fade .16s ease-out}
.mt-modalcard{width:min(860px,100%);max-height:calc(100vh - 56px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;animation:mt-pop .18s ease-out}
.mt-modalhead{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));min-width:0}
.mt-modalname{flex:1;min-width:0;font-size:12.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-modalbody{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(var(--dsw-alias-bg-layer-2,#f5f6f8) 0 25%,var(--dsw-alias-bg-layer-1,#fff) 0 50%) 0 0/20px 20px;padding:18px;overflow:auto}
.mt-modalimg{max-width:100%;max-height:calc(100vh - 240px);object-fit:contain;border-radius:6px;box-shadow:0 8px 26px rgba(0,0,0,.18)}
.mt-modalfoot{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.08));flex-wrap:wrap}
.mt-toast{position:fixed;right:22px;bottom:22px;z-index:2147483100;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none}
.mt-toastitem{pointer-events:auto;max-width:360px;display:flex;align-items:flex-start;gap:9px;padding:10px 13px;border-radius:11px;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12));box-shadow:0 10px 30px rgba(15,23,42,.16);font-size:12.5px;line-height:1.45;color:var(--dsw-alias-label-primary,#111827);animation:mt-slide .2s ease-out}
.mt-toastitem .mt-ic{flex:none;margin-top:1px}
.mt-toastitem.success .mt-ic{color:var(--dsw-alias-state-success-primary,#16a34a)}
.mt-toastitem.error .mt-ic{color:var(--dsw-alias-state-error-primary,#dc2626)}
.mt-toastitem.info .mt-ic{color:var(--dsw-static-deepseek-500,#4d6bfe)}
.mt-skel{height:118px;border-radius:10px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-2,#eef0f4) 25%,var(--dsw-alias-bg-layer-1,#f8f9fb) 37%,var(--dsw-alias-bg-layer-2,#eef0f4) 63%);background-size:400% 100%;animation:mt-shimmer 1.3s ease infinite}
@keyframes mt-spin{to{transform:rotate(360deg)}}
@keyframes mt-fade{from{opacity:0}to{opacity:1}}
@keyframes mt-pop{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@keyframes mt-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mt-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
@media(max-width:820px){.mt-grid{grid-template-columns:1fr}.mt-root{padding:18px 16px 36px}.mt-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.mt-gallery{grid-template-columns:1fr}.mt-headside{display:none}}
`;

    /* ------------------------------------------------------------ icons */

    function svg(props, children) {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          width: props.size || 20,
          height: props.size || 20,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: props.strokeWidth || 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          className: props.className,
        },
        children,
      );
    }

    function ToolboxIcon({ size = 24 }) {
      return svg(
        { size },
        h('rect', { x: 3, y: 7.5, width: 18, height: 12.5, rx: 3 }),
        h('path', { d: 'M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5' }),
        h('path', { d: 'M3 12.5h18' }),
        h('rect', { x: 7, y: 14.2, width: 2.8, height: 2.8, rx: 0.6, fill: 'currentColor', stroke: 'none' }),
        h('path', { d: 'M14 14.2h3v2.8h-3z', fill: 'currentColor', stroke: 'none' }),
      );
    }

    function CameraIcon({ size = 20 }) {
      return svg(
        { size },
        h('path', { d: 'M4 9a2.5 2.5 0 0 1 2.5-2.5h1.1l.9-1.5h6l.9 1.5h1.1A2.5 2.5 0 0 1 20 9v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z' }),
        h('circle', { cx: 12, cy: 12.7, r: 3.1 }),
      );
    }

    function QrIcon({ size = 20 }) {
      return svg(
        { size },
        h('rect', { x: 3.5, y: 3.5, width: 6, height: 6, rx: 1 }),
        h('rect', { x: 14.5, y: 3.5, width: 6, height: 6, rx: 1 }),
        h('rect', { x: 3.5, y: 14.5, width: 6, height: 6, rx: 1 }),
        h('path', { d: 'M14.5 14.5h2.6v2.6h-2.6zM18.4 18.4h2.1v2.1h-2.1z' }),
      );
    }

    function DotStyleGlyph({ style, size = 16 }) {
      const solid = { fill: 'currentColor', stroke: 'none' };
      if (style === 'rounded') {
        return svg({ size }, h('rect', { x: 6, y: 6, width: 12, height: 12, rx: 3.6, ...solid }));
      }
      if (style === 'dot') {
        return svg({ size }, h('circle', { cx: 12, cy: 12, r: 6, ...solid }));
      }
      if (style === 'diamond') {
        return svg({ size }, h('polygon', { points: '12,4 20,12 12,20 4,12', ...solid }));
      }
      return svg({ size }, h('rect', { x: 6, y: 6, width: 12, height: 12, ...solid }));
    }

    function EyeStyleGlyph({ style, size = 16 }) {
      const solid = { fill: 'currentColor', stroke: 'none' };
      if (style === 'circle') {
        return svg(
          { size, strokeWidth: 2.4 },
          h('circle', { cx: 12, cy: 12, r: 9 }),
          h('circle', { cx: 12, cy: 12, r: 3.2, ...solid }),
        );
      }
      return svg(
        { size, strokeWidth: 2.4 },
        h('rect', { x: 3, y: 3, width: 18, height: 18, rx: style === 'rounded' ? 5 : 0 }),
        h('rect', { x: 9, y: 9, width: 6, height: 6, rx: style === 'rounded' ? 1.8 : 0, ...solid }),
      );
    }

    function StyleOptions({ kind, options, value, onChange, label }) {
      return h(
        'div',
        { className: 'mt-styleopts', role: 'group', 'aria-label': label },
        options.map((item) =>
          h(
            'button',
            {
              key: item.id,
              type: 'button',
              className: `mt-styleopt${value === item.id ? ' on' : ''}`,
              'aria-pressed': value === item.id,
              title: t(item.label),
              onClick: () => onChange(item.id),
            },
            kind === 'dot'
              ? h(DotStyleGlyph, { style: item.id, size: 15 })
              : h(EyeStyleGlyph, { style: item.id, size: 15 }),
            h('span', null, t(item.label)),
          ),
        ),
      );
    }

    function FolderIcon({ size = 16 }) {
      return svg(
        { size },
        h('path', { d: 'M3.5 7.5a2 2 0 0 1 2-2h3l1.6 1.8h6.4a2 2 0 0 1 2 2v6.7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z' }),
      );
    }

    function GithubIcon({ size = 14 }) {
      return svg(
        { size },
        h('path', {
          d: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .3z',
          fill: 'currentColor',
          stroke: 'none',
        }),
      );
    }

    function CopyIcon({ size = 16 }) {
      return svg(
        { size },
        h('rect', { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2 }),
        h('path', { d: 'M6 15.5H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V6.5' }),
      );
    }

    function DownloadIcon({ size = 16 }) {
      return svg(
        { size },
        h('path', { d: 'M12 4v10.5' }),
        h('path', { d: 'm7.6 10.4 4.4 4.4 4.4-4.4' }),
        h('path', { d: 'M5 19.5h14' }),
      );
    }

    function XIcon({ size = 16 }) {
      return svg({ size }, h('path', { d: 'm6 6 12 12M18 6 6 18' }));
    }

    function CheckIcon({ size = 15 }) {
      return svg({ size }, h('path', { d: 'm4.5 12.5 4.6 4.6L19.5 6.7' }));
    }

    function AlertIcon({ size = 15 }) {
      return svg(
        { size },
        h('circle', { cx: 12, cy: 12, r: 8.5 }),
        h('path', { d: 'M12 7.7v5.2M12 16.4h.01' }),
      );
    }

    function ImageIcon({ size = 26 }) {
      return svg(
        { size },
        h('rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.5 }),
        h('circle', { cx: 8.8, cy: 9.5, r: 1.5 }),
        h('path', { d: 'm4.5 17 4.8-4.8 3.2 3.2 2.6-2.6 4.4 4.4' }),
      );
    }

    function CompressIcon({ size = 20 }) {
      return svg(
        { size },
        h('path', { d: 'M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9' }),
        h('path', { d: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9' }),
        h('path', { d: 'M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15' }),
        h('path', { d: 'M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15' }),
        h('path', { d: 'm9.4 9.4-2.6-2.6M14.6 9.4l2.6-2.6M14.6 14.6l2.6 2.6M9.4 14.6l-2.6 2.6' }),
      );
    }

    function JsonIcon({ size = 20 }) {
      return svg(
        { size },
        h('path', { d: 'M9 4.5H7.8A1.8 1.8 0 0 0 6 6.3v3.2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3.2a1.8 1.8 0 0 0 1.8 1.8H9' }),
        h('path', { d: 'M15 4.5h1.2A1.8 1.8 0 0 1 18 6.3v3.2a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3.2a1.8 1.8 0 0 1-1.8 1.8H15' }),
        h('path', { d: 'M12 8.2v7.6' }),
      );
    }

    /* -------------------------------------------------------------- api */

    async function api(path, options = {}) {
      const init = { ...options };
      if (init.body !== undefined) {
        init.headers = { 'content-type': 'application/json', ...(init.headers || {}) };
      }
      const res = await fetch(`${API}${path}`, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const message = data?.error?.message || `${t('error.generic')}（${res.status}）`;
        const error = new Error(message);
        error.status = res.status;
        throw error;
      }
      return data;
    }

    function formatBytes(bytes) {
      const n = Number(bytes) || 0;
      if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
      if (n >= 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
      return `${n} B`;
    }

    function formatTime(ms) {
      try {
        return new Date(ms).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return '';
      }
    }

    async function copyText(value) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
        area.remove();
        return ok;
      }
    }

    /* --------------------------------------------------------- components */

    function Field({ label, hint, optional, children }) {
      return h(
        'div',
        { className: 'mt-field' },
        h(
          'span',
          { className: 'mt-label' },
          h('span', null, label),
          optional ? h('span', { className: 'mt-opt' }, t('common.optional')) : null,
        ),
        children,
        hint ? h('span', { className: 'mt-hint' }, hint) : null,
      );
    }

    function Thumb({ item, onOpen }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'mt-thumb',
          onClick: () => onOpen(item),
          title: item.name,
        },
        h('img', { className: 'mt-thumbimg', src: item.url, alt: item.name, loading: 'lazy', decoding: 'async' }),
        h(
          'span',
          { className: 'mt-thumbmeta' },
          h('span', { className: 'mt-thumbname' }, item.name),
          h(
            'span',
            { className: 'mt-thumbsub' },
            `${item.width || '?'} × ${item.height || '?'} · ${formatBytes(item.size)}`,
          ),
        ),
      );
    }

    function HistoryCard({ kind, items, loading, error, onOpen, onRetry }) {
      const isShot = kind === 'shot';
      const isQr = kind === 'qr';
      const titleKey = isShot ? 'shot.history' : isQr ? 'qr.history' : 'compress.history';
      const emptyKey = isShot ? 'shot.empty' : isQr ? 'qr.empty' : 'compress.empty';
      const Icon = isShot ? CameraIcon : isQr ? QrIcon : CompressIcon;
      return h(
        'section',
        { className: 'mt-card', 'aria-label': t(titleKey) },
        h(
          'div',
          { className: 'mt-cardhead' },
          h(
            'h2',
            { className: 'mt-cardtitle' },
            h(Icon, { size: 16 }),
            t(titleKey),
            items.length ? h('span', { className: 'mt-count' }, String(items.length)) : null,
          ),
        ),
        error
          ? h(
              'div',
              { className: 'mt-error' },
              h(AlertIcon),
              h('span', { style: { flex: 1 } }, error),
              h(
                'button',
                { type: 'button', className: 'mt-linkbtn', onClick: onRetry },
                t('action.retry'),
              ),
            )
          : null,
        loading && items.length === 0
          ? h('div', { className: 'mt-gallery' }, h('div', { className: 'mt-skel' }), h('div', { className: 'mt-skel' }))
          : items.length === 0
            ? h(
                'div',
                { className: 'mt-empty' },
                h(ImageIcon),
                h('span', null, t(emptyKey)),
              )
            : h(
                'div',
                { className: 'mt-gallery' },
                items.map((item) => h(Thumb, { key: item.id, item, onOpen })),
              ),
      );
    }

    function ScreenshotPanel({ status, onChanged, notify }) {
      const [mode, setMode] = React.useState('screen');
      const [delay, setDelay] = React.useState(0);
      const [cursor, setCursor] = React.useState(false);
      const [filename, setFilename] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [items, setItems] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [historyError, setHistoryError] = React.useState('');
      const [preview, setPreview] = React.useState(null);

      const supported = !status || Boolean(status.capabilities?.screenshot);

      async function loadHistory() {
        setLoading(true);
        try {
          const data = await api('/history?kind=shot');
          setItems(data.items || []);
          setHistoryError('');
        } catch (err) {
          setHistoryError(err.message || t('error.history'));
        } finally {
          setLoading(false);
        }
      }

      React.useEffect(() => {
        loadHistory();
      }, []);

      React.useEffect(() => {
        if (!preview) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setPreview(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [preview]);

      async function capture() {
        if (busy || !supported) return;
        setBusy(true);
        setError('');
        try {
          const data = await api('/screenshot', {
            method: 'POST',
            body: JSON.stringify({
              mode,
              delay: Number.isFinite(Number(delay)) ? Number(delay) : 0,
              cursor,
              filename,
            }),
          });
          if (data.cancelled) {
            notify(t('toast.cancelled'), 'info');
          } else {
            notify(t('toast.savedShot'), 'success');
            setFilename('');
            await loadHistory();
            if (onChanged) onChanged();
          }
        } catch (err) {
          setError(err.message || t('error.generic'));
          notify(err.message || t('error.generic'), 'error');
        } finally {
          setBusy(false);
        }
      }

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'mt-grid' },
          h(
            'section',
            { className: 'mt-card', 'aria-label': t('shot.title') },
            h(
              'div',
              { className: 'mt-cardhead' },
              h('h2', { className: 'mt-cardtitle' }, h(CameraIcon, { size: 16 }), t('shot.title')),
            ),
            error ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, error)) : null,
            !supported
              ? h('div', { className: 'mt-warn' }, h(AlertIcon), h('span', null, t('state.unsupported')))
              : null,
            h(
              Field,
              { label: t('shot.mode') },
              h(
                'div',
                { className: 'mt-modes' },
                SHOT_MODES.map((item) =>
                  h(
                    'button',
                    {
                      key: item.id,
                      type: 'button',
                      className: `mt-mode${mode === item.id ? ' on' : ''}`,
                      onClick: () => setMode(item.id),
                      'aria-pressed': mode === item.id,
                    },
                    h('span', { className: 'mt-mode-name' }, t(item.label)),
                    h('span', { className: 'mt-mode-desc' }, t(item.desc)),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'mt-row' },
              h(
                Field,
                { label: t('shot.delay') },
                h('input', {
                  type: 'number',
                  className: 'mt-input',
                  min: 0,
                  max: 10,
                  step: 1,
                  value: delay,
                  onChange: (event) => setDelay(Math.max(0, Math.min(10, Number(event.target.value) || 0))),
                }),
              ),
              h(
                Field,
                { label: t('shot.filename'), optional: true },
                h('input', {
                  type: 'text',
                  className: 'mt-input',
                  value: filename,
                  placeholder: t('shot.filenamePlaceholder'),
                  onChange: (event) => setFilename(event.target.value),
                }),
              ),
            ),
            h(
              'label',
              { className: 'mt-check' },
              h('input', { type: 'checkbox', checked: cursor, onChange: (event) => setCursor(event.target.checked) }),
              h('span', null, t('shot.cursor')),
            ),
            h(
              'button',
              { type: 'button', className: 'mt-btn primary', onClick: capture, disabled: busy || !supported },
              busy ? h('span', { className: 'mt-spinner' }) : h(CameraIcon, { size: 17 }),
              busy ? t('shot.capturing') : t('shot.capture'),
            ),
            h('p', { className: 'mt-hint', style: { margin: '10px 0 0' } }, t('shot.hint')),
          ),
          h(HistoryCard, {
            kind: 'shot',
            items,
            loading,
            error: historyError,
            onOpen: setPreview,
            onRetry: loadHistory,
          }),
        ),
        preview ? h(PreviewModal, { item: preview, onClose: () => setPreview(null), notify }) : null,
      );
    }

    function QrPanel({ notify }) {
      const [text, setText] = React.useState('');
      const [size, setSize] = React.useState(512);
      const [ecc, setEcc] = React.useState('M');
      const [margin, setMargin] = React.useState(4);
      const [dotStyle, setDotStyle] = React.useState('square');
      const [eyeStyle, setEyeStyle] = React.useState('square');
      const [dark, setDark] = React.useState('#111827');
      const [light, setLight] = React.useState('#ffffff');
      const [preview, setPreview] = React.useState(null);
      const [previewError, setPreviewError] = React.useState('');
      const [previewBusy, setPreviewBusy] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [saved, setSaved] = React.useState(null);
      const [error, setError] = React.useState('');
      const [items, setItems] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [historyError, setHistoryError] = React.useState('');
      const [modal, setModal] = React.useState(null);
      const [decoding, setDecoding] = React.useState(false);
      const [decoded, setDecoded] = React.useState(null);
      const [decodeError, setDecodeError] = React.useState('');
      const seqRef = React.useRef(0);

      async function loadHistory() {
        setLoading(true);
        try {
          const data = await api('/history?kind=qr');
          setItems(data.items || []);
          setHistoryError('');
        } catch (err) {
          setHistoryError(err.message || t('error.history'));
        } finally {
          setLoading(false);
        }
      }

      React.useEffect(() => {
        loadHistory();
      }, []);

      React.useEffect(() => {
        setSaved(null);
      }, [text, size, ecc, margin, dotStyle, eyeStyle, dark, light]);

      React.useEffect(() => {
        if (!text.trim()) {
          setPreview(null);
          setPreviewError('');
          setPreviewBusy(false);
          return undefined;
        }
        const seq = ++seqRef.current;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
          setPreviewBusy(true);
          try {
            const data = await api('/qr-preview', {
              method: 'POST',
              body: JSON.stringify({ text, size, ecc, margin, dotStyle, eyeStyle, dark, light }),
              signal: controller.signal,
            });
            if (seqRef.current !== seq) return;
            setPreview(data);
            setPreviewError('');
          } catch (err) {
            if (err.name === 'AbortError' || seqRef.current !== seq) return;
            setPreview(null);
            setPreviewError(err.message || t('error.generic'));
          } finally {
            if (seqRef.current === seq) setPreviewBusy(false);
          }
        }, 240);
        return () => {
          clearTimeout(timer);
          controller.abort();
        };
      }, [text, size, ecc, margin, dotStyle, eyeStyle, dark, light]);

      React.useEffect(() => {
        if (!modal) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setModal(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [modal]);

      async function save() {
        if (saving || !text.trim()) return;
        setSaving(true);
        setError('');
        try {
          const data = await api('/qr', {
            method: 'POST',
            body: JSON.stringify({ text, size, ecc, margin, dotStyle, eyeStyle, dark, light }),
          });
          setSaved(data.item);
          notify(t('toast.savedQr'), 'success');
          await loadHistory();
        } catch (err) {
          setError(err.message || t('error.generic'));
          notify(err.message || t('error.generic'), 'error');
        } finally {
          setSaving(false);
        }
      }

      async function decodeImage() {
        if (decoding) return;
        setDecoding(true);
        setDecodeError('');
        try {
          const picked = await api('/pick-image', { method: 'POST', body: '{}' });
          if (picked.cancelled) return;
          const data = await api('/qr-decode', {
            method: 'POST',
            body: JSON.stringify({ path: picked.path }),
          });
          const codes = Array.isArray(data.codes) ? data.codes : [];
          if (!codes.length) {
            setDecoded(null);
            setDecodeError(t('qr.noCode'));
            return;
          }
          setDecoded({ path: data.path, name: data.name, codes });
        } catch (err) {
          setDecoded(null);
          setDecodeError(err.message || t('error.generic'));
        } finally {
          setDecoding(false);
        }
      }

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'mt-grid' },
          h(
            'section',
            { className: 'mt-card', 'aria-label': t('qr.title') },
            h(
              'div',
              { className: 'mt-cardhead' },
              h('h2', { className: 'mt-cardtitle' }, h(QrIcon, { size: 16 }), t('qr.title')),
              h(
                'button',
                { type: 'button', className: 'mt-btn ghost sm', onClick: decodeImage, disabled: decoding },
                decoding ? h('span', { className: 'mt-spinner dark' }) : h(ImageIcon, { size: 14 }),
                decoding ? t('qr.decoding') : t('qr.decode'),
              ),
            ),
            error ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, error)) : null,
            decodeError ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, decodeError)) : null,
            h(
              Field,
              { label: t('qr.content') },
              h('textarea', {
                className: 'mt-area',
                value: text,
                placeholder: t('qr.placeholder'),
                spellCheck: false,
                onChange: (event) => setText(event.target.value),
              }),
            ),
            h(
              'div',
              { className: 'mt-row' },
              h(
                Field,
                { label: t('qr.size') },
                h(
                  'select',
                  {
                    className: 'mt-select',
                    value: size,
                    onChange: (event) => setSize(Number(event.target.value)),
                  },
                  SIZES.map((value) =>
                    h('option', { key: value, value }, `${value} ${t('common.pixels')}`),
                  ),
                ),
              ),
              h(
                Field,
                { label: t('qr.ecc') },
                h(
                  'select',
                  {
                    className: 'mt-select',
                    value: ecc,
                    onChange: (event) => setEcc(event.target.value),
                  },
                  ECCS.map((item) => h('option', { key: item.id, value: item.id }, item.label)),
                ),
              ),
            ),
            h(
              Field,
              { label: t('qr.margin'), hint: '0–8' },
              h('input', {
                type: 'range',
                min: 0,
                max: 8,
                step: 1,
                value: margin,
                onChange: (event) => setMargin(Number(event.target.value)),
                style: { accentColor: 'var(--dsw-static-deepseek-500, #4d6bfe)' },
              }),
            ),
            h(
              'div',
              { className: 'mt-row mt-stylerow' },
              h(
                Field,
                { label: t('qr.dotStyle') },
                h(StyleOptions, {
                  kind: 'dot',
                  options: DOT_STYLES,
                  value: dotStyle,
                  onChange: setDotStyle,
                  label: t('qr.dotStyle'),
                }),
              ),
              h(
                Field,
                { label: t('qr.eyeStyle') },
                h(StyleOptions, {
                  kind: 'eye',
                  options: EYE_STYLES,
                  value: eyeStyle,
                  onChange: setEyeStyle,
                  label: t('qr.eyeStyle'),
                }),
              ),
            ),
            h(
              'div',
              { className: 'mt-row' },
              h(
                Field,
                { label: t('qr.dark') },
                h(
                  'div',
                  { className: 'mt-colorfield' },
                  h('input', {
                    type: 'color',
                    value: dark,
                    onChange: (event) => setDark(event.target.value),
                    'aria-label': t('qr.dark'),
                  }),
                  h('span', { className: 'mt-colorhex' }, dark),
                ),
              ),
              h(
                Field,
                { label: t('qr.light') },
                h(
                  'div',
                  { className: 'mt-colorfield' },
                  h('input', {
                    type: 'color',
                    value: light,
                    onChange: (event) => setLight(event.target.value),
                    'aria-label': t('qr.light'),
                  }),
                  h('span', { className: 'mt-colorhex' }, light),
                ),
              ),
            ),
            h(
              'button',
              { type: 'button', className: 'mt-btn primary', onClick: save, disabled: saving || !text.trim() || !preview },
              saving ? h('span', { className: 'mt-spinner' }) : h(DownloadIcon, { size: 16 }),
              saving ? t('qr.saving') : t('qr.save'),
            ),
            saved
              ? h(
                  'div',
                  { className: 'mt-saved' },
                  h(CheckIcon),
                  h('span', { className: 'mt-savedmain', title: saved.path }, `${t('qr.saved')}：${saved.name}`),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'mt-linkbtn',
                      onClick: async () => {
                        try {
                          await api('/reveal', { method: 'POST', body: JSON.stringify({ path: saved.path }) });
                          notify(t('toast.revealed'), 'success');
                        } catch (err) {
                          notify(err.message, 'error');
                        }
                      },
                    },
                    t('action.reveal'),
                  ),
                )
              : null,
            decoded
              ? h(
                  'div',
                  { className: 'mt-decoded' },
                  h(
                    'div',
                    { className: 'mt-decodedhead' },
                    h(CheckIcon),
                    h('span', null, t('qr.decoded')),
                    h('span', { className: 'mt-decodedname', title: decoded.path }, decoded.name),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'mt-iconbtn',
                        onClick: () => {
                          setDecoded(null);
                          setDecodeError('');
                        },
                      },
                      t('action.close'),
                    ),
                  ),
                  decoded.codes.map((code, index) =>
                    h(
                      'div',
                      { className: 'mt-coderow', key: `${index}-${code.slice(0, 12)}` },
                      h('code', { className: 'mt-code' }, code),
                      h(
                        'div',
                        { className: 'mt-codeact' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'mt-iconbtn',
                            onClick: async () => {
                              const ok = await copyText(code);
                              notify(ok ? t('toast.copiedText') : t('error.generic'), ok ? 'success' : 'error');
                            },
                          },
                          t('qr.copy'),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'mt-iconbtn',
                            onClick: () => setText(code),
                          },
                          t('qr.use'),
                        ),
                      ),
                    ),
                  ),
                )
              : null,
          ),
          h(
            React.Fragment,
            null,
            h(
              'section',
              { className: 'mt-card', 'aria-label': t('qr.preview') },
              h(
                'div',
                { className: 'mt-cardhead' },
                h('h2', { className: 'mt-cardtitle' }, t('qr.preview')),
                preview
                  ? h(
                      'span',
                      { className: 'mt-count' },
                      `${t('qr.version')} ${preview.version} · ${preview.modules}×${preview.modules}`,
                    )
                  : null,
              ),
              previewError ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, previewError)) : null,
              h(
                'div',
                { className: 'mt-previewwrap', style: { background: light } },
                preview
                  ? h('div', { className: 'mt-qr', dangerouslySetInnerHTML: { __html: preview.svg } })
                  : h(
                      'div',
                      { className: 'mt-empty', style: { border: 0, background: 'transparent' } },
                      h(QrIcon, { size: 30 }),
                      h('span', null, t('qr.previewEmpty')),
                    ),
                previewBusy
                  ? h(
                      'span',
                      { className: 'mt-previewloading' },
                      h('span', { className: 'mt-spinner dark' }),
                      t('common.loading'),
                    )
                  : null,
              ),
              preview
                ? h(
                    'div',
                    { className: 'mt-meta' },
                    h('span', { className: 'mt-tag' }, `${preview.width} × ${preview.height} ${t('common.pixels')}`),
                    h('span', { className: 'mt-tag' }, `${preview.bytes} ${t('common.bytes')}`),
                    h('span', { className: 'mt-tag' }, `ECC ${preview.ecc}`),
                  )
                : null,
            ),
            h(HistoryCard, {
              kind: 'qr',
              items,
              loading,
              error: historyError,
              onOpen: setModal,
              onRetry: loadHistory,
            }),
          ),
        ),
        modal ? h(PreviewModal, { item: modal, onClose: () => setModal(null), notify }) : null,
      );
    }

    function CompressPanel({ status, notify }) {
      const [pathText, setPathText] = React.useState('');
      const [info, setInfo] = React.useState(null);
      const [format, setFormat] = React.useState('auto');
      const [quality, setQuality] = React.useState(78);
      const [maxEdge, setMaxEdge] = React.useState(0);
      const [busy, setBusy] = React.useState(false);
      const [result, setResult] = React.useState(null);
      const [error, setError] = React.useState('');
      const [items, setItems] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [historyError, setHistoryError] = React.useState('');
      const [modal, setModal] = React.useState(null);

      const supported = !status || Boolean(status.capabilities?.compress);

      async function loadHistory() {
        setLoading(true);
        try {
          const data = await api('/history?kind=compress');
          setItems(data.items || []);
          setHistoryError('');
        } catch (err) {
          setHistoryError(err.message || t('error.history'));
        } finally {
          setLoading(false);
        }
      }

      React.useEffect(() => {
        loadHistory();
      }, []);

      React.useEffect(() => {
        if (!modal) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setModal(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [modal]);

      async function inspect(raw) {
        setError('');
        try {
          const data = await api('/image-info', { method: 'POST', body: JSON.stringify({ path: raw }) });
          setInfo(data);
        } catch (err) {
          setInfo(null);
          setError(err.message || t('error.generic'));
        }
      }

      async function pick() {
        try {
          const picked = await api('/pick-image', { method: 'POST', body: '{}' });
          if (picked.cancelled) return;
          setPathText(picked.path);
          setResult(null);
          await inspect(picked.path);
        } catch (err) {
          setError(err.message || t('error.generic'));
        }
      }

      async function run() {
        if (busy || !supported) return;
        const source = String(pathText || info?.path || '').trim();
        if (!source) {
          setError(t('compress.noFile'));
          return;
        }
        setBusy(true);
        setError('');
        try {
          const data = await api('/compress', {
            method: 'POST',
            body: JSON.stringify({ path: source, format, quality: Number(quality), maxEdge: Number(maxEdge) }),
          });
          setResult(data);
          notify(t('toast.compressed'), 'success');
          await loadHistory();
        } catch (err) {
          setError(err.message || t('error.generic'));
          notify(err.message || t('error.generic'), 'error');
        } finally {
          setBusy(false);
        }
      }

      const ratio = result ? Number(result.ratio) || 0 : 0;
      const trend = ratio > 0
        ? `${t('compress.saved')} ${ratio}%`
        : ratio < 0
          ? `${t('compress.grew')} ${Math.abs(ratio)}%`
          : t('compress.same');

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'mt-grid' },
          h(
            'section',
            { className: 'mt-card', 'aria-label': t('compress.title') },
            h(
              'div',
              { className: 'mt-cardhead' },
              h('h2', { className: 'mt-cardtitle' }, h(CompressIcon, { size: 16 }), t('compress.title')),
              h(
                'button',
                { type: 'button', className: 'mt-btn ghost sm', onClick: pick, disabled: busy },
                h(ImageIcon, { size: 14 }),
                t('compress.pick'),
              ),
            ),
            !supported ? h('div', { className: 'mt-warn' }, h(AlertIcon), h('span', null, t('compress.unsupported'))) : null,
            error ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, error)) : null,
            h(
              Field,
              { label: t('compress.path'), hint: t('compress.hint') },
              h('input', {
                className: 'mt-input',
                value: pathText,
                placeholder: t('compress.pathPlaceholder'),
                spellCheck: false,
                onChange: (event) => {
                  setPathText(event.target.value);
                  setResult(null);
                },
                onBlur: () => {
                  if (pathText.trim()) inspect(pathText.trim());
                },
              }),
            ),
            info
              ? h(
                  'div',
                  { className: 'mt-fileinfo' },
                  h('span', { className: 'mt-fileinfoname', title: info.path }, info.name),
                  h(
                    'span',
                    { className: 'mt-fileinfosub' },
                    `${info.width || '?'} × ${info.height || '?'} · ${formatBytes(info.size)} · ${String(info.format || '').toUpperCase()}`,
                  ),
                )
              : h('div', { className: 'mt-hint mt-nofile' }, t('compress.noFile')),
            h(
              'div',
              { className: 'mt-row' },
              h(
                Field,
                { label: t('compress.format') },
                h(
                  'select',
                  { className: 'mt-select', value: format, onChange: (event) => setFormat(event.target.value) },
                  h('option', { value: 'auto' }, t('compress.auto')),
                  h('option', { value: 'jpeg' }, 'JPEG'),
                  h('option', { value: 'png' }, 'PNG'),
                ),
              ),
              h(
                Field,
                { label: t('compress.maxEdge') },
                h(
                  'select',
                  { className: 'mt-select', value: maxEdge, onChange: (event) => setMaxEdge(Number(event.target.value)) },
                  h('option', { value: 0 }, t('compress.noResize')),
                  [1280, 1600, 1920, 2560, 3840].map((value) => h('option', { key: value, value }, `${value} px`)),
                ),
              ),
            ),
            h(
              Field,
              { label: `${t('compress.quality')} · ${quality}` },
              h('input', {
                className: 'mt-range',
                type: 'range',
                min: 1,
                max: 100,
                step: 1,
                value: quality,
                onChange: (event) => setQuality(Number(event.target.value)),
              }),
            ),
            h(
              'button',
              { type: 'button', className: 'mt-btn primary', onClick: run, disabled: busy || !supported },
              busy ? h('span', { className: 'mt-spinner' }) : h(CompressIcon, { size: 16 }),
              busy ? t('compress.running') : t('compress.run'),
            ),
            result
              ? h(
                  'div',
                  { className: 'mt-result' },
                  h('div', { className: 'mt-resulthead' }, t('compress.result'), h('span', { className: 'mt-tag' }, trend)),
                  h('img', { className: 'mt-resultimg', src: result.item.url, alt: result.item.name }),
                  h(
                    'div',
                    { className: 'mt-meta' },
                    h('span', { className: 'mt-tag' }, `${result.item.width} × ${result.item.height}`),
                    h('span', { className: 'mt-tag' }, `${formatBytes(result.original.size)} → ${formatBytes(result.item.size)}`),
                    h('span', { className: 'mt-tag' }, String(result.format || '').toUpperCase()),
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'mt-linkbtn mt-resultopen', onClick: () => setModal(result.item) },
                    t('action.view'),
                  ),
                )
              : null,
          ),
          h(HistoryCard, {
            kind: 'compress',
            items,
            loading,
            error: historyError,
            onOpen: setModal,
            onRetry: loadHistory,
          }),
        ),
        modal ? h(PreviewModal, { item: modal, onClose: () => setModal(null), notify }) : null,
      );
    }

    function JsonPanel({ notify }) {
      const [text, setText] = React.useState('');
      const [action, setAction] = React.useState('format');
      const [indent, setIndent] = React.useState('2');
      const [busy, setBusy] = React.useState(false);
      const [result, setResult] = React.useState(null);
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        setResult(null);
      }, [text, indent]);

      async function run(nextAction) {
        if (busy) return;
        if (!text.trim()) {
          setError(t('json.empty'));
          setResult(null);
          return;
        }
        setAction(nextAction);
        setBusy(true);
        setError('');
        try {
          const data = await api('/json', {
            method: 'POST',
            body: JSON.stringify({ text, action: nextAction, indent }),
          });
          setResult(data);
        } catch (err) {
          setError(err.message || t('error.generic'));
          setResult(null);
        } finally {
          setBusy(false);
        }
      }

      async function copyOutput() {
        if (!result?.output) return;
        const ok = await copyText(result.output);
        notify(ok ? t('toast.copiedJson') : t('error.generic'), ok ? 'success' : 'error');
      }

      const invalid = result && !result.valid;
      return h(
        'div',
        { className: 'mt-jsonwrap' },
        h(
          'section',
          { className: 'mt-card', 'aria-label': t('json.title') },
          h(
            'div',
            { className: 'mt-cardhead' },
            h('h2', { className: 'mt-cardtitle' }, h(JsonIcon, { size: 16 }), t('json.title')),
            invalid ? h('span', { className: 'mt-badge bad' }, t('json.invalid')) : result ? h('span', { className: 'mt-badge ok' }, t('json.valid')) : null,
          ),
          error ? h('div', { className: 'mt-error' }, h(AlertIcon), h('span', null, error)) : null,
          h(
            Field,
            { label: t('json.input') },
            h('textarea', {
              className: 'mt-area mt-jsonin',
              value: text,
              placeholder: t('json.placeholder'),
              spellCheck: false,
              onChange: (event) => setText(event.target.value),
            }),
          ),
          h(
            'div',
            { className: 'mt-jsonbar' },
            h(
              'div',
              { className: 'mt-jsonactions' },
              h(
                'button',
                { type: 'button', className: 'mt-btn primary sm', onClick: () => run('format'), disabled: busy },
                busy && action === 'format' ? h('span', { className: 'mt-spinner' }) : null,
                t('json.format'),
              ),
              h(
                'button',
                { type: 'button', className: 'mt-btn ghost sm', onClick: () => run('minify'), disabled: busy },
                t('json.minify'),
              ),
              h(
                'button',
                { type: 'button', className: 'mt-btn ghost sm', onClick: () => run('validate'), disabled: busy },
                t('json.validate'),
              ),
            ),
            h(
              'label',
              { className: 'mt-inline' },
              t('json.indent'),
              h(
                'select',
                { className: 'mt-select mt-select-sm', value: indent, onChange: (event) => setIndent(event.target.value) },
                h('option', { value: '2' }, t('json.twoSpaces')),
                h('option', { value: '4' }, t('json.fourSpaces')),
                h('option', { value: 'tab' }, t('json.tab')),
              ),
            ),
          ),
          invalid
            ? h(
                'div',
                { className: 'mt-error mt-jsonerror' },
                h(AlertIcon),
                h(
                  'span',
                  null,
                  `${result.error?.message || t('json.invalid')}${
                    result.error?.line ? ` · ${t('json.errorAt')} ${result.error.line}:${result.error.column}` : ''
                  }`,
                ),
              )
            : null,
          result?.valid && result.output
            ? h(
                'div',
                { className: 'mt-jsonoutwrap' },
                h(
                  'div',
                  { className: 'mt-jsonouthead' },
                  h('span', null, t('json.output')),
                  h(
                    'button',
                    { type: 'button', className: 'mt-linkbtn', onClick: copyOutput },
                    t('json.copy'),
                  ),
                ),
                h('pre', { className: 'mt-jsonout' }, result.output),
              )
            : null,
          result?.valid
            ? h(
                'div',
                { className: 'mt-meta mt-jsonstats' },
                h('span', { className: 'mt-tag' }, `${result.lines} ${t('json.lines')}`),
                h('span', { className: 'mt-tag' }, `${result.bytes} ${t('common.bytes')}`),
                h('span', { className: 'mt-tag' }, String(result.type || '')),
                result.keys != null ? h('span', { className: 'mt-tag' }, `${result.keys} ${t('json.keys')}`) : null,
                result.length != null ? h('span', { className: 'mt-tag' }, `${result.length} ${t('json.items')}`) : null,
              )
            : null,
        ),
      );
    }

    function PreviewModal({ item, onClose, notify }) {
      const closeRef = React.useRef(null);
      React.useEffect(() => {
        closeRef.current?.focus();
      }, []);

      async function act(path) {
        try {
          await api(path, { method: 'POST', body: JSON.stringify({ path: item.path }) });
          notify(path === '/clipboard' ? t('toast.copied') : t('toast.revealed'), 'success');
        } catch (err) {
          notify(err.message || t('error.generic'), 'error');
        }
      }

      return h(
        'div',
        {
          className: 'mt-modal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': item.name,
          onClick: onClose,
        },
        h(
          'div',
          { className: 'mt-modalcard', onClick: (event) => event.stopPropagation() },
          h(
            'div',
            { className: 'mt-modalhead' },
            h('span', { className: 'mt-modalname', title: item.name }, item.name),
            h(
              'button',
              {
                ref: closeRef,
                type: 'button',
                className: 'mt-btn ghost sm',
                onClick: onClose,
                'aria-label': t('action.close'),
              },
              h(XIcon, { size: 14 }),
            ),
          ),
          h('div', { className: 'mt-modalbody' }, h('img', { className: 'mt-modalimg', src: item.url, alt: item.name })),
          h(
            'div',
            { className: 'mt-modalfoot' },
            h(
              'button',
              { type: 'button', className: 'mt-btn ghost sm', onClick: () => act('/reveal') },
              h(FolderIcon, { size: 14 }),
              t('action.reveal'),
            ),
            h(
              'button',
              { type: 'button', className: 'mt-btn ghost sm', onClick: () => act('/clipboard') },
              h(CopyIcon, { size: 14 }),
              t('action.copy'),
            ),
            h(
              'a',
              {
                className: 'mt-btn ghost sm',
                href: `${item.url}&download=1`,
                download: item.name,
                style: { textDecoration: 'none' },
              },
              h(DownloadIcon, { size: 14 }),
              t('action.download'),
            ),
          ),
        ),
      );
    }

    function Toasts({ toasts }) {
      return h(
        'div',
        { className: 'mt-toast', 'aria-live': 'polite' },
        toasts.map((toast) =>
          h(
            'div',
            { key: toast.id, className: `mt-toastitem ${toast.type}` },
            toast.type === 'error' ? h(AlertIcon) : h(CheckIcon),
            h('span', null, toast.text),
          ),
        ),
      );
    }

    function ToolboxPanel() {
      const [tab, setTab] = React.useState('shot');
      const [status, setStatus] = React.useState(null);
      const [statusError, setStatusError] = React.useState('');
      const [toasts, setToasts] = React.useState([]);
      const toastId = React.useRef(0);
      const timers = React.useRef([]);

      React.useEffect(() => {
        let alive = true;
        api('/status')
          .then((data) => {
            if (alive) setStatus(data);
          })
          .catch((err) => {
            if (alive) setStatusError(err.message || t('state.offline'));
          });
        return () => {
          alive = false;
          timers.current.forEach((timer) => clearTimeout(timer));
        };
      }, []);

      function notify(text, type = 'info') {
        const id = ++toastId.current;
        setToasts((list) => [...list.slice(-2), { id, text, type }]);
        const timer = setTimeout(() => {
          setToasts((list) => list.filter((item) => item.id !== id));
        }, 3800);
        timers.current.push(timer);
      }

      async function openRoot() {
        if (!status?.dirs?.root) return;
        try {
          await api('/reveal', { method: 'POST', body: JSON.stringify({ path: status.dirs.root }) });
          notify(t('toast.revealed'), 'success');
        } catch (err) {
          notify(err.message || t('error.generic'), 'error');
        }
      }

      const ready = Boolean(status) && !statusError;

      return h(
        'div',
        { className: 'mt-root' },
        h(
          'div',
          { className: 'mt-shell' },
          h(
            'header',
            { className: 'mt-header' },
            h('div', { className: 'mt-logo' }, h(ToolboxIcon, { size: 26 })),
            h(
              'div',
              { className: 'mt-headmain' },
              h('div', { className: 'mt-eyebrow' }, t('app.phase')),
              h('h1', { className: 'mt-title' }, t('app.title')),
              h('p', { className: 'mt-subtitle' },
                t('app.subtitle'),
                h(
                  'a',
                  {
                    className: 'mt-sourcelink',
                    href: REPO_URL,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    title: t('app.sourceHint'),
                  },
                  h(GithubIcon, { size: 12 }),
                  t('app.source'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'mt-headside' },
              h(
                'span',
                { className: 'mt-chip', title: status?.dirs?.displayRoot || statusError || '' },
                h('span', { className: `mt-dot${ready ? '' : ' off'}` }),
                ready ? status.dirs.displayRoot : t('state.offline'),
              ),
              ready
                ? h(
                    'button',
                    { type: 'button', className: 'mt-btn ghost sm', onClick: openRoot },
                    h(FolderIcon, { size: 14 }),
                    t('action.openFolder'),
                  )
                : null,
            ),
          ),
          h(
            'div',
            { className: 'mt-tabs', role: 'tablist', 'aria-label': t('app.title') },
            [
              { id: 'shot', label: 'tab.shot', Icon: CameraIcon },
              { id: 'qr', label: 'tab.qr', Icon: QrIcon },
              { id: 'compress', label: 'tab.compress', Icon: CompressIcon },
              { id: 'json', label: 'tab.json', Icon: JsonIcon },
            ].map(({ id, label, Icon }) =>
              h(
                'button',
                {
                  key: id,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': tab === id,
                  className: `mt-tab${tab === id ? ' on' : ''}`,
                  onClick: () => setTab(id),
                },
                h(Icon, { size: 15 }),
                t(label),
              ),
            ),
          ),
          statusError
            ? h('div', { className: 'mt-warn' }, h(AlertIcon), h('span', null, `${t('state.offline')}：${statusError}`))
            : null,
          tab === 'shot'
            ? h(ScreenshotPanel, { status, notify })
            : tab === 'qr'
              ? h(QrPanel, { notify })
              : tab === 'compress'
                ? h(CompressPanel, { status, notify })
                : h(JsonPanel, { notify }),
        ),
        h(Toasts, { toasts }),
      );
    }

    function apply(ctx) {
      translate = ctx.locale.bind(DOMAIN);
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-mading-toolbox', '');
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'mading-toolbox: styles');
      ctx.effect(() => {
        const disposeZh = ctx.locale.register(DOMAIN, 'zh', zh);
        const disposeEn = ctx.locale.register(DOMAIN, 'en', en);
        return () => {
          disposeZh();
          disposeEn();
        };
      }, 'mading-toolbox: locale');
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 31,
            label: () => t('nav.label'),
          },
          ToolboxIcon,
        ),
      );
      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: DOMAIN,
          },
          ToolboxPanel,
        ),
      );
    }

    return {
      isPlugin: true,
      inject: ['slots', 'locale'],
      apply,
    };
  },
});
