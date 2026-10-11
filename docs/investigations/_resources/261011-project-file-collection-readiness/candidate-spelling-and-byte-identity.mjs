import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectProjectFiles } from '../../../../src/package-checks/project-files/public-collection.ts';
import { collectProjectFileSets } from '../../../../src/package-checks/project-files/collection.ts';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'collection-review-identity-'));
const rows = [];
const collect = patterns => collectProjectFiles({ projectRoot: root, selection: { patterns, useDefaultExcludes: false } });
function write(name) { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), 'content\n'); }
function observe(id, patterns, expected) { const result = collect(patterns); assert.deepEqual(result, expected); rows.push({ id, patterns, result, frozen: Object.isFrozen(result), exists: result.every(name => fs.existsSync(path.join(root, name))) }); }
function reject(id, patterns) { let error; try { collect(patterns); } catch (cause) { error = cause; } assert.ok(error instanceof Error && !(error instanceof TypeError)); assert.match(error.message, /626164ff2e7473/); rows.push({ id, patterns, error: error.message, kind: error.constructor.name }); }
try {
  write('foo/a.ts'); write('foo/b.ts'); write('good\uFFFD.ts');
  observe('dynamic-dot-prefix', ['./foo/*.ts'], ['foo/a.ts', 'foo/b.ts']);
  observe('static-dot-prefix', ['./foo/a.ts'], ['foo/a.ts']);
  const read = fs.readdirSync; const reads = [];
  fs.readdirSync = function (...args) { reads.push(String(args[0])); return read.apply(this, args); };
  let sets; try { sets = collectProjectFileSets(root, { dynamic: { patterns: ['./foo/*.ts'] }, static: { patterns: ['./foo/a.ts'] } }); } finally { fs.readdirSync = read; }
  assert.equal(reads.length, new Set(reads).size);
  assert.deepEqual(sets.get('dynamic'), ['foo/a.ts', 'foo/b.ts']); assert.deepEqual(sets.get('static'), ['foo/a.ts']);
  rows.push({ id: 'shared-dot-prefix', sets: Object.fromEntries(sets), reads });
  const invalid = Buffer.concat([Buffer.from(root + '/bad'), Buffer.from([0xff]), Buffer.from('.ts')]);
  fs.writeFileSync(invalid, 'content\n');
  const rawNames = fs.readdirSync(root, { encoding: 'buffer' }).map(name => Buffer.from(name).toString('hex')).sort();
  const byteDirents = fs.readdirSync(root, { withFileTypes: true, encoding: 'buffer' });
  const byteReadShape = byteDirents.map(entry => ({ hasDirentMetadata: typeof entry.isFile === 'function', rawBytes: Buffer.from(entry instanceof Uint8Array ? entry : entry.name).toString('hex') }));
  reject('wide-lossy-name', ['**/*']); reject('pattern-lossy-name', ['bad*.ts']); reject('static-lossy-name', ['./bad\uFFFD.ts']);
  const valid = ['foo/a.ts', 'foo/b.ts', 'good\uFFFD.ts'];
  observe('negative-only-outside-scope', ['!bad*'], valid); observe('explicit-negative-outside-scope', ['**/*', '!bad*'], valid);
  write('bad\uFFFD.ts'); reject('real-replacement-character-collision', ['./bad\uFFFD.ts']); reject('dynamic-collision', ['bad*.ts']);
  fs.rmSync(invalid); observe('real-replacement-character-is-legal', ['**/*'], ['bad\uFFFD.ts', ...valid]);
  console.log(JSON.stringify({ node: process.version, bun: process.versions.bun ?? null, byteReadShape, rawNames, rows }, null, 2));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
