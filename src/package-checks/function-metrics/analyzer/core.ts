/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard.py (Nesting through FileAnalyzer, analyze_files,
 * map_files_to_analyzer, OutputScheme, get_extensions lifecycle hooks, and
 * condition_counter); lizard_ext/lizardnd.py (typed FileInfoBuilder and
 * FunctionInfo host lifecycle seam).
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * Modified: translated to the product-owned TypeScript in-memory analyzer.
 * File discovery, reader selection, CLI argument parsing, and report rendering
 * remain outside this module's explicitly in-memory boundary.
 */

import {
  extensionMetadata,
  invokeExtensionCall,
  invokeExtensionCrossFileProcessOutcome,
  invokeExtensionPrintResult,
  invokeExtensionSetArgs
} from "./extensions/protocol.ts";
import type {
  ExtensionArgumentRegistrar,
  FunctionInfoDefinition,
  LizardExtension
} from "./extensions/protocol.ts";
import { isPythonWhitespace, splitPythonLines } from "./shared/code-reader.ts";

/** Tokens are kept lazy so each source-aligned processor retains its ordering. */
export type TokenStream = Iterable<string>;

/** Python's getattr category for a missing source-named FunctionInfo attribute. */
class AttributeError extends Error {
  public constructor(targetName: string, attributeName: string) {
    super(`'${targetName}' object has no attribute '${attributeName}'`);
    this.name = "AttributeError";
  }
}

/** The minimum reader contract used by the in-memory Lizard pipeline. */
export interface AnalyzerReader {
  readonly conditions: ReadonlySet<string>;
  readonly controlFlowKeywords: ReadonlySet<string>;
  readonly logicalOperators: ReadonlySet<string>;
  readonly caseKeywords: ReadonlySet<string>;
  readonly ternaryOperators: ReadonlySet<string>;
  readonly control_flow_keywords: ReadonlySet<string>;
  readonly logical_operators: ReadonlySet<string>;
  readonly case_keywords: ReadonlySet<string>;
  readonly ternary_operators: ReadonlySet<string>;
  readonly ext: readonly string[];
  readonly languages: unknown;
  readonly languageNames: readonly string[];
  /** Source `language_names` alias used by translated internal extensions. */
  readonly language_names: readonly string[];
  readonly extraSubclasses: ReadonlySet<unknown>;
  readonly extra_subclasses: ReadonlySet<unknown>;
  readonly parallelStates: readonly unknown[];
  readonly parallel_states: readonly unknown[];
  readonly context: FileInfoBuilder;
  /** Optional source reader attributes consumed by lizardnd.py. */
  readonly loops?: readonly string[] | ReadonlySet<string>;
  readonly bracket?: string;
  readonly loop_indicator?: string;
  readonly indent_indicator?: string;
  __call__(tokens: TokenStream, reader: AnalyzerReader): TokenStream;
  getCommentFromToken(token: string): string | undefined;
  process(tokens: TokenStream): TokenStream;
  preprocess?(tokens: TokenStream): TokenStream;
}

/** A concrete reader supplies its tokenizer and receives a per-file context. */
export interface ReaderConstructor<Reader extends AnalyzerReader = AnalyzerReader> {
  new (context: FileInfoBuilder): Reader;
  generateTokens(sourceCode: string): TokenStream;
}

/** One source-aligned stage between tokenization and reader state processing. */
export type TokenProcessor = (tokens: TokenStream, reader: AnalyzerReader) => TokenStream;

/** A core processor or one internal Lizard extension processor. */
export type AnalyzerProcessor = TokenProcessor | LizardExtension;

/** Python str.strip(), as used by the source comment-directive processor. */
function stripPythonWhitespace(value: string): string {
  const characters = Array.from(value);
  let firstCharacter = 0;
  while (
    firstCharacter < characters.length &&
    isPythonWhitespace(characters[firstCharacter] ?? "")
  ) {
    firstCharacter += 1;
  }

  let lastCharacter = characters.length;
  while (
    lastCharacter > firstCharacter &&
    isPythonWhitespace(characters[lastCharacter - 1] ?? "")
  ) {
    lastCharacter -= 1;
  }
  return characters.slice(firstCharacter, lastCharacter).join("");
}

/** One lexical nesting level. */
export class Nesting {
  public get nameInSpace(): string {
    return "";
  }

  public get name_in_space(): string {
    return this.nameInSpace;
  }
}

export const BARE_NESTING = new Nesting();

/** A named namespace/class scope in a function name. */
export class Namespace extends Nesting {
  public readonly name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }

  public override get nameInSpace(): string {
    return this.name ? `${this.name}::` : "";
  }
}

/** Lizard's mutable per-function metrics model. */
export class FunctionInfo extends Nesting {
  public name: string;
  public filename: string;
  public startLine: number;
  public cyclomaticComplexity: number;
  public nloc = 1;
  public tokenCount = 1;
  public longName: string;
  public endLine: number;
  public fullParameters: string[] = [];
  public topNestingLevel = -1;
  public fanIn = 0;
  public fanOut = 0;
  public generalFanOut = 0;
  public maxNestingDepth = 0;
  /** Source lizardcomplextags.py storage; absent until its processor observes a token. */
  public complexTags: [string, number][] | undefined;
  /** Source lizardnd.py's per-function mutable processor state. */
  public nestingDepth = 0;
  public hiddenBracket = 0;
  public bracketLoop = false;
  public inCondition = false;
  public conditionDepth = 0;
  public logicalOperatorAdded = false;
  public prevWasElse = false;
  public forgivenMetrics = new Set<string>();

  public constructor(name: string, filename: string, startLine = 0, ccn = 1) {
    super();
    this.name = name;
    this.filename = filename;
    this.startLine = startLine;
    this.cyclomaticComplexity = ccn;
    this.longName = name;
    this.endLine = startLine;
  }

  /**
   * Source-name aliases share the camel-case storage above.  They are an
   * analyzer-internal translation seam for extension bodies, not a Product API.
   */
  public get cyclomatic_complexity(): number {
    return this.cyclomaticComplexity;
  }

  public set cyclomatic_complexity(value: number) {
    this.cyclomaticComplexity = value;
  }

  public get token_count(): number {
    return this.tokenCount;
  }

  public set token_count(value: number) {
    this.tokenCount = value;
  }

  public get long_name(): string {
    return this.longName;
  }

