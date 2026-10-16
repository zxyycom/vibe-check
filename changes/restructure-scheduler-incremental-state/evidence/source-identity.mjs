import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, relative, resolve } from "node:path";
const root = resolve("src");
const files = [];
function visit(directory) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name), stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`source identity excludes symlink: ${path}`);
    if (stat.isDirectory()) visit(path);
    else if (stat.isFile()) files.push({ path: `src/${relative(root, path).replaceAll("\\", "/")}`, bytes: stat.size, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") });
  }
}
visit(root);
const sourceTreeDigest = createHash("sha256").update(files.map(file => `${file.path}\0${file.sha256}\n`).join("")).digest("hex");
console.log(JSON.stringify({ sourceRevision: process.env.SOURCE_REVISION, sourceTreeDigest, files }));
