import { isAbsolute, resolve } from "node:path";

import { benchmarkRoot } from "./benchmark-context.ts";
import type { BenchmarkLayer, BenchmarkMode } from "./contract.ts";

export type BenchmarkTemperature = "cold" | "warmed-operation";

export interface BenchmarkArguments {
  readonly historicalWorktree?: string;
  readonly layers: readonly BenchmarkLayer[];
  readonly lizard123?: string;
  readonly lizard124Source?: string;
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
  readonly temperature: BenchmarkTemperature;
}

interface ArgumentState {
  historicalWorktree?: string;
  layers: readonly BenchmarkLayer[];
  lizard123?: string;
  lizard124Source?: string;
  mode: BenchmarkMode;
  outputDirectory: string;
  temperature: BenchmarkTemperature;
}

type ArgumentValueParser = (state: ArgumentState, value: string | undefined) => void;

const allLayers = ["analyzer-only", "current-decomposition", "historical-product"] as const;
const layerByAlias: Readonly<Record<string, BenchmarkLayer>> = Object.freeze({
  A: "historical-product",
  B: "analyzer-only",
  C: "current-decomposition",
  all: "analyzer-only"
});
const argumentValueParsers: Readonly<Record<string, ArgumentValueParser>> = Object.freeze({
  "--historical-worktree": parseHistoricalWorktree,
  "--layer": parseLayer,
  "--lizard123": parseLizard123,
  "--lizard124-source": parseLizard124Source,
  "--mode": parseMode,
  "--output": parseOutputDirectory,
  "--temperature": parseTemperature
});

export function parseArguments(argv: readonly string[]): BenchmarkArguments {
  const state = defaultArgumentState();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const parser =
      option === undefined || !Object.hasOwn(argumentValueParsers, option)
        ? undefined
        : argumentValueParsers[option];
    if (parser === undefined) throw new Error(`unknown argument: ${option}`);
    parser(state, argv[index + 1]);
  }
  return Object.freeze({
    ...(state.historicalWorktree === undefined
      ? {}
      : { historicalWorktree: state.historicalWorktree }),
    layers: state.layers,
    ...(state.lizard123 === undefined ? {} : { lizard123: state.lizard123 }),
    ...(state.lizard124Source === undefined ? {} : { lizard124Source: state.lizard124Source }),
    mode: state.mode,
    outputDirectory: state.outputDirectory,
    temperature: state.temperature
  });
}

function defaultArgumentState(): ArgumentState {
  return {
    layers: [...allLayers],
    mode: "smoke",
    outputDirectory: resolve(
      benchmarkRoot,
      "artifacts/development-benchmarks",
      new Date().toISOString().replaceAll(":", "-")
    ),
    temperature: "cold"
  };
}

function parseMode(state: ArgumentState, value: string | undefined): void {
  if (value !== "smoke" && value !== "full") throw new Error("--mode must be smoke or full");
  state.mode = value;
}

function parseLayer(state: ArgumentState, value: string | undefined): void {
  if (value === "all") {
    state.layers = [...allLayers];
    return;
  }
  const layer =
    value === undefined || !Object.hasOwn(layerByAlias, value) ? undefined : layerByAlias[value];
  if (layer === undefined) throw new Error("--layer must be A, B, C, or all");
  state.layers = [layer];
}

function parseTemperature(state: ArgumentState, value: string | undefined): void {
  if (value !== "cold" && value !== "warmed-operation") {
    throw new Error("--temperature must be cold or warmed-operation");
  }
  state.temperature = value;
}

function parseHistoricalWorktree(state: ArgumentState, value: string | undefined): void {
  state.historicalWorktree = resolvedDirectoryArgument(value, "--historical-worktree");
}

function parseLizard123(state: ArgumentState, value: string | undefined): void {
  state.lizard123 = absoluteExecutableArgument(value, "--lizard123");
}

function parseLizard124Source(state: ArgumentState, value: string | undefined): void {
  state.lizard124Source = absoluteExecutableArgument(value, "--lizard124-source");
}

function parseOutputDirectory(state: ArgumentState, value: string | undefined): void {
  state.outputDirectory = resolvedDirectoryArgument(value, "--output");
}

function resolvedDirectoryArgument(value: string | undefined, option: string): string {
  if (value === undefined || value.startsWith("-"))
    throw new Error(`${option} requires a directory`);
  return resolve(value);
}

function absoluteExecutableArgument(value: string | undefined, option: string): string {
  if (value === undefined || value.startsWith("-") || !isAbsolute(value)) {
    throw new Error(
      `${option} requires an absolute ${option === "--lizard123" ? "executable" : "source checkout"}`
    );
  }
  return value;
}
