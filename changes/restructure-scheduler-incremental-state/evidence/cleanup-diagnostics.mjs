import { readdirSync, lstatSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve('tmp/restructure-scheduler-incremental-state/diagnostic-runs');
const pass = process.argv[2];
if (!/^(before|after)-(node|bun)$/.test(pass ?? '')) throw new Error('explicit pass required');
const files = readdirSync(root).map(name => {
  if (!/^(core|scheduler)-\d{8}T\d{6}\.\d{3}Z-[a-f0-9-]+\.log$/.test(name)) throw new Error(`unknown member: ${name}`);
  const stat = lstatSync(join(root, name));
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`not ordinary: ${name}`);
  return {name, bytes: stat.size, inode: stat.ino, modifiedMs: stat.mtimeMs};
});
writeFileSync(resolve(`tmp/restructure-scheduler-incremental-state/${pass}-diagnostic-manifest.json`), JSON.stringify({pass, root, count:files.length, bytes:files.reduce((sum,file)=>sum+file.bytes,0), files}));
for (const file of files) {
  const path = join(root, file.name), stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.ino !== file.inode || stat.size !== file.bytes || stat.mtimeMs !== file.modifiedMs) throw new Error('member changed since manifest');
  unlinkSync(path);
}
console.log(JSON.stringify({pass, removed:files.length, bytes:files.reduce((sum,file)=>sum+file.bytes,0)}));