  public set long_name(value: string) {
    this.longName = value;
  }

  public get start_line(): number {
    return this.startLine;
  }

  public set start_line(value: number) {
    this.startLine = value;
  }

  public get end_line(): number {
    return this.endLine;
  }

  public set end_line(value: number) {
    this.endLine = value;
  }

  public get full_parameters(): string[] {
    return this.fullParameters;
  }

  public set full_parameters(value: string[]) {
    this.fullParameters = value;
  }

  public get top_nesting_level(): number {
    return this.topNestingLevel;
  }

  public set top_nesting_level(value: number) {
    this.topNestingLevel = value;
  }

  public get fan_in(): number {
    return this.fanIn;
  }

  public set fan_in(value: number) {
    this.fanIn = value;
  }

  public get fan_out(): number {
    return this.fanOut;
  }

  public set fan_out(value: number) {
    this.fanOut = value;
  }

  public get general_fan_out(): number {
    return this.generalFanOut;
  }

  public set general_fan_out(value: number) {
    this.generalFanOut = value;
  }

  public get max_nesting_depth(): number {
    return this.maxNestingDepth;
  }

  public set max_nesting_depth(value: number) {
    this.maxNestingDepth = value;
  }

  public get complex_tags(): [string, number][] | undefined {
    return this.complexTags;
  }

  public set complex_tags(value: [string, number][] | undefined) {
    this.complexTags = value;
  }

  public get nesting_depth(): number {
    return this.nestingDepth;
  }

  public set nesting_depth(value: number) {
    this.nestingDepth = value;
  }

  public get hidden_bracket(): number {
    return this.hiddenBracket;
  }

  public set hidden_bracket(value: number) {
    this.hiddenBracket = value;
  }

  public get bracket_loop(): boolean {
    return this.bracketLoop;
  }

  public set bracket_loop(value: boolean) {
    this.bracketLoop = value;
  }

  public get in_condition(): boolean {
    return this.inCondition;
  }

  public set in_condition(value: boolean) {
    this.inCondition = value;
  }

  public get condition_depth(): number {
    return this.conditionDepth;
  }

  public set condition_depth(value: number) {
    this.conditionDepth = value;
  }

  public get logical_operator_added(): boolean {
    return this.logicalOperatorAdded;
  }

  public set logical_operator_added(value: boolean) {
    this.logicalOperatorAdded = value;
  }

  public get prev_was_else(): boolean {
    return this.prevWasElse;
  }

  public set prev_was_else(value: boolean) {
    this.prevWasElse = value;
  }

  public get forgiven_metrics(): Set<string> {
    return this.forgivenMetrics;
  }

  public set forgiven_metrics(value: Set<string>) {
    this.forgivenMetrics = value;
  }

  public override get nameInSpace(): string {
    return `${this.name}.`;
  }

  public get unqualifiedName(): string {
    return this.name.split("::").at(-1) ?? this.name;
  }

  public get unqualified_name(): string {
    return this.unqualifiedName;
  }

  public get location(): string {
    return ` ${this.name}@${this.startLine}-${this.endLine}@${this.filename}`;
  }

  public get parameterCount(): number {
    return this.parameters.length;
  }

  public get parameter_count(): number {
    return this.parameterCount;
  }

