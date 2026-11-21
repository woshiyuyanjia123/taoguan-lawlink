#!/usr/bin/env node
/**
 * 跨平台 Next.js 启动包装器（兼容 Windows PowerShell / CMD / macOS / Linux）。
 * 自动设置 NEXT_DIST_DIR，免去对 POSIX 环境变量前缀或外部 cross-env 包的依赖。
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [distDir, ...nextArgs] = process.argv.slice(2);

if (!distDir || nextArgs.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <distDir> <next-subcommand> [...args]");
  process.exit(1);
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || distDir
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
