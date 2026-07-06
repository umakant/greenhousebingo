/* eslint-disable no-console */
/**
 * Removes .next so the next dev run does a full rebuild (fixes ENOENT build-manifest.json).
 * Usage: node scripts/clean-next.js
 */
const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
if (fs.existsSync(nextDir)) {
  // maxRetries helps Windows when another process still has files open under .next
  fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log("Removed .next");
} else {
  console.log("No .next folder to remove.");
}
