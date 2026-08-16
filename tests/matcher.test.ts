import { describe, it, expect } from "vitest";
import { compileDictionary, lookupText, lookupAttr, normalize } from "../src/ui/matcher";

const dict = {
  "Save": "保存",
  "Create your first company": "创建你的第一个公司",
  "{{count}} issues": "{{count}} 个任务",
  "Loading {{what}}...": "正在加载{{what}}…",
  "Assign to {{name}}": "分配给 {{name}}",
};

const compiled = compileDictionary(dict);

describe("normalize", () => {
  it("折叠空白并去首尾空格", () => {
    expect(normalize("  Save   changes  ")).toBe("Save changes");
  });
});

describe("lookupText", () => {
  it("精确命中", () => {
    expect(lookupText(compiled, "Save")).toBe("保存");
    expect(lookupText(compiled, "  Save ")).toBe("保存");
  });

  it("模板词条命中并填充占位符", () => {
    expect(lookupText(compiled, "3 issues")).toBe("3 个任务");
    expect(lookupText(compiled, "12 issues")).toBe("12 个任务");
    expect(lookupText(compiled, "Loading projects...")).toBe("正在加载projects…");
    expect(lookupText(compiled, "Assign to Alice")).toBe("分配给 Alice");
  });

  it("不做子串替换", () => {
    expect(lookupText(compiled, "Save as draft")).toBeNull();
    expect(lookupText(compiled, "save")).toBeNull(); // 大小写敏感
  });

  it("过滤无意义输入", () => {
    expect(lookupText(compiled, "1")).toBeNull();
    expect(lookupText(compiled, "")).toBeNull();
    expect(lookupText(compiled, "12345")).toBeNull();
    expect(lookupText(compiled, "---")).toBeNull();
  });

  it("未命中返回 null", () => {
    expect(lookupText(compiled, "This string is not in the dictionary")).toBeNull();
  });
});

describe("lookupAttr", () => {
  it("与文本共享匹配逻辑", () => {
    expect(lookupAttr(compiled, "Save")).toBe("保存");
    expect(lookupAttr(compiled, "Create your first company")).toBe("创建你的第一个公司");
  });
});
