import fs from "node:fs"
import path from "node:path"
import { log } from "@clack/prompts"
import { detectPM, install } from "./utils.js"

const API_TS = `import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
})

// Interceptor de requisição (ex.: anexar token)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem("token")
    // if (token) config.headers.Authorization = \`Bearer \${token}\`
    return config
  },
  (error) => Promise.reject(error),
)

// Interceptor de resposta (tratamento global de erros)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // const status = error.response?.status
    // if (status === 401) {
    //   localStorage.removeItem("token")
    //   window.location.href = "/login"
    // }
    // if (status === 403) { /* sem permissão */ }
    // if (status >= 500) { /* erro no servidor */ }
    return Promise.reject(error)
  },
)
`

const ENDPOINTS_TS = `// Configuração central dos endpoints
// import { api } from "./api"

// export const endpoints = {
//   users: "/users",
//   userById: (id: string | number) => \`/users/\${id}\`,
//   login: "/auth/login",
// }

// Exemplo de uso:
// export const getUsers = () => api.get(endpoints.users)
`

const FETCH_TS = `const BASE_URL = import.meta.env.VITE_API_URL

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  })

  if (!res.ok) throw new Error(\`Erro \${res.status}\`)
  return res.json()
}
`

const toJs = (src) =>
  src
    .replace(/: string \| number/g, "")

function writeServices(cwd, files, ts) {
  const ext = ts ? "ts" : "js"
  const dir = path.join(cwd, "src", "services")
  fs.mkdirSync(dir, { recursive: true })

  for (const [base, content] of Object.entries(files)) {
    const name = `${base}.${ext}`
    const file = path.join(dir, name)
    if (fs.existsSync(file)) {
      log.warn(`src/services/${name} já existe, pulando.`)
      continue
    }
    fs.writeFileSync(file, content)
  }

  const env = path.join(cwd, ".env")
  if (!fs.existsSync(env)) {
    fs.writeFileSync(env, "VITE_API_URL=http://localhost:3000\n")
  }
  log.info("Criado src/services e .env com VITE_API_URL.")
}

export function setupFetch(cwd = process.cwd()) {
  const ts = fs.existsSync(path.join(cwd, "tsconfig.json"))
  const js = FETCH_TS.replace("<T>", "")
    .replace(": string", "")
    .replace(": RequestInit", "")
    .replace(": Promise<T>", "")
  writeServices(cwd, { api: ts ? FETCH_TS : js }, ts)
}

export function setupAxios(cwd = process.cwd()) {
  install(detectPM(cwd), ["axios"], { cwd })

  const ts = fs.existsSync(path.join(cwd, "tsconfig.json"))
  writeServices(
    cwd,
    { api: API_TS, endpoints: ts ? ENDPOINTS_TS : toJs(ENDPOINTS_TS) },
    ts,
  )
}
