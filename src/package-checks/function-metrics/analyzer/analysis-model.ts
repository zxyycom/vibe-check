/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard.py FunctionInfo and FileInformation; lizard_ext/lizardcomplextags.py
 * and lizard_ext/lizardnd.py FunctionInfo lifecycle seams.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * Modified: mutable analysis result state isolated from execution and reporting.
 */

export class AttributeError extends Error {
  public constructor(targetName: string, attributeName: string) {
    super(`'${targetName}' object has no attribute '${attributeName}'`);
    this.name = "AttributeError";
  }
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