  public get parameters(): string[] {
    return this.fullParameters.flatMap((parameter) => {
      const match = /([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u.exec(parameter);
      return match?.[1] ? [match[1]] : [];
    });
  }

  public get length(): number {
    return this.endLine - this.startLine + 1;
  }

  public addToFunctionName(appended: string): void {
    this.name += appended;
    this.longName += appended;
  }

  public add_to_function_name(appended: string): void {
    this.addToFunctionName(appended);
  }

  public addToLongName(appended: string): void {
    const previousCharacter = Array.from(this.longName).at(-1);
    const nextCharacter = Array.from(appended)[0];
    if (/^\p{L}$/u.test(previousCharacter ?? "") && /^\p{L}$/u.test(nextCharacter ?? "")) {
      this.longName += " ";
    }
    this.longName += appended;
  }

  public add_to_long_name(appended: string): void {
    this.addToLongName(appended);
  }

  public addParameter(token: string): void {
    this.addToLongName(` ${token}`);

    if (this.fullParameters.length === 0) {
      this.fullParameters.push(token);
    } else if (token === ",") {
      this.fullParameters.push("");
    } else {
      const lastParameter = this.fullParameters.length - 1;
      this.fullParameters[lastParameter] += ` ${token}`;
    }
  }

  public add_parameter(token: string): void {
    this.addParameter(token);
  }
}

/** Lizard's mutable aggregate for a single source file. */
export class FileInformation {
  public filename: string;
  public nloc: number;
  public functionList: FunctionInfo[];
  public tokenCount = 0;

  public constructor(filename: string, nloc: number, functionList: FunctionInfo[] = []) {
    this.filename = filename;
    this.nloc = nloc;
    this.functionList = functionList.length === 0 ? [] : functionList;
  }

  /** Source-name aliases share the camel-case storage for internal extensions. */
  public get function_list(): FunctionInfo[] {
    return this.functionList;
  }

  public set function_list(value: FunctionInfo[]) {
    this.functionList = value;
  }

  public get token_count(): number {
    return this.tokenCount;
  }

  public set token_count(value: number) {
    this.tokenCount = value;
  }

  public get averageNloc(): number {
    return this.functionsAverage("nloc");
  }

  public get average_nloc(): number {
    return this.averageNloc;
  }

  public get averageTokenCount(): number {
    return this.functionsAverage("tokenCount");
  }

  public get average_token_count(): number {
    return this.averageTokenCount;
  }

  public get averageCyclomaticComplexity(): number {
    return this.functionsAverage("cyclomaticComplexity");
  }

  public get average_cyclomatic_complexity(): number {
    return this.averageCyclomaticComplexity;
  }

  public get ccn(): number {
    return this.functionList.reduce(
      (total, functionInfo) => total + functionInfo.cyclomaticComplexity,
      0
    );
  }

  public get CCN(): number {
    return this.ccn;
  }

  public get nestingDepth(): number {
    return this.functionList.reduce(
      (total, functionInfo) => total + functionInfo.maxNestingDepth,
      0
    );
  }

  public get ND(): number {
    return this.nestingDepth;
  }

  public functionsAverage(attribute: string): number {
    if (this.functionList.length === 0) return 0;
    const total = this.functionList.reduce(
      (sum, functionInfo) => sum + readNumericFunctionInfoAttribute(functionInfo, attribute),
      0
    );
    return total / this.functionList.length;
  }

  public functions_average(attribute: string): number {
    return this.functionsAverage(attribute);
  }
}

function readNumericFunctionInfoAttribute(functionInfo: FunctionInfo, attribute: string): number {
  if (!(attribute in functionInfo)) {
    throw new AttributeError("FunctionInfo", attribute);
  }

  const value: unknown = Reflect.get(functionInfo, attribute);
  if (typeof value !== "number") {
    throw new TypeError(`FunctionInfo attribute '${attribute}' is not numeric.`);
  }
  return value;
}

/** The nesting-stack surface that source-aligned extensions may decorate. */
export interface NestingStackLike {
  withNamespace(name: string): string;
  addBareNesting(): void;
  addNamespace(token: string): void;
  startNewFunctionNesting(functionInfo: FunctionInfo): void;
  popNesting(): Nesting | undefined;
  readonly currentNestingLevel: number;
  readonly lastFunction: FunctionInfo | undefined;
}

/**
 * The source spelling exposed by Python's FileInfoBuilder.__getattr__.
 *
 * A translated extension may only implement the methods it decorates, as
 * lizardduplicate's NestingStackWithUnifiedTokens does. The adapter below
 * supplies all remaining names from its wrapped stack just like __getattr__.
 */
export interface SourceNestingStackLike {
  nesting_stack: Nesting[];
  pending_function: FunctionInfo | undefined;
  with_namespace(name: string): string;
  add_bare_nesting(): void;
  add_namespace(token: string): void;
  start_new_function_nesting(functionInfo: FunctionInfo): void;
  pop_nesting(): Nesting | undefined;
  readonly current_nesting_level: number;
  readonly last_function: FunctionInfo | undefined;
}

/** The complete spelling bridge passed to source-aligned nesting decorators. */
export interface NestingStackAdapter extends NestingStackLike, SourceNestingStackLike {}

/** A source-aligned nesting-stack decorator constructor. */
export interface NestingStackDecorator<Decorated extends object = NestingStackLike> {
  new (decorated: NestingStackAdapter): Decorated;
}

/** The nesting stack that readers use to qualify and complete functions. */
export class NestingStack implements NestingStackAdapter {
  private nestingStack: Nesting[] = [];
  private pendingFunction: FunctionInfo | undefined;

  /** Source-name aliases retain the mutable stack storage for decorators. */
  public get nesting_stack(): Nesting[] {
    return this.nestingStack;
  }

  public set nesting_stack(value: Nesting[]) {
    this.nestingStack = value;
  }

  public get pending_function(): FunctionInfo | undefined {
    return this.pendingFunction;
  }

  public set pending_function(value: FunctionInfo | undefined) {
    this.pendingFunction = value;
  }

  public withNamespace(name: string): string {
    return `${this.nestingStack.map((nesting) => nesting.nameInSpace).join("")}${name}`;
  }

  public with_namespace(name: string): string {
    return this.withNamespace(name);
  }

  public addBareNesting(): void {
    this.nestingStack.push(this.createNesting());
  }

  public add_bare_nesting(): void {
    this.addBareNesting();
  }

  public addNamespace(token: string): void {
    this.pendingFunction = undefined;
    this.nestingStack.push(new Namespace(token));
  }

  public add_namespace(token: string): void {
    this.addNamespace(token);
  }

  public startNewFunctionNesting(functionInfo: FunctionInfo): void {
    this.pendingFunction = functionInfo;
  }

  public start_new_function_nesting(functionInfo: FunctionInfo): void {
    this.startNewFunctionNesting(functionInfo);
  }

  public popNesting(): Nesting | undefined {
    this.pendingFunction = undefined;
    return this.nestingStack.pop();
  }

  public pop_nesting(): Nesting | undefined {
    return this.popNesting();
  }

  public get currentNestingLevel(): number {
    return this.nestingStack.length;
  }

  public get current_nesting_level(): number {
    return this.currentNestingLevel;
  }

  public get lastFunction(): FunctionInfo | undefined {
    for (let index = this.nestingStack.length - 1; index >= 0; index -= 1) {
      const nesting = this.nestingStack[index];
      if (nesting instanceof FunctionInfo) return nesting;
    }
    return undefined;
  }

  public get last_function(): FunctionInfo | undefined {
    return this.lastFunction;
  }

  private createNesting(): Nesting {
    const pendingFunction = this.pendingFunction;
    this.pendingFunction = undefined;
    return pendingFunction ?? BARE_NESTING;
  }
}

/**
 * Reifies Python's decorator fallback for the finite NestingStack surface.
 * A TypeScript decorator cannot implement Python's dynamic __getattr__, so we
 * retain the decorated stack as the explicit fallback for source spellings.
 */
class SourceSpellingNestingStackAdapter implements NestingStackAdapter {
  private readonly decorated: object;
  private readonly decoratedStackFallbacks: WeakMap<object, object>;

  public constructor(decorated: object, decoratedStackFallbacks: WeakMap<object, object>) {
    this.decorated = decorated;
    this.decoratedStackFallbacks = decoratedStackFallbacks;
  }

  public get nesting_stack(): Nesting[] {
    return asNestingArray(this.read("nesting_stack", "nesting_stack"), "nesting_stack");
  }

  public set nesting_stack(value: Nesting[]) {
    this.write("nesting_stack", value);
  }

  public get pending_function(): FunctionInfo | undefined {
    return asFunctionInfoOrUndefined(
      this.read("pending_function", "pending_function"),
      "pending_function"
    );
  }

  public set pending_function(value: FunctionInfo | undefined) {
    this.write("pending_function", value);
  }

  public withNamespace(name: string): string {
    return asString(this.call("withNamespace", "with_namespace", name), "withNamespace");
  }

  public with_namespace(name: string): string {
    return asString(this.call("with_namespace", "withNamespace", name), "with_namespace");
  }

  public addBareNesting(): void {
    this.call("addBareNesting", "add_bare_nesting");
  }

  public add_bare_nesting(): void {
    this.call("add_bare_nesting", "addBareNesting");
  }

  public addNamespace(token: string): void {
    this.call("addNamespace", "add_namespace", token);
  }

  public add_namespace(token: string): void {
    this.call("add_namespace", "addNamespace", token);
  }

  public startNewFunctionNesting(functionInfo: FunctionInfo): void {
    this.call("startNewFunctionNesting", "start_new_function_nesting", functionInfo);
  }

  public start_new_function_nesting(functionInfo: FunctionInfo): void {
    this.call("start_new_function_nesting", "startNewFunctionNesting", functionInfo);
  }

  public popNesting(): Nesting | undefined {
    return asNestingOrUndefined(this.call("popNesting", "pop_nesting"), "popNesting");
  }

  public pop_nesting(): Nesting | undefined {
    return asNestingOrUndefined(this.call("pop_nesting", "popNesting"), "pop_nesting");
  }

  public get currentNestingLevel(): number {
    return asNumber(
      this.read("currentNestingLevel", "current_nesting_level"),
      "currentNestingLevel"
    );
  }

  public get current_nesting_level(): number {
    return asNumber(
      this.read("current_nesting_level", "currentNestingLevel"),
      "current_nesting_level"
    );
  }

  public get lastFunction(): FunctionInfo | undefined {
    return asFunctionInfoOrUndefined(this.read("lastFunction", "last_function"), "lastFunction");
  }

  public get last_function(): FunctionInfo | undefined {
    return asFunctionInfoOrUndefined(this.read("last_function", "lastFunction"), "last_function");
  }

  private call(preferredName: string, fallbackName: string, ...arguments_: unknown[]): unknown {
    const member = this.findMember(preferredName, fallbackName);
    if (member === undefined || typeof member.value !== "function") {
      throw new TypeError(`Decorated NestingStack is missing callable ${preferredName}.`);
    }
    return Reflect.apply(member.value, member.owner, arguments_);
  }

  private read(preferredName: string, fallbackName: string): unknown {
    const member = this.findMember(preferredName, fallbackName);
    if (member === undefined) {
      throw new TypeError(`Decorated NestingStack is missing ${preferredName}.`);
    }
    return member.value;
  }

  private write(name: string, value: unknown): void {
    Reflect.set(this.decorated, name, value);
  }

  private findMember(preferredName: string, fallbackName: string): NestingStackMember | undefined {
    const visited = new Set<object>();
    let candidate: object | undefined = this.decorated;

    while (candidate !== undefined && !visited.has(candidate)) {
      visited.add(candidate);
      if (preferredName in candidate) {
        return { owner: candidate, value: Reflect.get(candidate, preferredName) };
      }
      if (fallbackName in candidate) {
        return { owner: candidate, value: Reflect.get(candidate, fallbackName) };
      }
      candidate = this.decoratedStackFallbacks.get(candidate);
    }

    return undefined;
  }
}

interface NestingStackMember {
  readonly owner: object;
  readonly value: unknown;
}

function asNestingArray(value: unknown, name: string): Nesting[] {
  if (isNestingArray(value)) return value;
  throw new TypeError(`Decorated NestingStack ${name} is not an array.`);
}

function isNestingArray(value: unknown): value is Nesting[] {
  return Array.isArray(value) && value.every((item) => item instanceof Nesting);
}

function asFunctionInfoOrUndefined(value: unknown, name: string): FunctionInfo | undefined {
  if (value === undefined || value instanceof FunctionInfo) return value;
  throw new TypeError(`Decorated NestingStack ${name} is not a FunctionInfo.`);
}

function asNestingOrUndefined(value: unknown, name: string): Nesting | undefined {
  if (value === undefined || value instanceof Nesting) return value;
  throw new TypeError(`Decorated NestingStack ${name} did not return a Nesting.`);
}

function asNumber(value: unknown, name: string): number {
  if (typeof value === "number") return value;
  throw new TypeError(`Decorated NestingStack ${name} is not a number.`);
}

function asString(value: unknown, name: string): string {
  if (typeof value === "string") return value;
  throw new TypeError(`Decorated NestingStack ${name} did not return a string.`);
}

function asNestingStackAdapter(
  nestingStack: object,
  decoratedStackFallbacks: WeakMap<object, object>
): NestingStackAdapter {
  if (hasCompleteNestingStackSurface(nestingStack)) return nestingStack;
  return new SourceSpellingNestingStackAdapter(nestingStack, decoratedStackFallbacks);
}

function hasCompleteNestingStackSurface(value: object): value is NestingStackAdapter {
  return [
    "nesting_stack",
    "pending_function",
    "withNamespace",
    "with_namespace",
    "addBareNesting",
    "add_bare_nesting",
    "addNamespace",
    "add_namespace",
    "startNewFunctionNesting",
    "start_new_function_nesting",
    "popNesting",
    "pop_nesting",
    "currentNestingLevel",
    "current_nesting_level",
    "lastFunction",
    "last_function"
  ].every((memberName) => memberName in value);
}

/**
 * The reader context used to build one file and its function list.  It keeps
 * the mutable state that upstream readers intentionally share across stages.
 */
export class FileInfoBuilder {
  public fileinfo: FileInformation;
  public currentLine = 0;
  public forgive = false;
  public forgiveGlobal = false;
  public newline = true;
  public globalPseudoFunction: FunctionInfo;
  public currentFunction: FunctionInfo;
  public stackedFunctions: FunctionInfo[] = [];
  private nestingStack: object = new NestingStack();
  private readonly decoratedStackFallbacks = new WeakMap<object, object>();

  public constructor(filename: string) {
    this.fileinfo = new FileInformation(filename, 0);
    this.globalPseudoFunction = new FunctionInfo("*global*", filename, 0);
    this.currentFunction = this.globalPseudoFunction;
  }

  /**
   * These aliases preserve the source extension/context protocol while keeping
   * a single mutable storage location for each analyzer value.
   */
  public get current_line(): number {
    return this.currentLine;
  }

  public set current_line(value: number) {
    this.currentLine = value;
  }

  public get forgive_global(): boolean {
    return this.forgiveGlobal;
  }

  public set forgive_global(value: boolean) {
    this.forgiveGlobal = value;
  }

  public get global_pseudo_function(): FunctionInfo {
    return this.globalPseudoFunction;
  }

  public set global_pseudo_function(value: FunctionInfo) {
    this.globalPseudoFunction = value;
  }

  public get current_function(): FunctionInfo {
    return this.currentFunction;
  }

  public set current_function(value: FunctionInfo) {
    this.currentFunction = value;
  }

  public get stacked_functions(): FunctionInfo[] {
    return this.stackedFunctions;
  }

  public set stacked_functions(value: FunctionInfo[]) {
    this.stackedFunctions = value;
  }

  public get _nesting_stack(): object {
    return this.nestingStack;
  }

  public set _nesting_stack(value: object) {
    this.nestingStack = value;
  }

  public withNamespace(name: string): string {
    return this.nestingStackAdapter.withNamespace(name);
  }

  public with_namespace(name: string): string {
    return this.nestingStackAdapter.with_namespace(name);
  }

  public addBareNesting(): void {
    this.nestingStackAdapter.addBareNesting();
  }

  public add_bare_nesting(): void {
    this.nestingStackAdapter.add_bare_nesting();
  }

  public addNamespace(token: string): void {
    this.nestingStackAdapter.addNamespace(token);
  }

  public add_namespace(token: string): void {
    this.nestingStackAdapter.add_namespace(token);
  }

  public startNewFunctionNesting(functionInfo: FunctionInfo): void {
    this.nestingStackAdapter.startNewFunctionNesting(functionInfo);
  }

  public start_new_function_nesting(functionInfo: FunctionInfo): void {
    this.nestingStackAdapter.start_new_function_nesting(functionInfo);
  }

  public get currentNestingLevel(): number {
    return this.nestingStackAdapter.currentNestingLevel;
  }

  public get current_nesting_level(): number {
    return this.nestingStackAdapter.current_nesting_level;
  }

  public get lastFunction(): FunctionInfo | undefined {
    return this.nestingStackAdapter.lastFunction;
  }

  public get last_function(): FunctionInfo | undefined {
    return this.nestingStackAdapter.last_function;
  }

  /** Equivalent to Python's decorate_nesting_stack extension seam. */
  public decorateNestingStack<Decorated extends object>(
    decorateClass: NestingStackDecorator<Decorated>
  ): Decorated {
    const previousNestingStack = this.nestingStack;
    const decoratedNestingStack = new decorateClass(this.nestingStackAdapter);
    this.decoratedStackFallbacks.set(decoratedNestingStack, previousNestingStack);
    this.nestingStack = decoratedNestingStack;
    return decoratedNestingStack;
  }

  public decorate_nesting_stack<Decorated extends object>(
    decorateClass: NestingStackDecorator<Decorated>
  ): Decorated {
    return this.decorateNestingStack(decorateClass);
  }

  public popNesting(): void {
    this.finishPoppedNesting(this.nestingStackAdapter.popNesting());
  }

  public pop_nesting(): void {
    this.finishPoppedNesting(this.nestingStackAdapter.pop_nesting());
  }

  private finishPoppedNesting(nesting: Nesting | undefined): void {
    if (!(nesting instanceof FunctionInfo)) return;

    const endLine = this.currentFunction.endLine;
    this.endOfFunction();
    this.currentFunction = this.nestingStackAdapter.lastFunction ?? this.globalPseudoFunction;
    this.currentFunction.endLine = endLine;
  }

  public addNloc(count: number): void {
    this.fileinfo.nloc += count;
    this.currentFunction.nloc += count;
    this.currentFunction.endLine = this.currentLine;
    this.newline = count > 0;
  }

  public add_nloc(count: number): void {
    this.addNloc(count);
  }

  public tryNewFunction(name: string): void {
    this.currentFunction = new FunctionInfo(
      this.withNamespace(name),
      this.fileinfo.filename,
      this.currentLine
    );
    this.currentFunction.topNestingLevel = this.currentNestingLevel;
  }

  public try_new_function(name: string): void {
    this.tryNewFunction(name);
  }

  public confirmNewFunction(): void {
    this.startNewFunctionNesting(this.currentFunction);
    this.currentFunction.cyclomaticComplexity = 1;
  }

  public confirm_new_function(): void {
    this.confirmNewFunction();
  }

  public restartNewFunction(name: string): void {
    this.tryNewFunction(name);
    this.confirmNewFunction();
  }

  public restart_new_function(name: string): void {
    this.restartNewFunction(name);
  }

  public pushNewFunction(name: string): void {
    this.stackedFunctions.push(this.currentFunction);
    this.restartNewFunction(name);
  }

  public push_new_function(name: string): void {
    this.pushNewFunction(name);
  }

  public addCondition(increment = 1): void {
    this.currentFunction.cyclomaticComplexity += increment;
  }

  public add_condition(increment = 1): void {
    this.addCondition(increment);
  }

  /** Source lizardnd.py's monkey-patched FileInfoBuilder method surface. */
  public addNdCondition(increment = 1): number {
    this.currentFunction.nestingDepth += increment;
    const nestingDepth = this.currentFunction.nestingDepth;
    if (this.currentFunction.maxNestingDepth < nestingDepth) {
      this.currentFunction.maxNestingDepth = nestingDepth;
    }
    return nestingDepth;
  }

  public add_nd_condition(increment = 1): number {
    return this.addNdCondition(increment);
  }

  public resetNdComplexity(): void {
    this.currentFunction.nestingDepth = 0;
    this.currentFunction.hiddenBracket = 0;
    this.currentFunction.bracketLoop = false;
    this.currentFunction.prevWasElse = false;
    this.resetConditionTracking();
  }

  public reset_nd_complexity(): void {
    this.resetNdComplexity();
  }

  public addHiddenBracketCondition(increment = 1): void {
    this.currentFunction.hiddenBracket += increment;
  }

  public add_hidden_bracket_condition(increment = 1): void {
    this.addHiddenBracketCondition(increment);
  }

  public getHiddenBracket(): number {
    return this.currentFunction.hiddenBracket;
  }

  public get_hidden_bracket(): number {
    return this.getHiddenBracket();
  }

  public loopBracketStatus(): void {
    this.currentFunction.bracketLoop = !this.currentFunction.bracketLoop;
  }

  public loop_bracket_status(): void {
    this.loopBracketStatus();
  }

  public getLoopStatus(): boolean {
    return this.currentFunction.bracketLoop;
  }

  public get_loop_status(): boolean {
    return this.getLoopStatus();
  }

  public setInCondition(inCondition: boolean): void {
    this.currentFunction.inCondition = inCondition;
  }

  public set_in_condition(inCondition: boolean): void {
    this.setInCondition(inCondition);
  }

  public getInCondition(): boolean {
    return this.currentFunction.inCondition;
  }

  public get_in_condition(): boolean {
    return this.getInCondition();
  }

  public incrementConditionDepth(): void {
    this.currentFunction.conditionDepth += 1;
  }

  public increment_condition_depth(): void {
    this.incrementConditionDepth();
  }

  public decrementConditionDepth(): void {
    if (this.currentFunction.conditionDepth > 0) this.currentFunction.conditionDepth -= 1;
  }

  public decrement_condition_depth(): void {
    this.decrementConditionDepth();
  }

  public getConditionDepth(): number {
    return this.currentFunction.conditionDepth;
  }

  public get_condition_depth(): number {
    return this.getConditionDepth();
  }

  public resetConditionTracking(): void {
    this.currentFunction.inCondition = false;
    this.currentFunction.conditionDepth = 0;
    this.currentFunction.logicalOperatorAdded = false;
  }

  public reset_condition_tracking(): void {
    this.resetConditionTracking();
  }

  public setLogicalOperatorAdded(added: boolean): void {
    this.currentFunction.logicalOperatorAdded = added;
  }

  public set_logical_operator_added(added: boolean): void {
    this.setLogicalOperatorAdded(added);
  }

  public getLogicalOperatorAdded(): boolean {
    return this.currentFunction.logicalOperatorAdded;
  }

  public get_logical_operator_added(): boolean {
    return this.getLogicalOperatorAdded();
  }

  public setPrevWasElse(value: boolean): void {
    this.currentFunction.prevWasElse = value;
  }

  public set_prev_was_else(value: boolean): void {
    this.setPrevWasElse(value);
  }

  public getPrevWasElse(): boolean {
    return this.currentFunction.prevWasElse;
  }

  public get_prev_was_else(): boolean {
    return this.getPrevWasElse();
  }

  public clearPrevWasElse(): void {
    this.currentFunction.prevWasElse = false;
  }

  public clear_prev_was_else(): void {
    this.clearPrevWasElse();
  }

  public addToLongFunctionName(appended: string): void {
    this.currentFunction.addToLongName(appended);
  }

  public add_to_long_function_name(appended: string): void {
    this.addToLongFunctionName(appended);
  }

  public addToFunctionName(appended: string): void {
    this.currentFunction.addToFunctionName(appended);
  }

  public add_to_function_name(appended: string): void {
    this.addToFunctionName(appended);
  }

  public parameter(token: string): void {
    this.currentFunction.addParameter(token);
  }

  public endOfFunction(): void {
    if (!this.forgive) {
      if (this.currentFunction.name !== "*global*" || !this.forgiveGlobal) {
        this.fileinfo.functionList.push(this.currentFunction);
      }
    }
    this.forgive = false;
    this.currentFunction = this.stackedFunctions.pop() ?? this.globalPseudoFunction;
  }

  public end_of_function(): void {
    this.endOfFunction();
  }

  private get nestingStackAdapter(): NestingStackAdapter {
    return asNestingStackAdapter(this.nestingStack, this.decoratedStackFallbacks);
  }
}

/** Upstream preprocessing: delegate to a reader or discard non-newline space. */
export function preprocessing(tokens: TokenStream, reader: AnalyzerReader): TokenStream {
  return reader.preprocess?.(tokens) ?? withoutWhitespace(tokens);
}

/** Upstream comment directive and generated-code handling. */
export function* commentCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  for (const token of tokens) {
    const comment = reader.getCommentFromToken(token);
    if (comment === undefined) {
      yield token;
      continue;
    }

    for (const _line of splitPythonLines(comment).slice(1)) {
      yield "\n";
    }

    const strippedComment = stripPythonWhitespace(comment);
    if (strippedComment.startsWith("#lizard forgive global")) {
      reader.context.forgiveGlobal = true;
    } else if (strippedComment.startsWith("#lizard forgives(")) {
      const metricMatch = /#lizard forgives?\(([^)]*)\)/u.exec(strippedComment);
      if (metricMatch?.[1]) {
        for (const metric of metricMatch[1].split(",")) {
          const trimmedMetric = stripPythonWhitespace(metric);
          if (trimmedMetric) reader.context.currentFunction.forgivenMetrics.add(trimmedMetric);
        }
      }
    } else if (strippedComment.startsWith("#lizard forgive")) {
      reader.context.forgive = true;
    }

    if (comment.includes("GENERATED CODE")) return;
  }
}

/** Upstream non-comment source-line counting. */
export function* lineCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  const { context } = reader;
  context.currentLine = 1;
  let newline = 1;

