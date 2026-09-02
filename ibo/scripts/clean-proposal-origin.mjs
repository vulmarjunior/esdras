import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "lib", "seed-data");

const FILES = ["cap1.json", "cap2.json", "cap3.json", "cap4.json", "cap5.json", "cap6.json", "cap7.json", "art-27.json"];

function clean(node) {
  if (node.filhos) {
    node.filhos = node.filhos.filter((c) => c.origem !== "proposta_inicial");
    node.filhos.forEach(clean);
    if (node.filhos.length === 0) delete node.filhos;
  }
  delete node.origem;
}

let total = 0;
for (const f of FILES) {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const before = JSON.stringify(data);
  clean(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  const removed = (before.match(/proposta_inicial/g) || []).length;
  total += removed;
  console.log(`${f}: removidos ${removed} ref(s)`);
}
console.log("total:", total);