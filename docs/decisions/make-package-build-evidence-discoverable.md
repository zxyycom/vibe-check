---
title: 将 package build evidence 置于可发现的受管输出
status: active
alignment: aligned
createdAt: 2026-08-27T06:44:50Z
purpose: 让本地 package candidate 的完整 build evidence 可直接检查，同时保持缓存只承接可复用状态。
background: 现有 cache 同时保存 staging、tarball、receipt 与编译状态，既遮蔽产物也混淆可查看 evidence 与缓存责任。
decision: 默认将 unpacked evidence 与 versioned tarball 置于 build 下，cache 仅保存 receipt 和编译状态，并以明确命令绑定状态、构建与完整验收。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的
- 让开发者和自动化在无需查找 cache staging 的情况下检查一个完整、本地生成的 package build。
- 保留 candidate receipt、fingerprint 与编译状态的复用价值，但不把它们误作正式 artifact evidence。

## 背景
- 本地 candidate 的 package runtime、declarations、maps、sources、docs、licenses 与 declared runtime dependencies 必须作为同一 package unit 被审计和外部 consumer 验收。
- `.cache` 是失效和重建的状态空间；将完整 unpacked evidence 和 tarball 放在其中降低可发现性，也使缓存责任与可查看输出责任不清晰。
- 可读 ESM layout 已由 `publish-readable-esm-package-layout.md` 确定，改变 build output location 不应改变 package 内的物理 layout、公开 exports 或宿主承诺。

## 决策
- 采用: 默认以 `build/package/` 作为唯一完整 unpacked package build evidence，并以 `build/artifacts/` 保存对应 versioned `.tgz`；不创建根 `dist/`，也不使用 bundle、Rollup 或第二套 runtime format。
- 采用: `.cache/vibe-check/package-candidate/` 仅保存 receipt、fingerprint/tsbuildinfo 等可复用状态；receipt 仍严格绑定 build-owned tarball、unpacked evidence 和经验证安装，失配时 fail closed 并按既有 rebuild/reinstall 路径恢复。
- 采用: 根 `package:status` 只读并报告 candidate version/freshness、unpacked path、tarball path 和经验证 installed entry；`package:build` 执行受审计 preparation；`package:verify` 复用 full Project Gate 的 package acceptance，不建立平行验收。
- 不采用: 将可查看 package build 留在 cache、挪用根 `artifacts/` machine/quality namespace，或以复制 cache staging 的镜像制造第二个 evidence source。
