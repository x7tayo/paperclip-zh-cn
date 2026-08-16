/**
 * 词典匹配器。
 *
 * 支持两类词条：
 *  - 精确词条：key 为归一化后的英文原文，命中则整体替换为中文。
 *  - 模板词条：key 含 {{name}} 占位符（如 "{{count}} issues"），
 *    匹配时捕获占位符内容并在中文模板中还原。
 *
 * 匹配策略：只做"整节点全文匹配"，绝不子串替换，避免误伤代码/ID。
 */
export type Dictionary = Record<string, string>;

export interface CompiledDict {
  /** 归一化英文 → 中文 */
  exact: Map<string, string>;
  /** 模板词条：正则 + 占位符名序列 + 中文模板 */
  templates: Array<{ pattern: RegExp; names: string[]; zh: string }>;
}

export function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 把模板 key 编译为正则：{{name}} → 捕获组，其余部分逐字转义。 */
function compileTemplateKey(key: string): { pattern: RegExp; names: string[] } {
  const names: string[] = [];
  let source = "";
  let last = 0;
  for (const m of key.matchAll(PLACEHOLDER_RE)) {
    source += escapeRegExp(key.slice(last, m.index));
    names.push(m[1]);
    source += "([\\s\\S]+?)";
    last = (m.index ?? 0) + m[0].length;
  }
  source += escapeRegExp(key.slice(last));
  return { pattern: new RegExp("^" + source + "$"), names };
}

export function compileDictionary(dict: Dictionary): CompiledDict {
  const exact = new Map<string, string>();
  const templates: CompiledDict["templates"] = [];
  for (const [key, zh] of Object.entries(dict)) {
    if (!zh || typeof zh !== "string") continue;
    const normalizedKey = normalize(key);
    if (normalizedKey.includes("{{")) {
      const { pattern, names } = compileTemplateKey(normalizedKey);
      templates.push({ pattern, names, zh });
    } else {
      exact.set(normalizedKey, zh);
    }
  }
  // 模板按占位符数量从少到多排序，少的优先（更精确）
  templates.sort((a, b) => a.names.length - b.names.length);
  return { exact, templates };
}

function fillTemplate(zh: string, names: string[], captured: string[]): string {
  // zh 模板的占位符与 key 一一对应，按位置填充最可靠
  let i = 0;
  return zh.replace(PLACEHOLDER_RE, () => {
    const val = captured[i];
    i += 1;
    return val !== undefined ? val : "";
  });
}

/** 查找可见文本的中文翻译；未命中返回 null。 */
export function lookupText(compiled: CompiledDict, raw: string): string | null {
  const key = normalize(raw);
  if (!key || key.length < 2) return null;
  if (!/[A-Za-z]/.test(key)) return null;
  const hit = compiled.exact.get(key);
  if (hit !== undefined) return hit;
  for (const t of compiled.templates) {
    const m = t.pattern.exec(key);
    if (m) {
      return fillTemplate(t.zh, t.names, m.slice(1));
    }
  }
  return null;
}

/** 查找属性值的中文翻译（placeholder/title/aria-label/alt 等）。 */
export function lookupAttr(compiled: CompiledDict, raw: string): string | null {
  return lookupText(compiled, raw);
}
