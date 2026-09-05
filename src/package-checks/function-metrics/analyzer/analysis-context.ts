/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard.py nesting stack and FileInfoBuilder lifecycle;
 * lizard_ext/lizardnd.py typed FileInfoBuilder lifecycle seam.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * Modified: mutable analysis context isolated from result models and pipeline.
 */

import {
  FunctionInfo,
  FileInformation,
  Nesting,
  Namespace,
  BARE_NESTING
} from "./analysis-model.ts";

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
        return {
          owner: candidate,
          value: Reflect.get(candidate, preferredName)
        };
      }
      if (fallbackName in candidate) {
        return {
          owner: candidate,
          value: Reflect.get(candidate, fallbackName)
        };
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
