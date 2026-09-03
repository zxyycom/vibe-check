# Runtime control method

This resource records the exploratory same-bundle runtime screen used by the investigation. It is not a cross-runtime ABBA benchmark.

## Identities

- Working tree baseline: `e2bad655dde89d07c48413fae4c6167746e10708`
- Bun executable version: `1.3.14`
- Bun compatibility `process.version` reported by the entry: `v24.3.0`
- Node executable: `/home/dev/.local/share/mise/installs/node/24.18.0/bin/node`
- Node version reported by the entry: `v24.18.0`
- Built bundle SHA-256: `ebdb65e5e60615910d6aca5f27c69f489a2c150eaa937565fe251caa84c2baf6`
- Request SHA-256: `7b0c68abab42a12e1f6799d94f8e23f777600dcca1a8e484d18048b5c0bf68ff`
- Request resource: `../compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json`

The generated bundle is not retained because the entry source and repository baseline identify its inputs; its digest identifies the exact generated artifact used for the saved results.

## Commands

```bash
REQUEST='docs/investigations/_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json'
bun build --target=node /tmp/lizard-dynamic/runtime-entry.ts \
  --outfile /tmp/lizard-dynamic/runtime-entry.mjs
sha256sum /tmp/lizard-dynamic/runtime-entry.mjs "$REQUEST"
bun --version
/home/dev/.local/share/mise/installs/node/24.18.0/bin/node --version
bun /tmp/lizard-dynamic/runtime-entry.mjs "$REQUEST" \
  > /tmp/lizard-dynamic/runtime-bun-bundle.json
/home/dev/.local/share/mise/installs/node/24.18.0/bin/node \
  /tmp/lizard-dynamic/runtime-entry.mjs "$REQUEST" \
  > /tmp/lizard-dynamic/runtime-node-24.json
```

Each entry invocation performs one unmeasured warmup and then nine sequential timed operations, sorts those samples, and reports the middle value. Bun and Node were run sequentially rather than in alternating blocks, so the result only establishes runtime sensitivity worth investigating; it does not estimate a controlled runtime effect or authorize changing the Product runtime.
