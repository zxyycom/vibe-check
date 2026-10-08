// Investigation-only private facade observation. Input functions are never executed.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [root, input] = process.argv.slice(2);
const { analyzeLizardSource, lizardSourceExtensions } = await import(pathToFileURL(resolve(root, 'src/package-checks/function-metrics/analyzer/port-facade.ts')).href);
const request = JSON.parse(await readFile(input, 'utf8'));
const analysis = request.cases.map(({ filename, sourceCode }) => ({
  filename,
  functions: analyzeLizardSource({ filename, sourceCode })?.function_list
}));
console.log(JSON.stringify({ target: { host: 'bun', hostVersion: Bun.version, mode: 'current-source-private-facade' }, analysis, suffixes: lizardSourceExtensions() }, null, 2));
