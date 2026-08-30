import path from "node:path";

import { toSlashPath, type MarkdownSafeTargetDescriptor } from "./local-resolution.ts";

export function projectTarget(
  canonicalProjectRoot: string,
  targetPath: string,
  fragment: string | null,
  kind: "project-directory" | "project-file" | "project-path" = "project-path"
): MarkdownSafeTargetDescriptor {
  return Object.freeze({
    kind,
    path: toSlashPath(path.relative(canonicalProjectRoot, targetPath)),
    fragment
  });
}

export function outsideProjectRootTarget(): MarkdownSafeTargetDescriptor {
  return Object.freeze({ kind: "outside-project-root" as const });
}

export function fileTargetDescriptor(
  target: MarkdownSafeTargetDescriptor
): MarkdownSafeTargetDescriptor {
  if (target.kind === "outside-project-root") return target;
  return Object.freeze({ ...target, kind: "project-file" as const });
}

export function directoryTarget(
  target: MarkdownSafeTargetDescriptor
): MarkdownSafeTargetDescriptor {
  if (target.kind === "outside-project-root") return target;
  return Object.freeze({ ...target, kind: "project-directory" as const });
}
