# Proposal

本 Change 计划从权威产品源码构建并验收一个版本化 npm package，使同一 package version 交付正式 CLI、公共 TypeScript declarations 与明确公开的产品资源；在进入 implementation 前，proposal 仍可随同一目标的事实核对而修订。

## Why

Project Definition、自定义 Check、公共 Check/Record/Policy types 与产品资源要求消费者获得彼此匹配的 execution 和 authoring materials。仓库当前只证明 `bun src/product/cli.ts` 能在源码树中运行：根 `package.json` 仍是 `private: true`、版本 `0.1.0`，没有 package `bin`、public `exports`、`types`、files whitelist 或实际 tarball acceptance。源码可运行不能证明消费者得到完整、可安装且同版本的产品。

## Outcome

Repository root 保持防误发布的 private workspace manifest；受控 build 从 `src/product/**` 和明确 public resource owners 生成独立 package staging tree。Target package 使用 `vibe-check` identity、`vibe-check` CLI 和显式 `vibe-check/project` authoring subpath，在稳定承诺前使用唯一递增的 `0.0.x` version。`npm pack` 形成候选 tarball，隔离 consumer 安装该精确 tarball并验证 CLI、types、resources、runtime prerequisites 与 package contents；真实 registry publish仍是需要当次明确授权的独立外部写入。

## Scope

纳入范围：

- 从唯一 Product source 构建可安装 runtime、CLI entry、public `.d.ts` 和明确公开 resources 的 package staging tree；
- generated package manifest 的 name/version/bin/exports/types/files/engines/dependencies/licensing metadata，以及只公开声明 surface 的 allowlist；
- Bun installed-runtime contract、可行动 prerequisite diagnostics和没有 repository-relative runtime reads 的 package execution；
- `0.0.x` version selection、candidate tarball inventory、provenance/checksum和 isolated install acceptance；
- release owner 文档、package scripts/CI gate和 downstream Project Definition/public types/resource consumer同步。

非目标：在本 Change 中执行 `npm publish`、管理 registry credential/Trusted Publishing 或承诺 package name已在外部 registry归属本项目；提供通用 Core embedding API；把偶然 tarball path、internal module或源码树提升为 public contract；把产品 runtime改写为 Node.js。

## Success Criteria

- 一个 deterministic build从 `src/product/**` 和明确 resource owners 生成 staging tree；root manifest仍 `private: true`，candidate只能从 staging tree pack，不存在手工维护的第二产品实现。
- Candidate manifest使用 `vibe-check` name、`vibe-check` bin、explicit `./project` export、明确列举的 resource exports和 `0.0.<patch>` version；未声明的 internal paths不通过 export map获得 public import contract。
- Runtime entry由 Bun执行并声明经实际 acceptance验证的 minimum Bun prerequisite；安装后的 CLI不读取 repository source、dev-only dependencies或未打包 paths。
- Public declarations与 runtime validators/helpers来自同一 source contract；一个 isolated TypeScript consumer能 import `vibe-check/project` 并通过 typecheck，CLI和公开 resources来自同一 installed version。
- `npm pack` inventory只含 allowlisted runtime、declarations、resources和必要 legal/package files；隔离安装后 `--help`、`init`、neutral scan及 representative configured scan成功，版本/provenance与 tarball一致。
- 未获得外部写入授权时，全部自动化止于 build/pack/verify；不存在隐式 registry publish、credential读取或把 pack成功误作发布成功的路径。
- Release docs、tests、CI/workspace验证覆盖package contents、installed consumer和预稳定兼容说明。

## Affected Owners

- `src/product/**`：唯一 Product runtime与 public authoring/source contract；release artifact只作构建投影。
- Root `package.json`、lockfile、product build/declaration配置和 release scripts：workspace wiring、staging build、pack与验收入口。
- `docs/cli.md`、`docs/architecture.md` 与后续 Project Definition/Check/Record稳定 owners：installed CLI、public declarations和runtime dependency boundary。
- `docs/output.md`、`docs/schemas/**` 及 Project Definition starter owner：被明确公开的versioned product resources。
- `docs/testing.md`、`docs/testing/cases/**`、CI/workspace verifier与隔离 consumer fixtures：candidate package proof。
- Package license、notice、release notes和release procedure文档：legal/provenance、`0.0.x` compatibility disclosure与external publish授权边界。
