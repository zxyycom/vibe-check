import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import fg from 'fast-glob';
import mm from 'micromatch';

const matcherOptions = { dot: true, matchBase: false, nobrace: false, nocase: false, noext: false, noglobstar: false, posix: true, strictSlashes: false };
const defaultExcludes = ['**/node_modules/**', '**/.git', '**/.git/**'];
const matches = (file, patterns) => mm([file], patterns, matcherOptions).length > 0;
const isListNegative = (pattern) => pattern.startsWith('!') && !pattern.startsWith('!(');

// Probe uses library traversal. Policy adapter controls entry access, no-follow and strict errors.
export function collect(root, selections, instrumentation = {}) {
  root = path.resolve(root);
  const stats = new Map();
  const directories = new Map();
  const selected = (file, selection) => matches(file, selection.patterns) && (selection.useDefaultExcludes === false || !matches(file, defaultExcludes));
  const exclusions = selections.map((selection) => {
    const lastPositive = selection.patterns.findLastIndex((pattern) => !isListNegative(pattern));
    return [...(selection.useDefaultExcludes === false ? [] : defaultExcludes), ...selection.patterns.slice(lastPositive + 1).filter((pattern) => pattern.startsWith('!') && !pattern.startsWith('!!') && !pattern.startsWith('!(')).map((pattern) => pattern.slice(1))].filter((pattern) => pattern.endsWith('/**')).map((pattern) => pattern.slice(0, -3));
  });
  const noDemand = (relative) => relative !== '' && exclusions.every((patterns) => relative.split('/').some((_, index, segments) => matches(segments.slice(0, index + 1).join('/'), patterns)));
  const missing = () => Object.assign(new Error('policy skipped'), { code: 'ENOENT' });
  const inspect = (absolute) => {
    if (stats.has(absolute)) return stats.get(absolute);
    let value;
    try { instrumentation.inspect?.(absolute); value = fs.lstatSync(absolute); } catch (cause) { throw new Error(`could not inspect ${absolute}: ${cause.message}`, { cause }); }
    stats.set(absolute, value);
    return value;
  };
  const canAccess = (absolute) => {
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (relative.startsWith('../') || path.isAbsolute(relative) || noDemand(relative)) return false;
    const parts = relative.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      if (!inspect(path.join(root, ...parts.slice(0, i))).isDirectory()) return false;
    }
    return true;
  };
  const readDirectory = (absolute) => {
    absolute = path.resolve(absolute);
    if (!canAccess(absolute)) return [];
    if (!inspect(absolute).isDirectory()) return [];
    if (directories.has(absolute)) return directories.get(absolute);
    let entries;
    try { instrumentation.read?.(absolute); entries = fs.readdirSync(absolute, { withFileTypes: true }); } catch (cause) { throw new Error(`could not read directory ${absolute}: ${cause.message}`, { cause }); }
    entries = entries.filter((entry) => !entry.isDirectory() || !noDemand(path.relative(root, path.join(absolute, entry.name)).split(path.sep).join('/')));
    directories.set(absolute, entries);
    return entries;
  };
  if (!inspect(root).isDirectory()) throw new Error(`project root is not a real directory: ${root}`);
  readDirectory(root); // Root usability must hold even for empty patterns.
  const positive = selections.flatMap(({patterns}) => {
    if (patterns.length === 0) return [];
    const positives = patterns.filter((pattern) => !isListNegative(pattern) && pattern !== '');
    return positives.length === 0 || patterns.some((pattern) => pattern.startsWith('!(')) ? ['**/*'] : positives;
  });
  const candidates = positive.length === 0 ? [] : fg.sync([...new Set(positive)], {
    cwd: root, dot: true, onlyFiles: true, followSymbolicLinks: false, suppressErrors: false,
    fs: {
      readdirSync: readDirectory,
      lstatSync: (absolute) => {
        absolute = path.resolve(absolute);
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        if (!canAccess(absolute) || !selections.some((selection) => selected(relative, selection))) throw missing();
        return inspect(absolute);
      }
    }
  });
  return selections.map((selection) => [...new Set(mm(candidates, selection.patterns, matcherOptions).filter((file) => selection.useDefaultExcludes === false || !matches(file, defaultExcludes)))].sort());
}

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'collection-readiness-'));
const root = path.join(fixture, 'root');
const records = [];
try {
  for (const file of ['src/a.ts','src/.dot.ts','src/b.tsx','docs/a.md','node_modules/a.ts','nested/.git/a.ts','blocked/a.ts']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'content');
  }
  fs.symlinkSync('src', path.join(root, 'link-dir'));
  fs.symlinkSync('src/a.ts', path.join(root, 'link-file.ts'));
  fs.symlinkSync('missing', path.join(root, 'broken.ts'));
  fs.symlinkSync(root, path.join(fixture, 'link-root'));
  const probe = (name, selections, expected, options = {}) => {
    const reads = [], inspections = [];
    let result, error;
    try { result = collect(options.root ?? root, selections, { read: (file) => { reads.push(path.relative(root,file)); if (options.failRead === path.relative(root,file)) throw Object.assign(new Error('injected required read failure'), { code: options.code ?? 'EACCES' }); }, inspect: (file) => { inspections.push(path.relative(root,file)); if (options.failInspect === path.relative(root,file)) throw Object.assign(new Error('injected inspection failure'), { code: options.code ?? 'ENOENT' }); } }); }
    catch (cause) { error = cause.message; }
    if (options.error) assert.ok(error, name); else assert.deepEqual(result, expected, name);
    if (options.untouched) assert.ok(![...reads,...inspections].some((file) => file === options.untouched || file.startsWith(options.untouched+'/')), name);
    records.push({name,result,error,reads,inspections});
  };
  probe('dot-brace-extglob', [{patterns:['src/**/*.{ts,tsx}','!src/b.tsx']}], [['src/.dot.ts','src/a.ts']]);
  probe('native-reinclude', [{patterns:['src/**/*.ts','!src/a.ts','src/a.ts']}], [['src/.dot.ts','src/a.ts']]);
  probe('excluded-task-base', [{patterns:['blocked/**/*.ts','!blocked/**']}], [[]], {untouched:'blocked'});
  probe('excluded-static', [{patterns:['blocked/a.ts','!blocked/**']}], [[]], {untouched:'blocked'});
  probe('default-task-base', [{patterns:['node_modules/**/*.ts']}], [[]], {untouched:'node_modules'});
  probe('default-static', [{patterns:['node_modules/a.ts','!node_modules/**','node_modules/a.ts']}], [[]], {untouched:'node_modules'});
  probe('mixed-switch-shared', [{patterns:['node_modules/**/*.ts']},{patterns:['node_modules/**/*.ts'],useDefaultExcludes:false}], [[],['node_modules/a.ts']]);
  probe('directory-link-base', [{patterns:['link-dir/**/*.ts']}], [[]]);
  probe('directory-link-static', [{patterns:['link-dir/a.ts']}], [[]]);
  probe('file-link-static', [{patterns:['link-file.ts','broken.ts']}], [[]]);
  probe('root-link', [{patterns:[]}], undefined, {root:path.join(fixture,'link-root'),error:true});
  probe('root-missing-empty', [{patterns:[]}], undefined, {root:path.join(fixture,'missing'),error:true});
  probe('required-read-failure', [{patterns:['blocked/**/*.ts']}], undefined, {failRead:'blocked',error:true});
  probe('required-ENOENT', [{patterns:['blocked/**/*.ts']}], undefined, {failInspect:'blocked',error:true});
  probe('required-root-read-empty', [{patterns:[]}], undefined, {failRead:'',error:true});
  fs.chmodSync(path.join(root, 'blocked'), 0);
  try {
    probe('physical-EACCES-required', [{patterns:['blocked/**/*.ts']}], undefined, {error:true});
    probe('physical-EACCES-outside', [{patterns:['src/**/*.ts']}], [['src/.dot.ts','src/a.ts']]);
    probe('physical-EACCES-excluded', [{patterns:['blocked/**/*.ts','!blocked/**']}], [[]], {untouched:'blocked'});
  } finally { fs.chmodSync(path.join(root, 'blocked'), 0o755); }
  console.log(JSON.stringify({node:process.version,bun:process.versions.bun??null,records},null,2));
} finally { fs.rmSync(fixture, {recursive:true,force:true}); }
