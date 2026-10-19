import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

export function detectPM(cwd = process.cwd()) {
  const has = (f) => fs.existsSync(path.join(cwd, f))
  if (has("pnpm-lock.yaml")) return "pnpm"
  if (has("yarn.lock")) return "yarn"
  if (has("bun.lockb") || has("bun.lock")) return "bun"
  return "npm"
}

const COMMANDS = {
  npm: { add: "npm install", addDev: "npm install -D", exec: "npx" },
  pnpm: { add: "pnpm add", addDev: "pnpm add -D", exec: "pnpm dlx" },
  yarn: { add: "yarn add", addDev: "yarn add -D", exec: "npx" },
  bun: { add: "bun add", addDev: "bun add -d", exec: "bunx" },
}

export function run(cmd, cwd = process.cwd()) {
  execSync(cmd, { stdio: "inherit", cwd })
}

export function install(pm, packages, { dev = false, cwd } = {}) {
  const base = dev ? COMMANDS[pm].addDev : COMMANDS[pm].add
  run(`${base} ${packages.join(" ")}`, cwd)
}

export function execPackage(pm, command, { cwd } = {}) {
  run(`${COMMANDS[pm].exec} ${command}`, cwd)
}

// Acha o índice do "]" que fecha o "[" em openIndex (considera colchetes aninhados)
export function findClosingBracket(src, openIndex) {
  let depth = 0
  for (let i = openIndex; i < src.length; i++) {
    if (src[i] === "[") depth++
    if (src[i] === "]") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
