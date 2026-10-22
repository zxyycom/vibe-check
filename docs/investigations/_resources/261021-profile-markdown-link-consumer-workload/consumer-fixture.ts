/** Synthetic consumer-shaped corpus. Counts match feedback, contents/distribution are explicit assumptions. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function makeConsumerFixture(archive: string, sourceCount = 1824, depth = 4, withLinks = true) {
  const root = mkdtempSync(path.join(tmpdir(), "mdlink-consumer-shape-"));
  try {
    const totalSourceBytes = 3_320_000;
    const cases = Math.round(sourceCount * 1221 / 1824);
    const activeCount = withLinks ? Math.max(1, Math.round(sourceCount * 175 / 1824)) : 0;
    const activeCases = withLinks ? Math.max(1, Math.round(sourceCount * 6 / 1824)) : 0;
    const atDepth = (prefix: string, leaf: string) => path.posix.join(prefix,
      ...Array.from({ length: Math.max(0, depth - 1 - prefix.split("/").length) }, () => "d"), leaf);
    const sources = Array.from({ length: sourceCount }, (_, index) => atDepth(
      index < cases ? "docs/testing/cases" : "docs/guides",
      `source-${String(index).padStart(5, "0")}.md`));
    const active = [
      ...Array.from({ length: activeCases }, (_, index) => index),
      ...Array.from({ length: activeCount - activeCases }, (_, index) => cases + index)
    ];
    if (active.some(index => index >= sourceCount)) throw new Error("Invalid active-source shape");
    const fileTargets = Array.from({ length: 130 }, (_, index) => {
      const extension = index < 32 ? ".md" : index < 64 ? ".ts" : index < 96 ? ".png" : index < 129 ? ".json" : "";
      const file = atDepth(index < 32 ? "docs/investigations/_resources" : "assets/targets",
        index === 129 ? "LICENSE" : `target-${index}${extension}`);
      const absolute = path.join(root, file);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, extension === ".png" ? new Uint8Array([255, 0, 128, 1]) : "# Target\n\nDirect target.\n");
      return { path: file, fragment: extension === ".md" ? "#target" : "" };
    });
    const directories = Array.from({ length: 30 }, (_, index) => atDepth("assets/directories", `dir-${index}`));
    for (const directory of directories) mkdirSync(path.join(root, directory), { recursive: true });
    const targets = [
      ...Array.from({ length: 136 }, (_, index) => ({ path: sources[Math.floor(index * sourceCount / 136)]!, fragment: "#target" })),
      ...fileTargets,
      ...directories.map(directory => ({ path: directory, fragment: "" }))
    ];
    const references: string[][] = Array.from({ length: sourceCount }, () => []);
    if (withLinks) {
      for (let index = 0; index < 1193; index += 1) {
        const sourceIndex = active[index % active.length]!;
        let destination: string;
        if (index < 777) {
          const target = targets[index % targets.length]!;
          destination = path.posix.relative(path.posix.dirname(sources[sourceIndex]!), target.path) + target.fragment;
          if (target.path === sources[sourceIndex]) {
            // Keep every one of the 777 local occurrences a direct, cross-document endpoint.
            const other = targets[(index + 1) % targets.length]!;
            destination = path.posix.relative(path.posix.dirname(sources[sourceIndex]!), other.path) + other.fragment;
          }
        } else destination = `https://example.invalid/reference-${index}`;
        references[sourceIndex]!.push(`[link-${index}](${destination})`);
      }
    }
    const sourceManifest = sources.map((file, index) => {
      const desired = Math.floor(totalSourceBytes / sourceCount) + (index < totalSourceBytes % sourceCount ? 1 : 0);
      const initial = `# Target\n\nDocument ${index}.\n\n${references[index]!.join("\n")}\n\n`;
      if (Buffer.byteLength(initial) >= desired) throw new Error("Source body exceeds fixed byte budget");
      const body = initial + "x".repeat(desired - Buffer.byteLength(initial) - 1) + "\n";
      const absolute = path.join(root, file);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, body);
      return { path: file, bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") };
    });
    execFileSync("tar", ["-czf", archive, "-C", root, "."]);
    return { synthetic: true, sourceCount, sourceBytes: totalSourceBytes, depth, withLinks,
      caseSources: cases, caseSourcesWithReferences: activeCases, sourcesWithReferences: activeCount,
      occurrenceCount: withLinks ? 1193 : 0, logicalDirectCount: withLinks ? 777 : 0,
      directTargetNodesIntended: withLinks ? 296 : 0, sourceTargetOverlapIntended: withLinks ? 136 : 0,
      targetOnlyFiles: 130, targetOnlyDirectories: 30,
      assumptions: "Equal-sized unique documents, one heading each, 32 target-only Markdown heading reads, remaining nonlocal links are HTTP, paths have fixed requested depth; not the user's original corpus.",
      sourceManifest };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
