/**
 * 汉化插件 UI 入口。
 *
 * 导出：
 *  - ZhCnOverlay  (sidebarPanel 槽) 挂载全局翻译引擎，渲染 null
 *  - ZhToggle     (globalToolbarButton 槽) 中/EN 切换按钮
 *  - initStandalone()  非 React 独立入口（登录页 bookmarklet 使用）
 */
import { useEffect, useState, type ReactNode } from "react";
import { startEngine, stopEngine, setEngineEnabled } from "./engine";
import { getEnabled, setEnabled as persistEnabled, onChange as onStorageChange } from "./storage";
import { zhCnDictionary } from "./dictionary/zh-cn";


let mountedSlots = 0;

function useTranslationEngine(): void {
  useEffect(() => {
    // Settings renders the toolbar slot without rendering the app sidebar.
    if (mountedSlots++ === 0) startEngine({ dictionary: zhCnDictionary });
    return () => {
      if (--mountedSlots === 0) stopEngine(false);
    };
  }, []);
}

export function ZhCnOverlay(): null {
  useTranslationEngine();
  return null;
}

const TOGGLE_STYLE: Record<string, string | number> = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "28px",
  minWidth: "34px",
  padding: "0 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  userSelect: "none",
  border: "1px solid var(--border, rgba(128,128,128,0.35))",
  background: "var(--secondary, rgba(128,128,128,0.12))",
  color: "var(--foreground, #e4e4e7)",
  fontFamily: "var(--font-sans, system-ui, sans-serif)",
};
const TOGGLE_HOVER: Record<string, string | number> = {
  ...TOGGLE_STYLE,
  borderColor: "var(--ring, rgba(120,160,255,0.6))",
};

export function ZhToggle(): ReactNode {
  useTranslationEngine();
  const [on, setOn] = useState<boolean>(() => getEnabled());
  const [hover, setHover] = useState(false);

  useEffect(() => onStorageChange((v) => setOn(v)), []);

  const toggle = () => {
    const next = !on;
    persistEnabled(next);
    setEngineEnabled(next);
    setOn(next);
  };

  return (
    <button
      type="button"
      aria-label={on ? "切换到英文" : "切换到中文"}
      title={on ? "当前：中文 · 点击切换为英文" : "当前：英文 · 点击切换为中文"}
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={hover ? TOGGLE_HOVER : TOGGLE_STYLE}
      data-zh-skip
    >
      {on ? "中" : "EN"}
    </button>
  );
}

/**
 * 独立入口：在非 React 页面（如登录页）手动启动翻译引擎。
 * 用法见 README 的 bookmarklet。
 */
export function initStandalone(): void {
  startEngine({ dictionary: zhCnDictionary });
}
