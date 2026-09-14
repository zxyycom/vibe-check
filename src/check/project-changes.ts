/** 已配置的 project change preparation 产生的 file-centric evidence。 */
export type ProjectChanges = Readonly<
  | {
      readonly ok: true;
      readonly files: readonly Readonly<{
        readonly path: string;
        readonly flags: readonly string[];
      }>[];
    }
  | {
      readonly ok: false;
      readonly reason: Readonly<{ readonly code: string }>;
    }
>;
