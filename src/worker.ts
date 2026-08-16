/**
 * 最小 worker 入口：汉化插件是纯 UI 插件，不需要任何宿主 RPC。
 * 仅提供 setup/onHealth 满足宿主对 worker 生命周期与健康探针的契约。
 */
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("paperclip-zh-cn worker setup complete (UI-only plugin)");
  },

  async onHealth() {
    return { status: "ok", message: "paperclip-zh-cn ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
