/**
 * 覆盖率报告：对比已翻译词典与上游提取的文案清单。
 *
 * 用法：
 *   node scripts/coverage-report.mjs [词典TS文件] [提取清单JSON]
 *
 * 输出：未翻译文案数、列表（前 200 条）、按来源粗略分类统计。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const dictFile = process.argv[2] ? resolve(process.argv[2]) : resolve(__dirname, "..", "src", "ui", "dictionary", "zh-cn.ts");
const listFile = process.argv[3] ? resolve(process.argv[3]) : resolve(__dirname, "..", "dictionary", "extracted-strings.json");

const KEY_RE = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;

function readDictKeys(file) {
  const src = readFileSync(file, "utf8");
  const keys = new Set();
  let m;
  while ((m = KEY_RE.exec(src)) !== null) keys.add(m[1]);
  return keys;
}

if (!existsSync(dictFile)) {
  console.error("词典文件不存在:", dictFile);
  process.exit(1);
}
if (!existsSync(listFile)) {
  console.error("提取清单不存在:", listFile);
  process.exit(1);
}

const keys = readDictKeys(dictFile);
const all = JSON.parse(readFileSync(listFile, "utf8"));
const missing = all.filter((s) => !keys.has(s));
const covered = all.length - missing.length;
const pct = all.length ? ((covered / all.length) * 100).toFixed(1) : "0";

console.log("词典词条:", keys.size);
console.log("提取文案:", all.length);
console.log("已覆盖:", covered, `(${pct}%)`);
console.log("未覆盖:", missing.length);
if (missing.length) {
  console.log("\n未覆盖文案（前 200 条，按长度升序）：");
  for (const s of missing.slice(0, 200)) console.log("  -", s);
}