  for (const token of tokens) {
    if (token === "\n") {
      context.currentLine += 1;
      newline = 1;
      continue;
    }

    const embeddedNewlineCount = token.split("\n").length - 1;
    context.currentLine += embeddedNewlineCount;
    context.addNloc(embeddedNewlineCount + newline);
    newline = 0;
    yield token;
  }
}

/** Upstream file and current-function token counting. */
export function* tokenCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  const { context } = reader;
  for (const token of tokens) {
    context.fileinfo.tokenCount += 1;
    context.currentFunction.tokenCount += 1;
    yield token;
  }
}

/** Upstream cyclomatic-condition counting. */
export function* conditionCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  for (const token of tokens) {
    if (reader.conditions.has(token)) reader.context.addCondition();
    yield token;
  }
}

/** The ordered default processor list from lizard.py:get_extensions. */
export const DEFAULT_TOKEN_PROCESSORS: readonly TokenProcessor[] = Object.freeze([
  preprocessing,
  commentCounter,
  lineCounter,
  tokenCounter,
  conditionCounter
]);

/**
 * Drives the in-memory half of upstream FileAnalyzer.  Reader registry and
 * filesystem decoding stay at the product integration boundary, so callers
 * supply the concrete reader explicitly.
 */
export class FileAnalyzer {
  public readonly processors: readonly AnalyzerProcessor[];

