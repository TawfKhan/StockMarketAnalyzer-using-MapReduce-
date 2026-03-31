const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

for (const lockFile of ["package-lock.json", "yarn.lock"]) {
  const lockPath = path.join(root, lockFile);
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {
    // Best-effort cleanup.
  }
}

const userAgent = process.env.npm_config_user_agent ?? "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
