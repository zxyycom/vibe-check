import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const FILE_COUNT = 620;
const TOTAL_PATH_CHARACTERS = 34_941;
const WARMUP_ROUNDS = 2;
const MEASURED_ROUNDS = 10;
const BATCH_SIZES = [1, 5, 10, 25, 50, 100, 200, 310, 620] as const;
const CEILINGS = [8_000, 12_000, 16_000, 20_000, 24_000, 28_000] as const;
const FIXED_ARGUMENTS = ["--no-config", "--by-file", "--format", "csv"] as const;
const CSV_HEADER = "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";

type Condition = {
  readonly id: string;
  readonly kind: "baseline" | "cold-start" | "batch-size" | "ceiling";
  readonly batches: readonly (readonly string[])[];
};

type Sample = {
  readonly condition: string;
  readonly kind: Condition["kind"];
  readonly round: number;
  readonly wallMs: number;
  readonly invocationCount: number;
  readonly measurementDigest: string;
};

type Summary = {
  readonly schemaVersion: 1;
  readonly benchmark: "scc-file-metrics-batch-transport";
  readonly formedAt: string;
  readonly environment: Record<string, string | number | null>;
  readonly corpus: Record<string, string | number>;
  readonly protocol: Record<string, unknown>;
  readonly conditions: readonly Record<string, unknown>[];
  readonly selection: Record<string, unknown>;
};

const scriptPath = fileURLToPath(import.meta.url);
const resourceDirectory = dirname(scriptPath);
const workspaceRoot = process.cwd();
const output = (name: string) => join(resourceDirectory, name);

function command(commandName: string, args: readonly string[], cwd = workspaceRoot): string {
  const result = spawnSync(commandName, args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `command failed: ${commandName} ${args.join(" ")}\n${result.error?.message ?? result.stderr}`
    );
  }
  return result.stdout.trim();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixturePaths(): readonly string[] {
  const prefixes = Array.from(
    { length: FILE_COUNT },
    (_, index) => `inputs/f${String(index).padStart(4, "0")}-`
  );
  const suffix = ".ts";
  const shortestTotal = prefixes.reduce(
    (total, prefix) => total + prefix.length + suffix.length,
    0
  );
  const extra = TOTAL_PATH_CHARACTERS - shortestTotal;
  if (extra < 0) {
    throw new Error("fixture path minimum unexpectedly exceeds requested total");
  }
  const each = Math.floor(extra / FILE_COUNT);
  const remainder = extra % FILE_COUNT;
  const paths = prefixes.map(
    (prefix, index) => `${prefix}${"x".repeat(each + (index < remainder ? 1 : 0))}${suffix}`
  );
  if (paths.reduce((total, path) => total + path.length, 0) !== TOTAL_PATH_CHARACTERS) {
    throw new Error("fixture path construction did not preserve requested total");
  }
  return paths;
}

function estimateWindowsArgv(executable: string, paths: readonly string[]): number {
  const argumentsToEstimate = [executable, ...FIXED_ARGUMENTS, ...paths];
  return argumentsToEstimate.reduce(
    (total, argument, index) => total + (index === 0 ? 0 : 1) + 2 * argument.length + 2,
    1
  );
}

function planByCeiling(
  executable: string,
  paths: readonly string[],
  ceiling: number
): readonly (readonly string[])[] {
  const batches: string[][] = [];
  let batch: string[] = [];
  for (const path of paths) {
    if (estimateWindowsArgv(executable, [path]) > ceiling) {
      throw new Error(`single path cannot fit ceiling ${ceiling}: ${path}`);
    }
    if (batch.length > 0 && estimateWindowsArgv(executable, [...batch, path]) > ceiling) {
      batches.push(batch);
      batch = [];
    }
    batch.push(path);
  }
  if (batch.length > 0) {
    batches.push(batch);
  }
  return batches;
}

function planByBatchSize(
  paths: readonly string[],
  batchSize: number
): readonly (readonly string[])[] {
  return Array.from({ length: Math.ceil(paths.length / batchSize) }, (_, index) =>
    paths.slice(index * batchSize, (index + 1) * batchSize)
  );
}

