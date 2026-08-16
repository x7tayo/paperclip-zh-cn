# paperclip-zh-cn — Paperclip UI 汉化插件

给 [paperclipai/paperclip](https://github.com/paperclipai/paperclip) 的 React UI 提供**全局中文翻译**的官方插件。

- **形态**：Paperclip 插件系统安装的 `ui` 插件（非改源码补丁）
- **覆盖**：所有已登录页面（117 个页面 / 483 个组件）、文档标题；登录页通过 bookmarklet 覆盖
- **兼容上游**：零改动上游源码，词典以「英文原文」为 key，上游发版后未收录的新文案自动保持英文
- **可切换**：工具栏「中 / EN」按钮一键切换，偏好持久化

## 原理

Paperclip 的插件 UI 槽位是**加性设计**（只能新增 UI，不能改写核心页面文字），因此本插件采用「全局文本覆写」方案：

1. 通过 `sidebarPanel` 槽位（每个已登录页面都会渲染）挂载一个隐形组件，启动翻译引擎；
2. 引擎用 `MutationObserver` 监听整个 DOM（含 React 重渲染产生的新节点），按**词典（英文原文 → 中文）**就地改写文本节点与 `placeholder/title/aria-label/alt` 属性；
3. 词典未收录的文案**优雅降级为英文**，绝不误伤代码/ID（只做整节点匹配，不做子串替换）；
4. `document.title` 由引擎定时同步；`data-zh-skip` 属性可标记跳过元素。

## 目录结构

    paperclip-zh-cn/
    ├── package.json               # paperclipPlugin: manifest/worker/ui 三入口
    ├── esbuild.config.mjs         # 构建 worker/manifest/ui（ui 仅 external react）
    ├── src/
    │   ├── manifest.ts            # 插件清单（sidebarPanel + globalToolbarButton 槽位）
    │   ├── worker.ts              # 最小 worker（SDK 打包进产物）
    │   └── ui/
    │       ├── index.tsx          # ZhCnOverlay / ZhToggle / initStandalone
    │       ├── engine.ts          # 核心翻译引擎（MutationObserver + 还原）
    │       ├── matcher.ts         # 词典匹配（精确 + {{变量}} 模板）
    │       ├── storage.ts         # 开关状态（localStorage + 跨标签同步）
    │       └── dictionary/zh-cn.ts# 词典（自动生成，勿手改）
    ├── dictionary/
    │   ├── batch-0..8.json        # 翻译数据源（英文 → 中文）
    │   └── extracted-strings.json # 上游文案清单（提取脚本产物）
    ├── scripts/
    │   ├── extract-strings.mjs    # 只读扫描上游 ui/src，提取英文文案
    │   ├── build-dictionary.mjs   # 合并 batch-*.json → zh-cn.ts
    │   └── coverage-report.mjs    # 覆盖率报告
    └── tests/                     # matcher / engine / storage 单测（vitest+jsdom）

## 快速开始

    npm install          # 安装构建依赖
    npm run build        # 产出 dist/{manifest,worker}.js + dist/ui/index.js
    npm test             # 运行单元测试

## 安装到 Paperclip 实例

    npx paperclipai plugin install ./paperclip-zh-cn   # 本地路径安装

安装后：

- 已登录页面自动全中文（默认开启）；
- 页面工具栏（面包屑区）出现「中」按钮，点击切换 中/EN；
- 刷新后偏好保持。

## 登录页汉化（bookmarklet）

登录页（`Auth.tsx`）在 Layout 之外，插件槽位无法自动挂载。把下面内容存为书签，在登录页点击即可手动启动翻译引擎：

    javascript:(async()=>{try{const m=await import(location.origin+'/_plugins/paperclip.zh-cn/ui/index.js');m.initStandalone&&m.initStandalone()}catch(e){alert('请先安装 paperclip-zh-cn 插件')}})()

## 上游升级流程（保持兼容）

Paperclip 发新版后：

    npm run extract:strings        # 重新扫描上游 ui/src → 更新 dictionary/extracted-strings.json
    npm run coverage:report        # 查看新增未翻译文案清单
    # 把新增文案翻译后写入 dictionary/batch-N.json（新文件）
    npm run build                  # 合并词典并重新构建

未翻译的新文案自动保持英文，不影响使用。

## 词典维护

- 词条格式：`"英文原文": "中文"`，key 需与上游归一化后完全一致（大小写、空格敏感）；
- 支持模板词条：`"{{count}} issues": "{{count}} 个任务"`，占位符名称必须与英文 key 一致；
- 构建时校验占位符一致性，不一致的词条会被剔除并告警；
- 词典约 3,450 条，覆盖提取清单的 86%+，未覆盖的多为碎片性短词（`in`/`or` 类）与长段落。

## 端到端验证记录（2026-08-16）

已在本机完成真实实例验证：

1. **启动上游**：`npx pnpm@9.15.4 dev:once`（local_trusted / embedded-postgres / 127.0.0.1:3100）；
2. **安装插件**：`POST /api/plugins/install`（本地路径）→ 状态 `ready`，槽位注册成功
   （`sidebarPanel:ZhCnOverlay` + `globalToolbarButton:ZhToggle`）；
3. **UI bundle 服务**：`/_plugins/<uuid>/ui/index.js` 200（286KB）；
4. **浏览器验证**（Playwright + Chromium，公司看板 /TES/dashboard）：
   - 默认中文：页面 244 个 CJK 字符，侧边栏全中文（任务/项目/智能体/例行任务/成本…），空状态"你还没有智能体。在此创建"；
   - 点击「中」按钮 → CJK 字符 **0**，全页面还原英文（`Skip to Main Content` 等）；
   - 再次点击「EN」→ CJK 字符 **244**，恢复中文；
   - 全程无 JS 错误。

### Windows 上游注意事项（重要）

本地验证中发现两个上游在 **Windows dev 模式**下的问题，均已解决：

1. **worker 加载失败**（`ERR_UNSUPPORTED_ESM_URL_SCHEME protocol 'e:'`）：
   dev 模式下上游会给"本地路径安装"的插件 worker 附加 `--import <tsx loader>`，
   tsx loader 在 Windows 上无法加载含盘符的绝对路径入口。
   **已对本地克隆打补丁**（`server/src/services/plugin-loader.ts`，标记 `[LOCAL-E2E PATCH]`）：
   将 tsx loader 限制为仅仓库内插件。外部插件（如本插件）走普通 fork。
   ⚠️ 该补丁属于本地克隆的 dev 环境修复，未合入上游；建议向上游提 PR（Windows 支持）。
2. **StrictMode 双挂载导致还原失效**：React StrictMode 下组件卸载清理会清空翻译 registry，
   导致关闭开关无法还原。已在引擎中修复：`stopEngine(false)` 保留 registry，
   仅"还原"语义下清空；新增回归测试覆盖。

### 复现验证

```bash
# 上游仓库内（需要 dev 服务器 + 插件已安装 + 已创建公司）
node scripts/zhcn-verify.mjs        # 完整切换往返断言
node scripts/zhcn-screenshot.mjs    # 生成 zh/en 截图
```

## 已知限制

| 限制 | 说明 |
|---|---|
| 登录页 | 需 bookmarklet 手动触发（上游路由结构决定，插件无法自动挂载） |
| 动态拼接文案 | 日期/数字等由代码实时拼接的文案，仅能覆盖常见模板（如 `{{count}} issues`） |
| 非文本表面 | 邮件、PDF 导出等非 React UI 不在此插件范围 |
| 性能 | 初始全量扫描一次 + rAF 批量处理增量，对 34 万行应用可接受；极端大页面可能偶发闪烁 |
| 翻译质量 | 当前为 AI 批量翻译，个别术语可能与官方译名不同，可按上面流程人工修正 |

## 技术要点

- UI bundle 仅 external `react` / `react/jsx-runtime`，宿主 bridge 自动提供 React 运行时，**不依赖 SDK**；
- worker 由 esbuild 打包 `@paperclipai/plugin-sdk`，安装时无需额外 npm 依赖；
- 引擎只做「整文本节点」匹配，绝不子串替换，避免误翻译代码、ID、路径；
- 关闭开关时逐节点还原英文（原文保存在内存 registry），React 重渲染后新节点会重新翻译；
- `data-zh-skip` 可让任意元素跳过翻译（本插件切换按钮自身即使用）。
