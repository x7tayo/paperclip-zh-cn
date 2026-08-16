import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEnabled, setEnabled, onChange } from "../src/ui/storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("未设置时默认开启中文", () => {
    expect(getEnabled()).toBe(true);
  });

  it("设置后持久化", () => {
    setEnabled(false);
    expect(window.localStorage.getItem("paperclip.zhcn.enabled")).toBe("0");
    expect(getEnabled()).toBe(false);
    setEnabled(true);
    expect(window.localStorage.getItem("paperclip.zhcn.enabled")).toBe("1");
    expect(getEnabled()).toBe(true);
  });

  it("变更事件通知监听器", () => {
    const listener = vi.fn();
    const unlisten = onChange(listener);
    setEnabled(false);
    expect(listener).toHaveBeenCalledWith(false);
    unlisten();
    setEnabled(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("storage 跨标签事件", () => {
    const listener = vi.fn();
    onChange(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "paperclip.zhcn.enabled", newValue: "0" }));
    expect(listener).toHaveBeenCalledWith(false);
  });
});
