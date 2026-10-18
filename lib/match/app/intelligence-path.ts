import path from "path";

/** Frozen reference directory used by admin Match Checkpoint A. */
export function matchReferenceDirectory(): string {
  return path.join(
    process.cwd(),
    "docs/teevo-match/driver-match-v1.1/reference"
  );
}
