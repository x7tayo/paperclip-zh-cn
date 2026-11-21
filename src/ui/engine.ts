/**
 * 全局翻译引擎 —— 汉化插件的核心。
 *
 * 机制：
 *  1. 挂载点：sidebarPanel 槽位在每个已登录页面渲染，组件挂载时调用 startEngine。
 *  2. MutationObserver 监听 document.body（childList + characterData + 目标属性），
 *     经 requestAnimationFrame 批量处理新增/变化节点。
 *  3. 文本节点：整节点归一化后查词典，命中则整体替换为中文。
 *  4. 属性节点：placeholder / title / aria-label / alt 的取值查词典替换。
 *  5. document.title：定时（800ms）同步一次，覆盖页面标题。
 *  6. 关闭开关时：逐节点还原英文并停止观察（stopEngine(true)）。
 *
 * 上游兼容：词典以"英文原文"为 key，未收录的文案自动保持英文（优雅降级）。
 */
import {
  compileDictionary,
  lookupText,
  type CompiledDict,
  type Dictionary,
} from "./matcher";
import { getEnabled, onChange as onStorageChange } from "./storage";

export interface EngineOptions {
  dictionary: Dictionary;
}

const ATTR_NAMES = ["placeholder", "title", "aria-label", "alt"] as const;
// 注意：INPUT/TEXTAREA/SELECT 不在跳过列表中 —— placeholder/option 文案需要翻译；
  // 它们没有需要翻译的文本节点（value 属性不参与翻译）。
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "MATH", "IFRAME", "CANVAS",
]);
const SKIP_ATTR = "data-zh-skip";
const PROCESSED_ATTR = "data-zh-done";

let compiled: CompiledDict | null = null;
let enabled = false;
let observer: MutationObserver | null = null;
let rafId: number | null = null;
let pendingMutations: MutationRecord[] = [];
let untranslated = new Map<string, number>(); // 未命中统计（调试）

/** 已翻译文本节点 → 原文（强引用，用于还原） */
const textRegistry = new Map<Text, string>();
/** 已翻译属性的元素 → { attr: 原文 } */
const attrRegistry = new Map<Element, Record<string, string>>();
/** 观察期内的去重（关闭开关时整体重建） */
let seenText = new WeakSet<Text>();
// [DEBUG] 命中统计
let debugHits = 0;
let debugSetCalls = 0;

let titleOriginal: string | null = null;
let titleTimer: ReturnType<typeof setInterval> | null = null;
let unlistenStorage: (() => void) | null = null;

// ---------------------------------------------------------------------------
// 判定与改写
// ---------------------------------------------------------------------------

function isSkippedElement(el: Element | null): boolean {
  if (!el) return false;
  if (el.hasAttribute(SKIP_ATTR)) return true;
  const tag = el.tagName;
  if (SKIP_TAGS.has(tag)) return true;
  // 纯装饰性/图形内容
  if (tag === "IMG" && !el.getAttribute("alt")) return true;
  return false;
}

function translateTextNode(node: Text): boolean {
  if (seenText.has(node)) return false;
  if (isSkippedElement(node.parentElement)) return false;
  const raw = node.nodeValue ?? "";
  const zh = compiled ? lookupText(compiled, raw) : null;
  if (zh === null || zh === raw) {
    if (untranslated.size < 5000 && raw.trim().length > 1 && !/^[\d\s.,%()\-\/]+$/.test(raw.trim())) {
      untranslated.set(raw, (untranslated.get(raw) ?? 0) + 1);
    }
    return false;
  }
  textRegistry.set(node, raw);
  node.nodeValue = zh;
  seenText.add(node);
  return true;
}

function translateElementAttrs(el: Element): void {
  if (isSkippedElement(el)) return;
  if (el.hasAttribute(PROCESSED_ATTR)) return;
  let touched = false;
  const originals: Record<string, string> = {};
  for (const name of ATTR_NAMES) {
    if (!el.hasAttribute(name)) continue;
    const value = el.getAttribute(name) ?? "";
    const zh = compiled ? lookupAttrValue(compiled, value) : null;
    if (zh !== null && zh !== value) {
      originals[name] = value;
      el.setAttribute(name, zh);
      touched = true;
    }
  }
  if (touched) {
    attrRegistry.set(el, originals);
    el.setAttribute(PROCESSED_ATTR, "1");
  }
}

function lookupAttrValue(compiledDict: CompiledDict, value: string): string | null {
  // 属性值可能带后缀（如 "New issue" 里无后缀），直接查
  return lookupText(compiledDict, value);
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (isSkippedElement(el)) return;
    translateElementAttrs(el);
  }
  // 同时遍历元素与文本：元素节点翻译属性，文本节点翻译内容
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return isSkippedElement(node as Element)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        }
        return isSkippedElement((node as Text).parentElement)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    },
  );
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) {
      translateTextNode(n as Text);
    } else {
      translateElementAttrs(n as Element);
    }
  }
}

