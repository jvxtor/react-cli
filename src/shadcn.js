import fs from "node:fs"
import path from "node:path"
import { applyEdits, modify } from "jsonc-parser"
import { log } from "@clack/prompts"
import {
  detectPM,
  execPackage,
  findClosingBracket,
  install,
} from "./utils.js"

const VITE_CONFIGS = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
]

const ALIAS_SNIPPET = `resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  }`

// 2. vite.config: plugin do Tailwind + alias "@"
export function patchViteConfig(cwd) {
  const file = VITE_CONFIGS.map((f) => path.join(cwd, f)).find((f) =>
    fs.existsSync(f)
  )
  if (!file) {
    log.warn("vite.config não encontrado. Adicione o plugin e o alias manualmente.")
    return
  }

  let src = fs.readFileSync(file, "utf8")
  const imports = []

  if (!/from\s+["'](node:)?path["']/.test(src)) {
    imports.push('import path from "path"')
  }
  if (!src.includes("@tailwindcss/vite")) {
    imports.push('import tailwindcss from "@tailwindcss/vite"')
  }

  const pluginsIdx = src.search(/plugins\s*:\s*\[/)
  if (pluginsIdx === -1) {
    log.warn(`Não achei "plugins: [...]" em ${path.basename(file)}. Adicione tailwindcss() e o alias manualmente.`)
    return
  }
  const open = src.indexOf("[", pluginsIdx)
  const close = findClosingBracket(src, open)
  if (close === -1) {
    log.warn(`Não consegui interpretar ${path.basename(file)}. Edite manualmente.`)
    return
  }

  let inner = src.slice(open + 1, close)
  if (!/tailwindcss\s*\(/.test(inner)) {
    const trimmed = inner.trimEnd()
    const sep = trimmed === "" ? "" : trimmed.endsWith(",") ? " " : ", "
    inner = trimmed + sep + "tailwindcss()"
  }

  let after = src.slice(close + 1)
  if (!/resolve\s*:/.test(src)) {
    after = `,\n  ${ALIAS_SNIPPET}` + after
  } else if (!/alias\s*:/.test(src)) {
    log.warn('Já existe "resolve" no vite.config sem "alias". Adicione o alias "@" manualmente.')
  }

  src = src.slice(0, open + 1) + inner + "]" + after
  if (imports.length) src = imports.join("\n") + "\n" + src

  fs.writeFileSync(file, src)
  log.success(`${path.basename(file)} atualizado`)
}

// 3. CSS com @import "tailwindcss"
export function writeCss(cwd) {
  const file = path.join(cwd, "src", "index.css")
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '@import "tailwindcss";\n')
  log.success("src/index.css atualizado")
}

function addAlias(file) {
  let text = fs.readFileSync(file, "utf8")
  const fmt = { formattingOptions: { insertSpaces: true, tabSize: 2 } }
  text = applyEdits(text, modify(text, ["compilerOptions", "baseUrl"], ".", fmt))
  text = applyEdits(
    text,
    modify(text, ["compilerOptions", "paths"], { "@/*": ["./src/*"] }, fmt)
  )
  fs.writeFileSync(file, text)
  log.success(`${path.basename(file)} atualizado`)
}

// 4. Alias no TypeScript (ou jsconfig.json em projetos JS)
export function patchTsconfig(cwd) {
  const ts = fs.existsSync(path.join(cwd, "tsconfig.json"))
  if (!ts) {
    const js = path.join(cwd, "jsconfig.json")
    if (!fs.existsSync(js)) fs.writeFileSync(js, "{}\n")
    addAlias(js)
    return
  }
  addAlias(path.join(cwd, "tsconfig.json"))
  const app = path.join(cwd, "tsconfig.app.json")
  if (fs.existsSync(app)) addAlias(app)
}

export function setupShadcn(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, "package.json")
  if (!fs.existsSync(pkgPath)) {
    throw new Error("package.json não encontrado. Rode o comando na raiz do projeto.")
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (!deps.vite) {
    throw new Error("Este projeto não parece usar Vite.")
  }

  const pm = detectPM(cwd)
  const isTs = fs.existsSync(path.join(cwd, "tsconfig.json"))

  log.step("1/5 Instalando Tailwind e o plugin do Vite")
  install(pm, ["tailwindcss", "@tailwindcss/vite"], { cwd })
  if (isTs) install(pm, ["@types/node"], { dev: true, cwd })

  log.step("2/5 Configurando vite.config")
  patchViteConfig(cwd)

  log.step("3/5 Configurando o CSS")
  writeCss(cwd)

  log.step("4/5 Configurando o alias @")
  patchTsconfig(cwd)

  log.step("5/5 Inicializando o shadcn")
  execPackage(pm, "shadcn@latest init", { cwd })
}
