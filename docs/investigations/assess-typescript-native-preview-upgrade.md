---
title: "@typescript/native-preview 后续版本与渠道迁移"
id: "261021-assess-typescript-native-preview-upgrade"
formedAt: "2026-10-21T03:31:30Z"
question: "native-preview 的 20260621.1 应否升到 20260707.2，稳定 TS7 发布后怎样判断更有价值的路径？"
tags:
  - "compiler"
  - "dependency-upgrades"
  - "native-preview"
  - "typescript"
relations: []
---

## 形成时背景

调查时，根、lockfile 与安装精确为 `7.0.0-dev.20260621.1`；这是明确的预览渠道，不按稳定 semver 版本解释。[typecheck](../../scripts/development/typecheck.ts)、[artifact build](../../scripts/package/artifact/build.ts)调用 `tsgo`，而[consumer type acceptance](../../scripts/package/candidate/external-consumer/type-acceptance.ts)直接拼接 `bin/tsgo.js`。

## 调查目的

分别评估同包预览更新与稳定 compiler 渠道迁移，不将它与旧 TypeScript API 的升级合并处理。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/@typescript/native-preview/latest)、两个包 manifest 的 gitHead 与官方 [两 gitHead compare](https://github.com/microsoft/typescript-go/compare/dc37b5249ab60e2bbce936f71b883e6c8136167e...9977d6d38fcc78de8ae71770f3aa08256e6cc861)、[typescript-go README](https://github.com/microsoft/typescript-go/blob/main/README.md)、[TS7 官方公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)。该包 latest 为 `7.0.0-dev.20260707.2`，不是稳定 release；常规稳定 compiler 已是 `typescript@7.0.2`。

## 调查结果与边界

**建议：暂缓为追 latest 单独更新旧 preview；优先规划稳定 compiler 渠道迁移。若必须保留 tsgo 作过渡，再验证 20260707.2。**

87 个提交的源码区间包含 extended-config diagnostics/panic、非 ASCII position maps、CommonJS destructuring emit、const enum elision、lone-surrogate literals 与项目引用/缓存修复；typecheck/emit 路径有潜在收益，但未证明本项目已触发。该区间也大量包含 LSP/unstable API 改动，不是每个提交都为当前批处理编译增益。

维护者说明 native port 已完成、旧 staging repo 已关闭，RC 后命令改为 `tsc`，nightly 转往 `typescript@next`。因此最新 preview 是过渡候选，不是长期维护方向。manifest 的 bin 从 `./bin/tsgo.js` 改为 `bin/tsgo`；当前 direct-path acceptance 必须检查目标文件/启动方式，不能只认为 `.bin/tsgo` 能运行就路径兼容。平台包依赖与指纹也必须重验。

稳定 compiler 可以与 TS6 API 并存，但[TS API 报告](./assess-typescript-upgrade.md)已说明不能直接覆盖当前 `typescript` API dependency。未来实施应明确 compiler package/命令/路径，更新 typecheck、build、fingerprint/cache 和 consumer acceptance，再运行 Product/scripts typecheck、真实 JS/declaration emit 与 Node 24 installed consumer；不从旧 preview→新 preview 推导稳定7已兼容。

本轮未安装或执行任一候选，未证明直接路径一定缺失、诊断/emit等价或 Gate 提速。当前结论是渠道及迁移边界，而非升级完成。
