const { readFileSync } = require("fs");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);

if (args[0] === "db" && args[1] === "push") {
  const result = spawnSync("sqlite3", ["prisma/dev.db"], {
    input: readFileSync("prisma/init.sql"),
    stdio: ["pipe", "inherit", "inherit"]
  });
  process.exit(result.status ?? 1);
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpm, ["exec", "prisma", ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);