  public constructor(processors: readonly AnalyzerProcessor[] = DEFAULT_TOKEN_PROCESSORS) {
    this.processors = processors;
  }

  public analyzeSourceCode<Reader extends AnalyzerReader>(
    filename: string,
    sourceCode: string,
    Reader: ReaderConstructor<Reader>
  ): FileInformation {
    const context = new FileInfoBuilder(filename);
    const reader = new Reader(context);
    let tokens = Reader.generateTokens(sourceCode);

    try {
      for (const processor of this.processors) tokens = applyProcessor(processor, tokens, reader);
      for (const _token of reader.__call__(tokens, reader)) {
        // The reader drives its state machine while the in-memory pipeline drains.
      }
    } catch (error: unknown) {
      if (!isRecursionLimit(error)) throw error;
    }

    return context.fileinfo;
  }

  /** Source `analyze_source_code` spelling retained for translated extension/core callers. */
  public analyze_source_code<Reader extends AnalyzerReader>(
    filename: string,
    sourceCode: string,
    Reader: ReaderConstructor<Reader>
  ): FileInformation {
    return this.analyzeSourceCode(filename, sourceCode, Reader);
  }
}

/** The source-aligned default analyzer has only the five core processors. */
export const DEFAULT_FILE_ANALYZER = new FileAnalyzer(DEFAULT_TOKEN_PROCESSORS);

