# GameSound FX — 游戏音效助手

桌面游戏音效播放器，支持全屏游戏时悬浮使用。一键触发搞笑配音、枪声、经典梗等音效，让你的游戏语音聊天更有趣。

## 功能

- **内置音效库** — 100+ 游戏常用音效（穿越火线、吃鸡摇、搞笑配音、经典台词等）
- **全局快捷键** — 为任意音效绑定快捷键，游戏中一键触发
- **紧凑模式** — 收起为 44px 高的搜索条，悬浮在游戏画面上不挡视野（`Ctrl+Shift+Tab`）
- **在线音效捕获** — 浏览爱给网时自动拦截音频文件，一键下载保存到本地
- **音效分组** — 自定义分组管理音效，按分组筛选播放
- **收藏夹** — 标记常用音效快速访问
- **导入自有音效** — 支持导入本地 mp3 / wav / ogg 文件
- **音频设备选择** — 指定音频输出到特定设备
- **系统托盘** — 最小化到托盘，右键菜单快捷操作
- 

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 42 |
| 前端 | React 19 + TypeScript 5.8 |
| 构建工具 | Vite 6 |
| CSS | Tailwind CSS 3 |
| 音频引擎 | Howler.js 2 |

## 项目结构

```
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts            # 预加载脚本（contextBridge）
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 应用主组件
│   ├── index.css             # Tailwind 全局样式
│   ├── components/
│   │   ├── TitleBar.tsx      # 自定义标题栏
│   │   ├── CategoryTabs.tsx  # 分类标签栏
│   │   ├── SoundGrid.tsx     # 音效网格列表
│   │   ├── StatusBar.tsx     # 底部状态栏（音量/设备/播放控制）
│   │   ├── SettingsModal.tsx # 设置弹窗（快捷键管理）
│   │   ├── CompactBar.tsx    # 紧凑模式搜索条
│   │   ├── GroupManager.tsx  # 分组管理
│   │   ├── GroupFilterBar.tsx# 分组筛选栏
│   │   └── OnlineSoundBrowser.tsx  # 在线音效浏览器
│   ├── data/
│   │   └── sounds.ts         # 内置音效数据
│   └── utils/                # 工具函数
├── public/
│   └── sounds/               # 内置音效 mp3 文件
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 开发

```bash
# 安装依赖
npm install

# 启动 Vite 开发服务器（浏览器预览）
npm run dev

# 启动 Electron 开发模式（需要先启动 dev server）
npm run build:electron
npm run electron:dev

# 代码检查
npm run lint
```

## 构建

```bash
# 构建 Windows 安装包（portable + NSIS 安装器）
npm run electron:build
```

输出在 `dist-electron/` 目录。

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+Shift+\`` | 显示/隐藏窗口 |
| `Ctrl+Shift+Tab` | 切换紧凑模式 |
| 自定义 | 在设置中为音效绑定任意快捷键 |
