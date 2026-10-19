import { execSync } from "node:child_process";

// Workers Builds runs the repository build command before Wrangler deploys.
// OpenNext calls build:next directly, so this entry point does not recurse.
const command =
  process.env.WORKERS_CI === "1"
    ? "npm exec -- opennextjs-cloudflare build"
    : "npm run build:next";

execSync(command, { stdio: "inherit" });