function normalizeCsv(csv: string, expectedPaths: readonly string[]): string {
  const lines = csv.trimEnd().split("\n");
  if (lines.shift() !== CSV_HEADER) {
    throw new Error(`unexpected SCC CSV header: ${csv.slice(0, 200)}`);
  }
  const rowsByPath = new Map<string, string>();
  for (const row of lines) {
    const fields = row.split(",");
    const path = fields[2];
    if (!path || rowsByPath.has(path)) {
      throw new Error(`malformed or duplicate SCC row: ${row}`);
    }
    rowsByPath.set(path, row);
  }
  if (
    rowsByPath.size !== expectedPaths.length ||
    expectedPaths.some((path) => !rowsByPath.has(path))
  ) {
    throw new Error(
      `SCC exact-input result mismatch: expected ${expectedPaths.length}, got ${rowsByPath.size}`
    );
  }
  return [CSV_HEADER, ...[...rowsByPath.values()].sort()].join("\n");
}

function invoke(sccPath: string, fixtureDirectory: string, batch: readonly string[]): string {
  const result = spawnSync(sccPath, [...FIXED_ARGUMENTS, ...batch], {
    cwd: fixtureDirectory,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(`SCC invocation failed: ${result.error?.message ?? result.stderr}`);
  }
  return normalizeCsv(result.stdout, batch);
}

function runLogicalScan(
  sccPath: string,
  fixtureDirectory: string,
  condition: Condition
): Omit<Sample, "condition" | "kind" | "round"> {
  const startedAt = process.hrtime.bigint();
  const rows = condition.batches.flatMap((batch) =>
    invoke(sccPath, fixtureDirectory, batch).split("\n").slice(1)
  );
  const wallMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return {
    wallMs,
    invocationCount: condition.batches.length,
    measurementDigest: sha256([CSV_HEADER, ...rows.sort()].join("\n"))
  };
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = ordered.length / 2;
  return (ordered[Math.floor(midpoint - 0.5)] + ordered[Math.ceil(midpoint - 0.5)]) / 2;
}

function p95(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * 0.95) - 1];
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function curveSvg(
  title: string,
  points: readonly { readonly label: string; readonly median: number; readonly p95: number }[]
): string {
  const width = 1040;
  const height = 370;
  const left = 70;
  const right = 30;
  const top = 54;
  const bottom = 80;
  const values = points.flatMap((point) => [point.median, point.p95]);
  const maximum = Math.max(...values) * 1.08;
  const x = (index: number) =>
    left + (index * (width - left - right)) / Math.max(points.length - 1, 1);
  const y = (value: number) => top + (height - top - bottom) * (1 - value / maximum);
  const line = (field: "median" | "p95") =>
    points.map((point, index) => `${x(index)},${y(point[field])}`).join(" ");
  const labels = points
    .map(
      (point, index) =>
        `<text x="${x(index)}" y="${height - 48}" text-anchor="middle">${point.label}</text>`
    )
    .join("");
  const dots = (field: "median" | "p95", color: string) =>
    points
      .map(
        (point, index) => `<circle cx="${x(index)}" cy="${y(point[field])}" r="3" fill="${color}"/>`
      )
      .join("");
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = (maximum * index) / 4;
    const vertical = y(value);
    return `<path d="M ${left} ${vertical} H ${width - right}" class="grid"/><text x="${left - 8}" y="${vertical + 4}" text-anchor="end">${value.toFixed(0)}</text>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
  <title id="title">${title}</title>
  <style>text { font: 13px sans-serif; fill: #1f2937; } .grid { stroke: #d1d5db; stroke-width: 1; } .median { fill: none; stroke: #2563eb; stroke-width: 3; } .p95 { fill: none; stroke: #dc2626; stroke-width: 3; }</style>
  <text x="${width / 2}" y="25" text-anchor="middle" font-weight="bold">${title}</text>
  ${ticks}
  <polyline points="${line("median")}" class="median"/>${dots("median", "#2563eb")}
  <polyline points="${line("p95")}" class="p95"/>${dots("p95", "#dc2626")}
  ${labels}
  <text x="${width / 2}" y="${height - 18}" text-anchor="middle">condition</text>
  <text x="${width - right}" y="${top + 5}" text-anchor="end" fill="#2563eb">blue: median</text>
  <text x="${width - right}" y="${top + 22}" text-anchor="end" fill="#dc2626">red: p95</text>
</svg>\n`;
}

