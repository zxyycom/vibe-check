// Separate from timing: count asynchronous filesystem calls used by Link's probes/readers.
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
const counts = {};
for (const name of ['lstat','open','readlink','opendir','readFile','appendFile','mkdir']) {
  const original = fs[name];
  fs[name] = async function (...args) {
    counts[name] = (counts[name] ?? 0) + 1;
    const result = await Reflect.apply(original, this, args);
    if (name === 'open' || name === 'opendir') {
      const originalRead = result.read;
      result.read = async function (...readArgs) {
        const key = name === 'open' ? 'fileRead' : 'directoryEntryRead';
        counts[key] = (counts[key] ?? 0) + 1;
        return Reflect.apply(originalRead, this, readArgs);
      };
    }
    return result;
  };
}
syncBuiltinESMExports();
process.on('exit', () => process.stderr.write(JSON.stringify({counts})+'\n'));
