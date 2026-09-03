# 隔离 spike 复现

本资源只复现结构 contract 与 microbenchmark；不要在 Vibe Check workspace 安装候选或修改其 lockfile。

```json
{
  "name": "admission-core-library-spike",
  "private": true,
  "type": "module",
  "dependencies": {
    "@datastructures-js/priority-queue": "6.4.0",
    "@prelude/rb-tree": "1.0.1",
    "@rimbu/list": "2.1.10",
    "@rimbu/sorted": "2.1.10",
    "immutable": "5.1.9",
    "mnemonist": "0.40.4"
  },
  "devDependencies": {
    "@types/node": "24.13.2",
    "typescript": "6.0.3"
  }
}
```

在一个新的临时目录保存上述内容为 `package.json`，将同 owner 的 `spike.ts` 复制进该目录，再保存：

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "files": ["spike.ts"]
}
```

用以下命令安装、类型检查并测量。`--exact` 仅固定顶层候选；完整 transitive resolution 会随 registry 状态
变化，故此资源的 `spike-output.json` 才是 2026-09-03 的形成时观测。

```bash
bun add --exact immutable@5.1.9 mnemonist@0.40.4 \
  @rimbu/list@2.1.10 @rimbu/sorted@2.1.10 \
  @datastructures-js/priority-queue@6.4.0 @prelude/rb-tree@1.0.1
bun add --dev --exact @types/node@24.13.2 typescript@6.0.3
bunx tsc --noEmit -p tsconfig.json
bun spike.ts > spike-output.json
```

Node 24 import smoke 使用 `mise exec node@24 -- node --input-type=module -e '<import expression>'`。候选的
npm version manifest、download API 与 GitHub endpoints 在同 owner 的 `upstream-snapshot.json` 中逐项列出。
