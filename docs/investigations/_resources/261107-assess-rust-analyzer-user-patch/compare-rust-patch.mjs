// Investigation-only probe. Run from the repository root with Node.js 24.18.
// Candidate source is replaced in memory; no Product source or build output is written.
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const mode = process.argv[2];
if (mode === undefined) {
  const results = {};
  for (const selectedMode of ["baseline", "candidate"]) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), selectedMode], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    if (child.status !== 0) throw new Error(child.stderr || `Probe failed: ${child.status}`);
    results[selectedMode] = JSON.parse(child.stdout);
  }
  console.log(JSON.stringify({ node: process.version, ...results }, null, 2));
} else {
  if (mode !== "baseline" && mode !== "candidate") throw new Error("Unknown probe mode");
  if (mode === "candidate") {
    const patch = readFileSync(new URL("./candidate-rust.patch", import.meta.url), "utf8");
    const changed = new Map();
    for (const section of patch.split("diff --git ").slice(1)) {
      const file = /^a\/(\S+)/.exec(section)[1];
      if (!file.startsWith("src/package-checks/function-metrics/")) {
        throw new Error(`Unexpected patch target: ${file}`);
      }
      let source = readFileSync(file, "utf8");
      for (const hunk of section.split(/^@@[^\n]*\n/m).slice(1)) {
        const lines = hunk.split("\n").filter((line) => /^[ +\-]/.test(line));
        const before = lines.filter((line) => line[0] !== "+").map((line) => line.slice(1)).join("\n") + "\n";
        const after = lines.filter((line) => line[0] !== "-").map((line) => line.slice(1)).join("\n") + "\n";
        if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
          throw new Error(`Patch context is absent or ambiguous: ${file}`);
        }
        source = source.replace(before, after);
      }
      changed.set(pathToFileURL(`${process.cwd()}/${file}`).href, source);
    }
    if (changed.size !== 3) throw new Error("Expected exactly three Rust-related source targets");
    registerHooks({
      load(url, context, nextLoad) {
        const result = nextLoad(url, context);
        return changed.has(url) ? { ...result, source: changed.get(url) } : result;
      }
    });
  }
  const { analyzeLizardSource } = await import(pathToFileURL(
    `${process.cwd()}/src/package-checks/function-metrics/analyzer/port-facade.ts`
  ));
  const quote = String.fromCharCode(34);
  const slash = String.fromCharCode(92);
  const samples = {
    errorPropagation: "fn read() -> Result<(), E> { a()?; b()?; c()?; Ok(()) }",
    shortCircuit: "fn ready(a: bool, b: bool) -> bool { a && b }",
    nestedParameters: "fn consume(x: Result<i32, E>, y: (i32, i32), z: fn(i32, i32)) {}",
    traitDeclaration: "trait T { fn required(&self); fn defaulted(&self) { if true {} } }",
    rawString: `fn raw() { let s = r${quote}ends with ${slash}${quote}; if true { println!(${quote}ok${quote}); } }`,
    functionPointer: "fn outer() { let cb: fn(i32) -> i32 = |x| { if x > 0 { x } else { 0 } }; if true {} }",
    unicodeName: "fn 计算(x: i32) { if x > 0 {} }",
    rawIdentifier: "fn r#type(x: i32) { if x > 0 {} }",
    splitDeclaration: "fn\nactual() { if true {} }",
    constComparison: "fn f(x: [u8; { if 1 < 2 { 1 } else { 2 } }], y: u8) {}"
  };
  const results = Object.entries(samples).map(([name, sourceCode]) => ({
    name,
    sourceCode,
    functions: analyzeLizardSource({ filename: "repro.rs", sourceCode }).function_list.map((fn) => ({
      name: fn.name,
      startLine: fn.start_line,
      endLine: fn.end_line,
      ccn: fn.cyclomatic_complexity,
      nd: fn.max_nesting_depth,
      parameters: fn.parameter_count,
      contributors: fn.complex_tags
    }))
  }));
  console.log(JSON.stringify(results));
}