/**
 * One already-admitted source unit at the in-memory boundary. File discovery,
 * decoding and reader selection stay outside this source-aligned core.
 */
export interface InMemoryAnalyzerFile {
  readonly filename: string;
  readonly sourceCode: string;
  readonly reader: ReaderConstructor;
}

/**
 * Source-aligned `map_files_to_analyzer` after the explicitly excluded file
 * opening/multiprocessing entry surface has supplied in-memory source units.
 */
export function mapFilesToAnalyzer(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer,
  workingThreads: number
): Iterable<FileInformation> {
  // The Product owns Worker scheduling. Retain the source argument/lifecycle
  // without creating a second analyzer-level concurrency framework.
  void workingThreads;
  return mapInMemoryFiles(files, analyzer);
}

/** Source `map_files_to_analyzer` spelling for the retained in-memory lifecycle. */
export function map_files_to_analyzer(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer,
  workingThreads: number
): Iterable<FileInformation> {
  return mapFilesToAnalyzer(files, analyzer, workingThreads);
}

/**
 * Source-aligned `analyze_files` lifecycle. `exts` intentionally uses Python
 * truthiness: an omitted or empty list receives the five default processors.
 */
export function analyzeFiles(
  files: Iterable<InMemoryAnalyzerFile>,
  threads = 1,
  exts?: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  const extensions = exts !== undefined && exts.length > 0 ? exts : [...DEFAULT_TOKEN_PROCESSORS];
  const fileAnalyzer = new FileAnalyzer(extensions);
  let result: Iterable<FileInformation> | undefined = mapFilesToAnalyzer(
    files,
    fileAnalyzer,
    threads
  );
  for (const extension of extensions) {
    const outcome = invokeExtensionCrossFileProcessOutcome(extension, result);
    if (outcome.hookPresent) result = outcome.result;
  }
  return result;
}

