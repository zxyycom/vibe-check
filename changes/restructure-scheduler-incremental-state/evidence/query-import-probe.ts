const start = performance.now();
if (process.argv[2] === 'native') await import('./native-static-query.ts');
else await import('../../src/project-run/task-scheduler/admission-core/static-selection-query.ts');
const elapsedMs = performance.now() - start;
(globalThis as {gc?:()=>void}).gc?.();
console.log(JSON.stringify({kind:process.argv[2],runtime:process.versions,elapsedMs,...process.memoryUsage()}));
