const start = performance.now();
if (process.argv[2] === 'native') await import('./native-static-query-eager-replay-v2.ts');
else await import('./persistent-static-query-control-v2.ts');
const elapsedMs = performance.now() - start;
(globalThis as {gc?:()=>void}).gc?.();
console.log(JSON.stringify({kind:process.argv[2],runtime:process.versions,elapsedMs,...process.memoryUsage()}));
