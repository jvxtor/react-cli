import fs from "node:fs"
import path from "node:path"
import { log } from "@clack/prompts"
import { detectPM, install } from "./utils.js"

const ROUTER = `import { createBrowserRouter } from "react-router"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "*", element: <NotFound /> },
])
`

const HOME = `export default function Home() {
  return (
    <div>
      <h1>Página inicial</h1>
    </div>
  )
}
`

const NOT_FOUND = `import { Link } from "react-router"

export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>Página não encontrada.</p>
      <Link to="/">Voltar para o início</Link>
    </div>
  )
}
`

function writeIfMissing(file, content, cwd) {
  const rel = path.relative(cwd, file)
  if (fs.existsSync(file)) {
    log.warn(`${rel} já existe, pulando.`)
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

// Troca <App /> por <RouterProvider /> no main
function patchMain(cwd, ext) {
  const file = path.join(cwd, "src", `main.${ext}`)
  if (!fs.existsSync(file)) {
    log.warn(`src/main.${ext} não encontrado. Use <RouterProvider router={router} /> manualmente.`)
    return
  }

  let src = fs.readFileSync(file, "utf8")
  if (src.includes("RouterProvider")) return

  src = src
    .replace(/^import App from .*\r?\n/m, "")
    .replace(/<App\s*\/>/, "<RouterProvider router={router} />")

  const imports =
    'import { RouterProvider } from "react-router/dom"\nimport { router } from "./router"\n'
  const lastImport = [...src.matchAll(/^import .*\r?\n/gm)].pop()
  const at = lastImport ? lastImport.index + lastImport[0].length : 0
  src = src.slice(0, at) + imports + src.slice(at)

  fs.writeFileSync(file, src)
}

export function setupReactRouter(cwd = process.cwd()) {
  install(detectPM(cwd), ["react-router"], { cwd })

  const ts = fs.existsSync(path.join(cwd, "tsconfig.json"))
  const ext = ts ? "tsx" : "jsx"
  const src = path.join(cwd, "src")

  writeIfMissing(path.join(src, `router.${ext}`), ROUTER, cwd)
  writeIfMissing(path.join(src, "pages", `Home.${ext}`), HOME, cwd)
  writeIfMissing(path.join(src, "pages", `NotFound.${ext}`), NOT_FOUND, cwd)
  patchMain(cwd, ext)

  log.info("React Router configurado: / (Home) e * (NotFound).")
}
