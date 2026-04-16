#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const [, , ...args] = process.argv

if (args.length === 0) {
  console.error('Usage: node scripts/run-with-system-node.cjs <script> [...args]')
  process.exit(1)
}

const currentNode = process.execPath
const configuredNode = process.env.LAUNDRYCO_NODE_PATH
const candidates = [
  configuredNode,
  '/opt/homebrew/bin/node',
  '/usr/local/bin/node',
  currentNode,
].filter(Boolean)

const selectedNode = candidates.find((candidate) => {
  try {
    return fs.existsSync(candidate)
  } catch {
    return false
  }
}) || currentNode

const scriptPath = args[0].startsWith('.')
  ? path.resolve(process.cwd(), args[0])
  : args[0]

const child = spawn(selectedNode, [scriptPath, ...args.slice(1)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.dirname(selectedNode)}${path.delimiter}${process.env.PATH || ''}`,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
