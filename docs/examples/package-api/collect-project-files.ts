// #region package-api-example:collect-project-files
import { collectProjectFiles, defaultProjectFileSelection } from "@zxyycom/vibe-check";

const selectedPaths = collectProjectFiles({
  projectRoot: ".",
  selection: {
    ...defaultProjectFileSelection,
    patterns: ["src/**/*.ts", "!**/fixtures/**"]
  }
});

if (!Object.isFrozen(selectedPaths)) {
  throw new Error("Expected an immutable project-file snapshot");
}
// #endregion package-api-example:collect-project-files
