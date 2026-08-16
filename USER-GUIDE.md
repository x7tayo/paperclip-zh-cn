# Paperclip 中文界面插件 · 安装使用指南

> 给最终使用者的一页式指南。开发者想了解实现原理或参与维护，请看 [README.md](README.md)。

本插件让 [Paperclip](https://github.com/paperclipai/paperclip)（AI 智能体工作管理平台）的界面自动显示**中文**，并支持随时切回英文。它基于官方插件系统安装，**不修改 Paperclip 的任何文件**，升级 Paperclip 也不会失效。

---

## 一、安装（三选一，推荐第 1 种）

### 方式 1：npm 一条命令（最简单）

在 Paperclip 实例所在机器上打开终端，执行：

```bash
npx paperclipai plugin install paperclip-zh-cn
```

看到类似 `✓ Installed paperclip.zh-cn v0.1.0 (ready)` 即安装成功。

### 方式 2：GitHub Release 包（离线/内网环境）

1. 打开 **https://github.com/siyu1011/paperclip-zh-cn/releases**
2. 下载最新版 `paperclip-zh-cn-*.tgz`
3. 解压到任意目录，然后执行：

```bash
npx paperclipai plugin install /解压后的目录路径
```

### 方式 3：源码安装

```bash
git clone https://github.com/siyu1011/paperclip-zh-cn.git
cd paperclip-zh-cn
npm install && npm run build
npx paperclipai plugin install ./paperclip-zh-cn
```

---

## 二、使用

安装后无需任何配置，**刷新页面即可看到中文界面**：

- **默认开启**：所有已登录页面自动显示中文（任务、项目、智能体、成本、例行任务、设置等）；
- **切换语言**：页面顶部的面包屑工具栏会出现一个 **「中」** 按钮，点击变 **「EN」**（切回英文），再点恢复中文；
- **记住偏好**：你的选择会自动保存，下次打开页面仍保持；
- **未翻译的文案**：极少数新功能/长段说明可能仍是英文，属于正常现象（新版本会自动补充），不影响使用。

---

## 三、登录页汉化（可选）

登录/认证页面在布局之外，插件无法自动挂载。想让登录页也显示中文，用这个书签：

1. 在浏览器收藏夹新建一个书签，网址填下面这一整行：

```js
javascript:(async()=>{try{const m=await import(location.origin+'/_plugins/paperclip.zh-cn/ui/index.js');m.initStandalone&&m.initStandalone()}catch(e){alert('请先安装 paperclip-zh-cn 插件')}})()
```

2. 打开登录页时，点击该书签，页面即切换为中文。

---

## 四、升级

Paperclip 升级后如果出现新的英文文案，或想获取最新翻译，重新安装一次即可：

```bash
npx paperclipai plugin uninstall paperclip.zh-cn
npx paperclipai plugin install paperclip-zh-cn
```

（或直接安装新版本包，视你使用的安装方式而定。）

---

## 五、常见问题

| 问题 | 说明 |
|---|---|
| **安装后页面还是英文？** | 刷新页面；确认安装输出为 `(ready)`；安装对已打开的标签页不生效，需刷新 |
| **部分内容仍是英文？** | 词典未覆盖的新文案会自动保持英文（优雅降级），新版本会逐步补齐 |
| **切换按钮在哪里？** | 页面顶部工具栏（面包屑区域）的「中」按钮 |
| **能彻底卸载吗？** | 可以，执行 `npx paperclipai plugin uninstall paperclip.zh-cn`，界面恢复英文，无残留 |
| **Windows 开发模式安装报 worker 错误？** | 这是上游开发模式的已知 Windows 问题（见 [README.md](README.md) 端到端验证记录）；生产/自托管部署不受影响 |
| **会影响我的数据吗？** | 完全不会。插件只翻译界面文字，不读取、不修改任何数据 |

---

## 六、帮助与反馈

- 项目主页：**https://github.com/siyu1011/paperclip-zh-cn**
- 反馈问题：仓库 **Issues** 页面
- 查看所有版本：**Releases** 页面

喜欢的话点个 ⭐ 支持一下～
