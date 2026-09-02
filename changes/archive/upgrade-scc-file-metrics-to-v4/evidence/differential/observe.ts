import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

type Version = "v3" | "v4";

interface SccRow {
  readonly blanks: number;
  readonly code: number;
  readonly comments: number;
  readonly complexity: number | null;
  readonly filename: string;
  readonly language: string;
  readonly lines: number;
  readonly provider: string;
}

interface Observation {
  readonly csvHeader: string;
  readonly rows: readonly SccRow[];
  readonly versionOutput: string;
}

const corpusDirectory = resolve(import.meta.dir, "corpus");
const outputPath = resolve(import.meta.dir, "observations.json");
const commands = parseCommands(process.argv.slice(2));
const paths = filesUnder(corpusDirectory);
const observations = Object.fromEntries(
  (["v3", "v4"] as const).map((version) => [version, observe(version, commands[version], paths)])
) as Record<Version, Observation>;
writeFileSync(outputPath, `${JSON.stringify({ corpus: paths, observations }, null, 2)}\n`);

function parseCommands(arguments_: string[]): Record<Version, string> {
  const commandByVersion = new Map<Version, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const command = arguments_[index + 1];
    const version = flag === "--v3" ? "v3" : flag === "--v4" ? "v4" : null;
    if (!version || !command) throw new Error("usage: bun observe.ts --v3 /path/to/scc-v3 --v4 /path/to/scc-v4");
    commandByVersion.set(version, command);
  }
  const v3 = commandByVersion.get("v3");
  const v4 = commandByVersion.get("v4");
  if (!v3 || !v4 || commandByVersion.size !== 2) {
    throw new Error("both --v3 and --v4 commands are required exactly once");
  }
  return { v3, v4 };
}

function observe(versionName: Version, command: string, paths: readonly string[]): Observation {
  const version = Bun.spawnSync([command, "--version"], { cwd: corpusDirectory });
  if (version.exitCode !== 0) throw new Error(`${command} --version exited ${version.exitCode}`);
  const isolationArguments = versionName === "v4" ? ["--no-config"] : [];
  const scan = Bun.spawnSync([command, ...isolationArguments, "--by-file", "--format", "csv", ...paths], {
    cwd: corpusDirectory
  });
  if (scan.exitCode !== 0) throw new Error(`${command} scan exited ${scan.exitCode}: ${scan.stderr.toString()}`);
  return parseObservation(version.stdout.toString().trim(), scan.stdout.toString());
}

function parseObservation(versionOutput: string, csv: string): Observation {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  if (!header) throw new Error("SCC emitted no CSV header");
  const columns = header.split(",");
  const index = (name: string): number => {
    const result = columns.indexOf(name);
    if (result < 0) throw new Error(`CSV header lacks ${name}: ${header}`);
    return result;
  };
  const language = index("Language");
  const provider = index("Provider");
  const filename = index("Filename");
  const linesIndex = index("Lines");
  const code = index("Code");
  const comments = index("Comments");
  const blanks = index("Blanks");
  const complexity = index("Complexity");
  return {
    versionOutput,
    csvHeader: header,
    rows: lines.map((line) => {
      const row = line.split(",");
      const number = (column: number): number => Number(row[column]);
      return {
        language: row[language] ?? "",
        provider: row[provider] ?? "",
        filename: row[filename] ?? "",
        lines: number(linesIndex),
        code: number(code),
        comments: number(comments),
        blanks: number(blanks),
        complexity: row[complexity] === "" ? null : number(complexity)
      };
    })
  };
}

function filesUnder(directory: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...filesUnder(path));
    else if (entry.isFile()) results.push(relative(corpusDirectory, path).replaceAll("\\", "/"));
  }
  return results.sort();
}
