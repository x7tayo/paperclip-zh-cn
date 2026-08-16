/**
 * Paperclip 中文汉化插件 manifest。
 *
 * UI-only 插件：不注册 worker 能力，不调用宿主 API，只通过两个 UI 槽位
 * 注入翻译引擎与语言切换按钮。
 *
 *  - sidebarPanel        → 每个已登录页面都会渲染（Sidebar.tsx）→ 挂全局翻译引擎
 *  - globalToolbarButton → 页面工具栏（BreadcrumbBar.tsx）→ 中/EN 切换按钮
 */
const PLUGIN_ID = "paperclip.zh-cn";
const PLUGIN_VERSION = "0.1.0";

const manifest = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "中文界面 (UI 汉化)",
  description:
    "全局中文翻译覆写层：基于词典将 Paperclip UI 的英文文案就地翻译为中文，支持中/英切换，覆盖所有已登录页面；不修改上游源码，随上游发版自动兼容。",
  author: "paperclip-zh-cn",
  categories: ["ui"],
  capabilities: ["ui.sidebar.register", "ui.action.register"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "sidebarPanel",
        id: "zh-cn-overlay",
        displayName: "中文翻译引擎",
        exportName: "ZhCnOverlay",
      },
      {
        type: "globalToolbarButton",
        id: "zh-cn-toggle",
        displayName: "语言切换",
        exportName: "ZhToggle",
      },
    ],
  },
};

export default manifest;
