#!/usr/bin/env node
import { cancel, intro, isCancel, log, multiselect, outro, select } from "@clack/prompts";
import { detectPM, install } from "../src/utils.js";
import { setupAxios, setupFetch } from "../src/http.js";
import { setupReactRouter } from "../src/router.js";
import { setupShadcn } from "../src/shadcn.js";

const comando = process.argv[2];

if (comando !== "init") {
  console.log("Uso: npx @jvxtor-react/cli init");
  process.exit(0);
}

intro("@jvxtor-react/cli");

const categorias = await multiselect({
  message: "O que você quer instalar?",
  options: [
    { value: "estilizacao", label: "Estilização" },
    { value: "http", label: "Cliente HTTP" },
    { value: "roteamento", label: "Roteamento" },
  ],
  required: true,
});

if (isCancel(categorias)) {
  cancel("Cancelado.");
  process.exit(0);
}

try {
  if (categorias.includes("estilizacao")) {
    const escolha = await select({
      message: "Qual lib de estilização você quer instalar?",
      options: [
        { value: "shadcn", label: "shadcn + Tailwind CSS" },
        { value: "antd", label: "Ant Design" },
        { value: "bootstrap", label: "Bootstrap" },
      ],
    });

    if (isCancel(escolha)) {
      cancel("Cancelado.");
      process.exit(0);
    }

    if (escolha === "shadcn") setupShadcn();

    if (escolha === "antd") install(detectPM(), ["antd"]);

    if (escolha === "bootstrap") {
      install(detectPM(), ["bootstrap"]);
      log.info(
        'Importe no seu main: import "bootstrap/dist/css/bootstrap.min.css"',
      );
    }
  }

  if (categorias.includes("http")) {
    const cliente = await select({
      message: "Qual cliente HTTP você quer usar?",
      options: [
        { value: "axios", label: "axios (recomendado)" },
        { value: "fetch", label: "fetch" },
      ],
    });

    if (isCancel(cliente)) {
      cancel("Cancelado.");
      process.exit(0);
    }

    if (cliente === "axios") setupAxios();

    if (cliente === "fetch") setupFetch();
  }

  if (categorias.includes("roteamento")) {
    const roteador = await select({
      message: "Qual lib de roteamento você quer usar?",
      options: [
        { value: "react-router", label: "React Router (recomendado)" },
        { value: "tanstack-router", label: "TanStack Router" },
      ],
    });

    if (isCancel(roteador)) {
      cancel("Cancelado.");
      process.exit(0);
    }

    if (roteador === "react-router") setupReactRouter();

    // TODO: implementar TanStack Router
  }

  outro("Pronto!");
} catch (err) {
  log.error(err.message);
  process.exit(1);
}
