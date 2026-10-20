// Studio 600-LOC limit for staged files. A node script instead of an inline
// shell loop: lefthook on Windows word-splits multi-line `run` scripts.
import { readFileSync } from "node:fs";

const MAX_LINES = 600;
let failed = false;
for (const file of process.argv.slice(2)) {
  if (/\.test\.tsx?$|\.generated\./.test(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n").length - 1;
  if (lines > MAX_LINES) {
    console.error(`ERROR: ${file} has ${lines} lines (max ${MAX_LINES})`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
