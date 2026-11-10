/*
 * 用 macOS Vision 识别图片中的二维码（JXA / osascript -l JavaScript）。
 * 用法：osascript -l JavaScript vendor/qrdecode.js /absolute/path/to/image
 * 输出：{"ok":true,"codes":["..."]} 或 {"ok":false,"error":"..."}
 */
ObjC.import('Foundation')
ObjC.import('Vision')
ObjC.import('AppKit')

function run(argv) {
  if (!argv || argv.length === 0) {
    return JSON.stringify({ ok: false, error: 'missing-path' })
  }
  const url = $.NSURL.fileURLWithPath(argv[0])
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions(url, $())
  const request = $.VNDetectBarcodesRequest.alloc.init
  const performed = handler.performRequestsError($([request]), $())
  if (!performed) {
    return JSON.stringify({ ok: false, error: 'vision-failed' })
  }
  const results = request.results
  const codes = []
  for (let index = 0; index < (results ? results.count : 0); index++) {
    const observation = results.objectAtIndex(index)
    const payload = observation.payloadStringValue
    if (payload) {
      const text = ObjC.unwrap(payload)
      if (text && codes.indexOf(text) === -1) codes.push(text)
    }
  }
  return JSON.stringify({ ok: true, codes })
}
