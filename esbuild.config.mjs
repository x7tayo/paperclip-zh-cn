import esbuild from "esbuild";

/**
 * Build script for the Paperclip 中文汉化 plugin.
 *
 * Produces three artifacts:
 *  - dist/manifest.js  (plugin manifest, ESM)
 *  - dist/worker.js    (worker entrypoint; bundles @paperclipai/plugin-sdk)
 *  - dist/ui/index.js  (UI bundle; externalizes react + react/jsx-runtime so the
 *                       host's bridge shim supplies the React runtime)
 *
 * The UI bundle intentionally does NOT import @paperclipai/plugin-sdk/ui: the
 * translation engine is pure DOM manipulation and only needs React for the slot
 * component shells.
 */
const watch = process.argv.includes("--watch");

async function main() {
  // worker 使用 ESM 格式（包 type: module）。宿主 dev 模式下会给"仓库内"插件
  // 附加 tsx loader；外部插件（如本插件）走普通 fork，Windows 下 fork 加载
  // ESM 入口无问题（上游已按仓库边界限制 tsx loader 的使用）。
  const ctx = await esbuild.context({
    entryPoints: ["src/worker.ts"],
    outfile: "dist/worker.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    sourcemap: true,
    logLevel: "info",
  });

  const manifestCtx = await esbuild.context({
    entryPoints: ["src/manifest.ts"],
    outfile: "dist/manifest.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "info",
  });

  const uiCtx = await esbuild.context({
    entryPoints: ["src/ui/index.tsx"],
    outfile: "dist/ui/index.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    external: ["react", "react/jsx-runtime", "@paperclipai/plugin-sdk/ui"],
    sourcemap: true,
    logLevel: "info",
  });

  if (watch) {
    await Promise.all([ctx.watch(), manifestCtx.watch(), uiCtx.watch()]);
    console.log("esbuild watch mode enabled for worker, manifest, and ui");
  } else {
    await Promise.all([ctx.rebuild(), manifestCtx.rebuild(), uiCtx.rebuild()]);
    await Promise.all([ctx.dispose(), manifestCtx.dispose(), uiCtx.dispose()]);
    console.log("build complete");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