// ---------------------------------------------------------------------------
// 观察器
// ---------------------------------------------------------------------------

function scheduleFlush(): void {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const batch = pendingMutations;
    pendingMutations = [];
    flush(batch);
  });
}

function flush(mutations: MutationRecord[]): void {
  if (!enabled || !compiled) return;
  for (const m of mutations) {
    if (m.type === "childList") {
      for (const added of m.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE) {
          translateTextNode(added as Text);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          walk(added);
        }
      }
      // 子节点列表变化也可能改变了父级相邻文本（React 重渲染常见）
      if (m.target && m.target.nodeType === Node.ELEMENT_NODE) {
        for (const child of m.target.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) translateTextNode(child as Text);
        }
      }
    } else if (m.type === "characterData") {
      translateTextNode(m.target as Text);
    } else if (m.type === "attributes") {
      translateElementAttrs(m.target as Element);
    }
  }
}

function syncTitle(): void {
  const t = document.title;
  if (t === titleOriginal) return;
  titleOriginal = t;
  if (!enabled || !compiled) return;
  const zh = lookupText(compiled, t);
  if (zh !== null) document.title = zh;
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

/** 启动引擎（幂等）。 */
function pruneDetached(): void {
  for (const node of textRegistry.keys()) {
    if (!node.isConnected) textRegistry.delete(node);
  }
  for (const el of attrRegistry.keys()) {
    if (!el.isConnected) attrRegistry.delete(el);
  }
}

export function startEngine(options: EngineOptions): void {
  compiled = compileDictionary(options.dictionary);
  enabled = getEnabled();
  const root = document.body ?? document.documentElement;
  if (!root) return;
  // 剪枝已脱离文档的节点，避免内存增长
  pruneDetached();
  // 初始全量扫描
  if (enabled) walk(root);
  syncTitle();
  if (observer) observer.disconnect();
  observer = new MutationObserver((records) => {
    if (!enabled) return;
    pendingMutations.push(...records);
    scheduleFlush();
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTR_NAMES as unknown as string[],
  });
  if (titleTimer) clearInterval(titleTimer);
  titleTimer = setInterval(syncTitle, 800);
  if (unlistenStorage) unlistenStorage();
  unlistenStorage = onStorageChange((next) => setEngineEnabled(next));
}

/** 停止引擎。restore=true 时把已翻译节点还原为英文。 */
export function stopEngine(restore: boolean): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingMutations = [];
  if (unlistenStorage) {
    unlistenStorage();
    unlistenStorage = null;
  }
  if (titleTimer) {
    clearInterval(titleTimer);
    titleTimer = null;
  }
  if (restore && enabled) {
    for (const [node, original] of textRegistry) {
      if (node.nodeValue !== original) node.nodeValue = original;
    }
    for (const [el, originals] of attrRegistry) {
      for (const [name, original] of Object.entries(originals)) {
        el.setAttribute(name, original);
      }
      el.removeAttribute(PROCESSED_ATTR);
    }
  }
  if (restore) {
    // 仅在"还原"语义下清空：已还原的原文不再需要。
    textRegistry.clear();
    attrRegistry.clear();
    seenText = new WeakSet();
  }
  // 注意：restore=false（组件卸载/StrictMode 重挂）时保留 registry，
  // 这样随后的 startEngine 依然能拿到原文用于关闭开关时的还原。
  enabled = false;
  compiled = null;
}

/** 切换开关（由 storage 事件或切换按钮调用）。 */
export function setEngineEnabled(next: boolean): void {
  if (next === enabled) return;
  if (next) {
    enabled = true;
    if (compiled) {
      // 重新翻译当前 DOM
      walk(document.body ?? document.documentElement);
      syncTitle();
    }
  } else {
    // 还原为英文
    for (const [node, original] of textRegistry) {
      if (node.nodeValue !== original) node.nodeValue = original;
    }
    for (const [el, originals] of attrRegistry) {
      for (const [name, original] of Object.entries(originals)) {
        el.setAttribute(name, original);
      }
      el.removeAttribute(PROCESSED_ATTR);
    }
    textRegistry.clear();
    attrRegistry.clear();
    seenText = new WeakSet();
    enabled = false;
    if (titleOriginal !== null && document.title !== titleOriginal) {
      document.title = titleOriginal;
    }
  }
}

/** 调试：返回未命中文案统计（按出现次数降序）。 */
export function getUntranslatedStats(): Array<{ text: string; count: number }> {
  return [...untranslated.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 200);
}