function expectedDigestFor(paths: readonly string[]): string {
  return sha256(
    [
      CSV_HEADER,
      ...paths
        .map((path) => {
          const index = Number.parseInt(basename(path).slice(1, 5), 10);
          const body = `export const measuredValue${index} = ${index};\n`;
          return `TypeScript,${path},${path},1,1,0,0,0,${body.length},0`;
        })
        .sort()
    ].join("\n")
  );
}

function main(): void {
  const sccPath = command("mise", ["exec", "--", "which", "scc"]);
  const sccVersion = command(sccPath, ["--version"]);
  const paths = fixturePaths();
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "vibe-check-scc-batch-benchmark-"));
  try {
    for (const [index, path] of paths.entries()) {
      const absolutePath = join(fixtureDirectory, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, `export const measuredValue${index} = ${index};\n`);
    }
    const conditions: readonly Condition[] = [
      { id: "baseline-single-process", kind: "baseline", batches: [paths] },
      { id: "cold-start-single-file", kind: "cold-start", batches: [[paths[0]!]] },
      ...BATCH_SIZES.map((batchSize) => ({
        id: `batch-size-${batchSize}`,
        kind: "batch-size" as const,
        batches: planByBatchSize(paths, batchSize)
      })),
      ...CEILINGS.map((ceiling) => ({
        id: `ceiling-${ceiling}`,
        kind: "ceiling" as const,
        batches: planByCeiling(sccPath, paths, ceiling)
      }))
    ];
    const expectedDigest = expectedDigestFor(paths);
    const samples: Sample[] = [];
    for (const condition of conditions) {
      const conditionPaths = condition.batches.flat();
      const conditionDigest = expectedDigestFor(conditionPaths);
      for (let warmup = 0; warmup < WARMUP_ROUNDS; warmup += 1) {
        const result = runLogicalScan(sccPath, fixtureDirectory, condition);
        if (result.measurementDigest !== conditionDigest) {
          throw new Error(`${condition.id} warmup ${warmup + 1} digest mismatch`);
        }
      }
      for (let round = 1; round <= MEASURED_ROUNDS; round += 1) {
        const result = runLogicalScan(sccPath, fixtureDirectory, condition);
        if (result.measurementDigest !== conditionDigest) {
          throw new Error(`${condition.id} round ${round} digest mismatch`);
        }
        samples.push({ condition: condition.id, kind: condition.kind, round, ...result });
        console.log(
          `${condition.id} round=${round} wallMs=${result.wallMs.toFixed(3)} invocations=${result.invocationCount}`
        );
      }
    }
    const conditionSummary = conditions.map((condition) => {
      const conditionSamples = samples.filter((sample) => sample.condition === condition.id);
      const times = conditionSamples.map((sample) => sample.wallMs);
      return {
        id: condition.id,
        kind: condition.kind,
        batchCount: condition.batches.length,
        batchPathCounts: condition.batches.map((batch) => batch.length),
        windowsArgvEstimates: condition.batches.map((batch) => estimateWindowsArgv(sccPath, batch)),
        measuredRounds: conditionSamples.length,
        wallMs: {
          median: median(times),
          p95: p95(times),
          min: Math.min(...times),
          max: Math.max(...times)
        },
        invocationCount: conditionSamples[0]?.invocationCount,
        measurementDigest: expectedDigestFor(condition.batches.flat())
      };
    });
    const ceilingSummary = conditionSummary.filter((condition) => condition.kind === "ceiling");
    const fastest = [...ceilingSummary].sort(
      (left, right) =>
        (left.wallMs as { median: number }).median - (right.wallMs as { median: number }).median
    )[0]!;
    const qualified = ceilingSummary.filter((condition) => {
      const timing = condition.wallMs as { median: number; p95: number };
      const fastestTiming = fastest.wallMs as { median: number; p95: number };
      return timing.median <= fastestTiming.median * 1.1 && timing.p95 <= fastestTiming.p95 * 1.15;
    });
    const selected = [...qualified].sort(
      (left, right) =>
        Number(left.id.slice("ceiling-".length)) - Number(right.id.slice("ceiling-".length))
    )[0];
    if (!selected) {
      throw new Error("no ceiling satisfies the predeclared median/p95 selection thresholds");
    }
    const summary: Summary = {
      schemaVersion: 1,
      benchmark: "scc-file-metrics-batch-transport",
      formedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      environment: {
        platform: process.platform,
        arch: process.arch,
        bunVersion: Bun.version,
        sccPath,
        sccVersion,
        kernel: command("uname", ["-sr"]),
        cpuModel:
          Bun.env["PROCESSOR_IDENTIFIER"] ??
          readFileSync("/proc/cpuinfo", "utf8").match(/^model name\s*:\s*(.+)$/m)?.[1] ??
          null,
        cpuCount: navigator.hardwareConcurrency
      },
      corpus: {
        fixture: "deterministic generated small TypeScript files",
        fileCount: FILE_COUNT,
        totalRelativePathCharacters: paths.reduce((total, path) => total + path.length, 0),
        fixturePathDigest: sha256(paths.join("\n")),
        fileBodyDigest: sha256(
          paths.map((_, index) => `export const measuredValue${index} = ${index};\n`).join("")
        )
      },
      protocol: {
        invocation:
          "<mise-resolved stock scc> --no-config --by-file --format csv <exact relative paths...>",
        timing:
          "process.hrtime.bigint surrounds all measurement invocations in one logical scan; CSV parsing/digest guard is included",
        warmupRoundsPerCondition: WARMUP_ROUNDS,
        measuredRoundsPerCondition: MEASURED_ROUNDS,
        ordering: "conditions execute serially in summary order; no samples are removed",
        batchSizeConditions: BATCH_SIZES,
        ceilingConditions: CEILINGS,
        planner:
          "Windows argv upper bound: 1 terminal NUL + sum(2 * argument.length + 2) for executable/fixed args/paths + one separator before every non-first argument",
        selection:
          "among ceiling conditions, find the lowest-median fastest condition; select the smallest ceiling with median <= fastest median * 1.10 and p95 <= fastest p95 * 1.15; p95 is nearest-rank ceil(0.95*n)",
        equalityGuard:
          "every warmup and measured logical scan must yield one normalized CSV row per exact path and the same SHA-256 digest"
      },
      conditions: conditionSummary,
      selection: {
        fastestCeilingCondition: fastest.id,
        fastestCeilingMedianMs: (fastest.wallMs as { median: number }).median,
        fastestCeilingP95Ms: (fastest.wallMs as { p95: number }).p95,
        selectedCeilingCondition: selected.id,
        selectedCeiling: Number(selected.id.slice("ceiling-".length)),
        qualifiedCeilings: qualified.map((condition) => condition.id)
      }
    };
    writeFileSync(
      output("raw-samples.csv"),
      [
        "condition,kind,round,wallMs,invocationCount,measurementDigest",
        ...samples.map((sample) =>
          [
            sample.condition,
            sample.kind,
            sample.round,
            sample.wallMs.toFixed(6),
            sample.invocationCount,
            sample.measurementDigest
          ]
            .map(csvEscape)
            .join(",")
        )
      ].join("\n") + "\n"
    );
    writeFileSync(output("summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    const batchPoints = conditionSummary
      .filter((condition) => condition.kind === "batch-size")
      .map((condition) => ({
        label: condition.id.slice("batch-size-".length),
        median: (condition.wallMs as { median: number }).median,
        p95: (condition.wallMs as { p95: number }).p95
      }));
    const ceilingPoints = ceilingSummary.map((condition) => ({
      label: condition.id.slice("ceiling-".length),
      median: (condition.wallMs as { median: number }).median,
      p95: (condition.wallMs as { p95: number }).p95
    }));
    writeFileSync(
      output("batch-size-curve.svg"),
      curveSvg("SCC logical scan wall time by explicit batch size", batchPoints)
    );
    writeFileSync(
      output("ceiling-curve.svg"),
      curveSvg("SCC logical scan wall time by Windows argv ceiling", ceilingPoints)
    );
    writeFileSync(
      output("run-output.txt"),
      `SCC batch transport benchmark completed\nresource=${relative(workspaceRoot, resourceDirectory)}\nselectedCeiling=${summary.selection.selectedCeiling}\nmeasurementDigest=${expectedDigest}\n`
    );
    console.log(JSON.stringify(summary.selection));
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
}

main();
