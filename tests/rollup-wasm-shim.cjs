const Module = require('node:module')
const path = require('node:path')

const wasmNative = require('@rollup/wasm-node/dist/native.js')
const originalLoad = Module._load
const rollupSegment = `${path.sep}node_modules${path.sep}rollup${path.sep}dist${path.sep}`

Module._load = function patchedLoad(request, parent, isMain) {
  if (
    (request === './native.js' ||
      request === '../native.js' ||
      request.endsWith('/native.js') ||
      request.startsWith('@rollup/rollup-')) &&
    parent?.filename?.includes(rollupSegment)
  ) {
    return wasmNative
  }

  return originalLoad.call(this, request, parent, isMain)
}
