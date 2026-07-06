/**
 * Windows often hits EPERM when Prisma renames query_engine-windows.dll.node while another
 * process (Next dev, IDE, antivirus) holds a lock. Removing node_modules/.prisma first helps.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const prismaDir = path.join(root, "node_modules", ".prisma");

if (fs.existsSync(prismaDir)) {
  console.log("[prisma-clean-generate] Removing node_modules/.prisma …");
  fs.rmSync(prismaDir, { recursive: true, force: true });
}

const r = spawnSync(process.execPath, [path.join(__dirname, "prisma-with-env.js"), "generate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(r.status ?? 1);