/** Source `analyze_files` spelling for translated internal callers. */
export function analyze_files(
  files: Iterable<InMemoryAnalyzerFile>,
  threads = 1,
  exts?: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  return analyzeFiles(files, threads, exts);
}

/**
 * Apply source registration-order cross-file passes. A present hook replaces
 * the stream even when it returns undefined; only an absent hook is skipped.
 */
export function applyCrossFileProcessors(
  fileInfos: Iterable<FileInformation>,
  processors: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  let processedFileInfos: Iterable<FileInformation> | undefined = fileInfos;
  for (const processor of processors) {
    const outcome = invokeExtensionCrossFileProcessOutcome(processor, processedFileInfos);
    if (outcome.hookPresent) processedFileInfos = outcome.result;
  }
  return processedFileInfos;
}

/** Forward the internal parser seam to extensions in source registration order. */
export function registerExtensionArguments(
  processors: readonly AnalyzerProcessor[],
  parser: ExtensionArgumentRegistrar
): void {
  for (const processor of processors) {
    invokeExtensionSetArgs(processor, parser);
  }
}

/** One mutable source `OutputScheme.items` dictionary equivalent. */
export interface OutputSchemeItem {
  caption?: string;
  value: string;
  avg_caption?: string;
}

/**
 * Lizard's extension-owned output schema. The class remains analyzer-internal:
 * report invocation stays in the separately excluded CLI/report entry surface.
 */
export class OutputScheme {
  public extensions: readonly AnalyzerProcessor[];
  public items: OutputSchemeItem[];

  public constructor(ext: readonly AnalyzerProcessor[]) {
    this.extensions = ext;
    this.items = [
      { caption: "  NLOC  ", value: "nloc", avg_caption: " Avg.NLOC " },
      { caption: "  CCN  ", value: "cyclomatic_complexity", avg_caption: " AvgCCN " },
      { caption: " token ", value: "token_count", avg_caption: " Avg.token " },
      { caption: " PARAM ", value: "parameter_count" },
      { caption: " length ", value: "length" },
      ...Array.from(this._ext_member_info(), ([caption, value, averageCaption]) => ({
        caption,
        value,
        // The source owns the key even when its value is None. That key controls
        // `patch_for_extensions`, so keep the JavaScript property present too.
        avg_caption: averageCaption
      }))
    ];
    this.items.push({ caption: " location  ", value: "location" });
  }

  public patch_for_extensions(): void {
    for (const item of this.items) {
      if (!("avg_caption" in item)) continue;
      const name = item.value;
      Object.defineProperty(FileInformation.prototype, `average_${name}`, {
        configurable: true,
        get(this: FileInformation): number {
          return this.functions_average(name);
        }
      });
    }
  }

  public patchForExtensions(): void {
    this.patch_for_extensions();
  }

  public any_silent(): boolean {
    return this.extensions.some(
      (extension) => extensionMetadata(extension).silent_all_others !== undefined
    );
  }

  public anySilent(): boolean {
    return this.any_silent();
  }

  public value_columns(): string[] {
    return this.items.map((item) => item.value);
  }

  public valueColumns(): string[] {
    return this.value_columns();
  }

  public *_ext_member_info(): Generator<[string | undefined, string, string | undefined]> {
    for (const extension of this.extensions) {
      const functionInfo = extensionMetadata(extension).FUNCTION_INFO;
      if (functionInfo === undefined) continue;
      for (const [name, definition] of Object.entries(functionInfo)) {
        yield [definition.caption, name, definition.average_caption];
      }
    }
  }

