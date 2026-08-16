/**
 * 语言开关状态（localStorage 持久化，跨标签页同步）。
 *
 *  - 未设置时默认开启中文（true）。
 *  - 关闭后引擎逐节点还原英文，切换按钮立即生效。
 */
const STORAGE_KEY = "paperclip.zhcn.enabled";
const CHANGE_EVENT = "paperclip-zhcn:change";

export function getEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // localStorage 不可用时只发事件，内存态生效
  }
  window.dispatchEvent(new CustomEvent<{ enabled: boolean }>(CHANGE_EVENT, { detail: { enabled } }));
}

export type ChangeListener = (enabled: boolean) => void;

export function onChange(listener: ChangeListener): () => void {
  const onCustom = (e: Event) => {
    const enabled = (e as CustomEvent<{ enabled: boolean }>).detail?.enabled;
    if (typeof enabled === "boolean") listener(enabled);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(e.newValue !== "0");
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
