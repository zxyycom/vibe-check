// One-off resource packaging: preserve all observations, split only oversized semantic Records.
// Node24: pack-performance.mjs <raw-benchmark-json> <owned-resource-directory> <prefix>
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const [raw,directory,prefix]=process.argv.slice(2);
const evidence=JSON.parse(readFileSync(resolve(raw)));
const resources=[];
for(const [corpus,result]of Object.entries(evidence.corpora)){
  if(Buffer.byteLength(JSON.stringify(result.semantic,null,2))<1024*1024)continue;
  const {records,...metadata}=result.semantic;
  const recordsParts=[];
  for(let index=0;index<records.length;index+=1000){const name=`${prefix}-${corpus}-records-${recordsParts.length+1}.json`;writeFileSync(join(directory,name),JSON.stringify(records.slice(index,index+1000),null,2)+'\n');recordsParts.push(name);resources.push(name);}
  const sha256=createHash('sha256').update(JSON.stringify(result.semantic)).digest('hex');
  for(const sample of result.samples)assert.equal(sample.semanticSha256,sha256);
  result.semanticReference={metadata,recordsParts,recordCount:records.length,canonicalSha256:sha256};
  delete result.semantic;
}
const output=`${prefix}-performance.json`;
writeFileSync(join(directory,output),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({output,resources}));