  public *extMemberInfo(): Generator<[string | undefined, string, string | undefined]> {
    yield* this._ext_member_info();
  }

  public captions(): string {
    return this.items.flatMap((item) => (item.caption ? [item.caption] : [])).join("");
  }

  public static _head(captions: string): string {
    const width = Array.from(captions).length;
    return ["=".repeat(width), captions, "-".repeat(width)].join("\n");
  }

  public function_info_head(): string {
    return OutputScheme._head(this.captions());
  }

  public functionInfoHead(): string {
    return this.function_info_head();
  }

  public function_info(functionInfo: FunctionInfo): string {
    let rendered = "";
    for (const item of this.items) {
      if (!item.caption) continue;
      rendered += pythonRightJustify(
        pythonString(readFunctionInfoAttribute(functionInfo, item.value)),
        Array.from(item.caption).length
      );
    }
    return rendered;
  }

  public functionInfo(functionInfo: FunctionInfo): string {
    return this.function_info(functionInfo);
  }

  public average_captions(): string {
    return this.items.flatMap((item) => (item.avg_caption ? [item.avg_caption] : [])).join("");
  }

  public averageCaptions(): string {
    return this.average_captions();
  }

  public average_formatter(): string {
    return this.items
      .flatMap((item) => {
        if (!item.avg_caption) return [];
        return [`{module.average_${item.value}:${Array.from(item.avg_caption).length}.1f}`];
      })
      .join("");
  }

  public averageFormatter(): string {
    return this.average_formatter();
  }

  public clang_warning_format(): string {
    return (
      "{f.filename}:{f.start_line}: warning: {f.name} has {f.nloc} NLOC, " +
      "{f.cyclomatic_complexity} CCN, {f.token_count} token, {f.parameter_count} PARAM, " +
      "{f.length} length, {f.max_nesting_depth} ND"
    );
  }

  public clangWarningFormat(): string {
    return this.clang_warning_format();
  }

  public msvs_warning_format(): string {
    return (
      "{f.filename}({f.start_line}): warning: {f.name} ({f.long_name}) has " +
      this.items
        .slice(0, -1)
        .map((item) => `{f.${item.value}} ${outputCaption(item.caption)}`)
        .join(", ")
    );
  }

  public msvsWarningFormat(): string {
    return this.msvs_warning_format();
  }
}

/** Compatibility bridge for existing internal callers of OutputScheme metadata. */
export function collectFunctionInfoDefinitions(
  processors: readonly AnalyzerProcessor[]
): readonly FunctionInfoDefinitionEntry[] {
  const definitions: FunctionInfoDefinitionEntry[] = [];
  for (const processor of processors) {
    const functionInfo = extensionMetadata(processor).FUNCTION_INFO;
    if (functionInfo === undefined) continue;
    for (const [name, definition] of Object.entries(functionInfo)) {
      definitions.push({ name, definition });
    }
  }
  return definitions;
}

/** Compatibility bridge for the source `OutputScheme.patch_for_extensions` lifecycle. */
export function patchFunctionInfoAverages(processors: readonly AnalyzerProcessor[]): void {
  new OutputScheme(processors).patch_for_extensions();
}

/** Compatibility bridge for the source `OutputScheme.any_silent` lifecycle. */
export function hasSilentAllOthers(processors: readonly AnalyzerProcessor[]): boolean {
  return new OutputScheme(processors).any_silent();
}

/** Invoke extension result hooks in source registration order. */
export function printExtensionResults(processors: readonly AnalyzerProcessor[]): void {
  for (const processor of processors) {
    invokeExtensionPrintResult(processor);
  }
}

/** Source `print_extension_results` spelling for the retained hook lifecycle. */
export function print_extension_results(processors: readonly AnalyzerProcessor[]): void {
  printExtensionResults(processors);
}

/** One entry from an extension's source-aligned FUNCTION_INFO mapping. */
export interface FunctionInfoDefinitionEntry {
  readonly name: string;
  readonly definition: FunctionInfoDefinition;
}

/**
 * Analyze an already-supplied source string with one explicit reader. This is
 * intentionally in-memory: registry fallback, filesystem reads, and report
 * rendering remain later integration work.
 */
export function analyzeSourceCode<Reader extends AnalyzerReader>(
  filename: string,
  sourceCode: string,
  Reader: ReaderConstructor<Reader>,
  processors: readonly AnalyzerProcessor[] = DEFAULT_TOKEN_PROCESSORS
): FileInformation {
  if (processors === DEFAULT_TOKEN_PROCESSORS) {
    return DEFAULT_FILE_ANALYZER.analyzeSourceCode(filename, sourceCode, Reader);
  }
  return new FileAnalyzer(processors).analyzeSourceCode(filename, sourceCode, Reader);
}

function* mapInMemoryFiles(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer
): Generator<FileInformation> {
  for (const file of files) {
    yield analyzer.analyze_source_code(file.filename, file.sourceCode, file.reader);
  }
}

function readFunctionInfoAttribute(functionInfo: FunctionInfo, attribute: string): unknown {
  if (!(attribute in functionInfo)) throw new AttributeError("FunctionInfo", attribute);
  return Reflect.get(functionInfo, attribute);
}

function pythonString(value: unknown): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  // oxlint-disable-next-line typescript/no-base-to-string -- Python's str() deliberately dispatches dynamic extension metric values.
  return String(value);
}

function pythonRightJustify(value: string, width: number): string {
  const characterCount = Array.from(value).length;
  return characterCount >= width ? value : `${" ".repeat(width - characterCount)}${value}`;
}

function outputCaption(caption: string | undefined): string {
  if (caption === undefined) throw new AttributeError("NoneType", "strip");
  return stripPythonWhitespace(caption);
}

function applyProcessor(
  processor: AnalyzerProcessor,
  tokens: TokenStream,
  reader: AnalyzerReader
): TokenStream {
  return typeof processor === "function"
    ? processor(tokens, reader)
    : invokeExtensionCall(processor, tokens, reader);
}

function isRecursionLimit(error: unknown): boolean {
  return (
    error instanceof RangeError &&
    (error.message.includes("call stack") || error.message.toLowerCase().includes("recursion"))
  );
}

function* withoutWhitespace(tokens: TokenStream): Generator<string> {
  for (const token of tokens) {
    if (!isPythonWhitespace(token) || token === "\n") yield token;
  }
}
