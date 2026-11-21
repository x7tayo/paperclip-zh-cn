/**
 * 词典构建脚本：合并 dictionary/batch-*.json → src/ui/dictionary/zh-cn.ts
 *
 * 用法：node scripts/build-dictionary.mjs
 * 校验：模板词条的 {{占位符}} 必须与英文 key 一致；非法词条会被剔除并报告。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const dictDir = resolve(__dirname, "..", "dictionary");
const outFile = resolve(__dirname, "..", "src", "ui", "dictionary", "zh-cn.ts");

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

function placeholders(s) {
  return [...s.matchAll(PLACEHOLDER_RE)].map((m) => m[1]).sort().join(",");
}

const merged = {};
let batches = 0;
for (const name of readdirSync(dictDir).sort((a, b) => a.localeCompare(b, "en", { numeric: true }))) {
  if (!/^batch-\d+\.json$/.test(name)) continue;
  const data = JSON.parse(readFileSync(join(dictDir, name), "utf8"));
  batches += 1;
  for (const [key, zh] of Object.entries(data)) {
    if (typeof zh !== "string" || !zh.trim()) continue;
    if (placeholders(key) !== placeholders(zh)) {
      console.warn("占位符不一致，跳过:", key, "→", zh);
      continue;
    }
    merged[key] = zh;
  }
}

const keys = Object.keys(merged).sort((a, b) => a.localeCompare(b));
const lines = [
  "/**",
  " * 中英词典（英文原文 → 中文）。由 scripts/build-dictionary.mjs 自动生成，",
  " * 翻译数据源为 dictionary/batch-*.json。请勿手工编辑本文件。",
  " */",
  "export const zhCnDictionary: Record<string, string> = {",
];
for (const k of keys) {
  const esc = k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escZh = merged[k].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  lines.push(`  "${esc}": "${escZh}",`);
}
lines.push("};", "");

writeFileSync(outFile, lines.join("\n"));
console.log("合并批次:", batches, "| 词条总数:", keys.length);
console.log("输出:", outFile);
