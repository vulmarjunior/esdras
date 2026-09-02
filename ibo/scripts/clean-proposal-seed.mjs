import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "lib", "seed-data");

const FILES = [
  "cap1.json", "cap2.json", "cap3.json", "cap4.json", "cap5.json",
  "cap6.json", "cap-dissolucao.json", "cap7.json",
];

function clean(node) {
  delete node.propostaInicial;
  delete node.justificativa;
  delete node.alteracaoTipo;
  if (Array.isArray(node.filhos)) {
    for (const child of node.filhos) clean(child);
  }
}

for (const f of FILES) {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) {
    console.log("skip", f);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  clean(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log("cleaned", f);
}