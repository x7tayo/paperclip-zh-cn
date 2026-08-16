/**
 * 字符串提取脚本（只读扫描上游 UI 源码，绝不修改上游）。
 *
 * 用法：
 *   node scripts/extract-strings.mjs [上游ui目录] [输出文件]
 *
 * 默认上游目录：../paperclip_repo/ui/src （相对本脚本）
 * 输出：dictionary/extracted-strings.json（唯一英文文案数组，归一化后）
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const UPSTREAM_DEFAULT = resolve(__dirname, "..", "..", "paperclip_repo", "ui", "src");
const OUT_DEFAULT = resolve(__dirname, "..", "dictionary", "extracted-strings.json");

const upstreamDir = process.argv[2] ? resolve(process.argv[2]) : UPSTREAM_DEFAULT;
const outFile = process.argv[3] ? resolve(process.argv[3]) : OUT_DEFAULT;

const SKIP_DIR = /(^|\\)(node_modules|dist|__tests__|fixtures|storybook)(\\|$)/;
const SKIP_FILE = /(\.(test|spec|stories|fixtures)\.[jt]sx?$)|(\.test-d\.[jt]s$)/;

const TEXT_NODE_RE = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
const ATTR_RE = /\b(placeholder|title|aria-label|alt|label)\s*=\s*("([^"\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*')/g;
const TOAST_RE = /\b(?:toast|showToast|notify|addToast)\(\s*(["'])([^"'\n]{2,300})\1/g;

function collectFiles(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.test(entry.name)) continue;
      collectFiles(full, acc);
    } else if (entry.isFile()) {
      if (extname(entry.name) !== ".tsx" && extname(entry.name) !== ".ts") continue;
      if (SKIP_FILE.test(entry.name)) continue;
      acc.push(full);
    }
  }
  return acc;
}

function unquote(raw) {
  const m = raw.match(/^(["'])([\s\S]*)\1$/);
  return m ? m[2] : raw;
}

function normalize(s) {
  return s.replace(/\s+/g, " ").trim();
}

// 反引号字符，避免在正则里手写
const BACKTICK = String.fromCharCode(96);

function filter(s) {
  const v = normalize(s);
  if (v.length < 2 || v.length > 300) return null;
  if (!/[A-Za-z]/.test(v)) return null;
  if (/\$\{/.test(v)) return null;                        // 模板表达式
  if (/[<>{};]/.test(v)) return null;                        // 残留标记/代码
  if (/\{\{/.test(v)) return null;                         // 原始插值模板
  if (/\/\//.test(v)) return null;                         // 代码注释
  if (/\/\*/.test(v)) return null;                         // 块注释
  if (/=>/.test(v)) return null;                             // 箭头函数
  if (/&&/.test(v) || /\|\|/.test(v)) return null;         // 逻辑表达式
  if (v.includes(BACKTICK)) return null;                     // 模板字面量
  if (/^[\/#.@]/.test(v)) return null;                      // 路径/命令/锚点
  if (/^[)\]}\(]/.test(v)) return null;                    // 代码片段开头
  if (/^(https?:|mailto:|tel:)/i.test(v)) return null;       // URL/邮件
  if (/\b(font|color|background|border|margin|padding|display|width|height|position|top|left|right|bottom|flex|grid|gap|z-|opacity|overflow|transform|transition|animation|shadow|rounded|text-|bg-|px-|py-|m-|p-|w-|h-|max-w|min-w|items-|justify-|self-|place-|content-|leading-|tracking-|whitespace-|break-|truncate|line-clamp|aspect-|object-|select-none|pointer-events|cursor-|border-|ring-|divide-|space-x|space-y)-/i.test(v)) return null; // tailwind/样式
  if (/\.[a-z]{1,6}$/.test(v)) return null;                 // 文件名
  if (/^[a-zA-Z0-9_.-]+$/.test(v) && /^[a-z]/.test(v) && /[_-]/.test(v)) return null; // kebab/snake 标识符
  if (/^\d/.test(v) && !/[A-Za-z]{2,}/.test(v)) return null;
  if (/=/.test(v)) return null;                              // 赋值/对象片段
  if (/^[a-z]{1,4}$/.test(v)) return null;                   // 纯小写短单词（碎片风险）
  return v;
}

function extractFromSource(src, isTsx, set) {
  if (isTsx) {
    let m;
    TEXT_NODE_RE.lastIndex = 0;
    while ((m = TEXT_NODE_RE.exec(src)) !== null) {
      const f = filter(m[1]);
      if (f) set.add(f);
    }
  }
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(src)) !== null) {
    const f = filter(unquote(m[2]));
    if (f) set.add(f);
  }
  TOAST_RE.lastIndex = 0;
  while ((m = TOAST_RE.exec(src)) !== null) {
    const f = filter(m[2]);
    if (f) set.add(f);
  }
}

const files = collectFiles(upstreamDir, []);
const strings = new Set();
for (const file of files) {
  const src = readFileSync(file, "utf8");
  extractFromSource(src, extname(file) === ".tsx", strings);
}

const sorted = [...strings].sort((a, b) => a.length - b.length);
writeFileSync(outFile, JSON.stringify(sorted, null, 0) + "\n");
console.log("扫描文件数:", files.length);
console.log("提取唯一文案:", sorted.length);
console.log("输出:", outFile);
