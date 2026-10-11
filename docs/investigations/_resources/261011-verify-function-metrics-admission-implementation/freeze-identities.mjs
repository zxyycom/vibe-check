import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
// Node 24.18: freeze-identities.mjs <installed-package-root> <tarball> <output-json>
// Records identity only; package creation/installation uses the public package workflow.
const [entry,tarball,output]=process.argv.slice(2);
const packageRoot=resolve(entry);
function files(root,base=''){return readdirSync(join(root,base),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(root,join(base,e.name)):[join(base,e.name)]).sort();}
const sha256=b=>createHash('sha256').update(b).digest('hex');
const modules=files(join(packageRoot,'dist/esm')).map(path=>({path,sha256:sha256(readFileSync(join(packageRoot,'dist/esm',path)))}));
writeFileSync(output,JSON.stringify({version:JSON.parse(readFileSync(join(packageRoot,'package.json'))).version,packageRoot,tarball:resolve(tarball),tarballBytes:statSync(tarball).size,tarballSha256:sha256(readFileSync(tarball)),modules},null,2)+'\n');
