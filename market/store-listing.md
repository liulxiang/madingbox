# 商店详情文案 / Store listing copy

> 用于插件市场详情页、awesome PR 描述和 GitHub Release。中英文保持同义，不堆关键词。

## 名称

- 中文：码叮工具箱
- English: MaDing Toolbox
- npm：`dsh-mading-toolbox`

## 一句话

- 中文：macOS 截图、二维码、图片压缩、JSON 格式化，四件小工具都在本机完成。
- English: macOS screenshots, QR codes, image compression and JSON formatting — four small tools that stay on your machine.

## 短描述（≤160 字符）

- 中文：在 DSH 侧栏完成 macOS 截图、二维码生成与识别、图片压缩和 JSON 格式化，附带五个 Agent 工具，不联网。
- English: A DSH sidebar for macOS screenshots, QR generation and decoding, image compression and JSON formatting, with five agent tools and no network calls.

## 长描述

### 中文

码叮工具箱把几个高频的小动作收进 DSH 侧栏，不用再开一串网页和命令行：

- **截图**：全屏、区域、窗口三种模式，调延迟和光标，保存到本地并保留历史。
- **二维码**：实时预览，四种码点样式（方块 / 圆角 / 圆点 / 菱形）、三种码眼样式（方块 / 圆角 / 圆形），可调尺寸、纠错、静区和颜色，同时输出 PNG 与 SVG；也能识别本地图片里的二维码，复制或填回继续改。
- **图片压缩**：调 JPEG 质量和最长边，PNG / JPEG / WebP / HEIC / TIFF / BMP 都能读，结果和历史直接看。
- **JSON**：格式化、最小化、校验，支持 2/4 空格或 tab 缩进，报错给到行列。

截图、二维码、压缩、JSON 四页共用侧栏入口；五个 Agent 工具让模型也能直接调用这些能力。

### English

MaDing Toolbox puts a handful of small, frequent jobs into the DSH sidebar:

- **Screenshots** — full screen, region or window, with delay and cursor options, saved locally with history.
- **QR codes** — live preview, four dot styles (square / rounded / dot / diamond), three eye styles (square / rounded / circle), adjustable size, error correction, quiet zone and colors, exported as PNG + SVG. It also decodes QR codes from local images and lets you copy the result or send it back to the editor.
- **Image compression** — tune JPEG quality and longest edge; reads PNG / JPEG / WebP / HEIC / TIFF / BMP; results and history stay in the panel.
- **JSON** — format, minify or validate with 2/4-space or tab indentation, with line and column on errors.

All four live behind one sidebar entry, and five agent tools expose the same capabilities to the model.

## 功能清单

| 能力 | 说明 |
|---|---|
| 截图 | 全屏 / 区域 / 窗口，延迟、光标、历史、剪贴板、访达定位 |
| 二维码生成 | 4 种码点 × 3 种码眼，PNG + SVG，实时预览 |
| 二维码识别 | 本地图片，Vision 解码，多条结果 |
| 图片压缩 | sips，JPEG 质量 1–100，最长边 0–12000 |
| JSON | 格式化 / 最小化 / 校验，行列错误 |

## Agent 工具

- `mading_screenshot` — 截取屏幕
- `mading_qr` — 生成二维码
- `mading_qr_decode` — 识别二维码
- `mading_compress` — 压缩图片
- `mading_json` — 格式化 / 校验 JSON

## 环境

- macOS（截图用 `screencapture`，压缩用 `sips`，识别用 Vision）
- DSH 2.0.21-next 上验证；更早版本未验证
- 无网络请求，无遥测

## 安装

```bash
dsh plugin --profile web add dsh-mading-toolbox
```

安装后完全退出并重启 DSH。

## 截图素材

商店截图应使用真实 UI，不要用示意图冒充。建议顺序：

1. 截图页：全屏 / 区域 / 窗口三个按钮 + 历史网格
2. 二维码页：圆点码点 + 圆形码眼，右侧实时预览
3. 图片压缩：压缩前后体积对比卡
4. JSON：格式化结果 + 行列错误示例

拍到后放到 `assets/screenshots/`，在仓库根新增 `screenshots.json`：

```json
[
  "assets/screenshots/01-screenshot.png",
  "assets/screenshots/02-qr-style.png",
  "assets/screenshots/03-compress.png",
  "assets/screenshots/04-json.png"
]
```

规则：1–8 张，相对路径不能跳出插件目录，图片必须托管在 GitHub。当前仓库尚未提交截图，因为本机浏览器访问被 Host 禁用，无法在不侵犯屏幕隐私的前提下截到真实 UI。
