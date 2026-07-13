# Tide

qBittorrent Web UI — 基于 Vue 3 + Nuxt UI v4 的现代化前端。

## 功能特性

- 种子管理：列表/卡片视图、虚拟滚动、排序、选择、行内操作
- 批量操作：暂停/恢复/强制续传/删除/标签管理
- 实时统计：下载上传速度曲线、分类分布、存储概览
- 种子详情：文件列表、Tracker、Peer 信息
- 标签系统：已有标签选择、单行添加、右键删除
- 搜索筛选：实时模糊搜索 + 分类/标签叠加筛选
- 主题切换：亮色/暗色模式
- 响应式布局：桌面/移动端适配
- 兼容 qBittorrent v5 API（stop/start、stoppedDL/stoppedUP、sync/torrentPeers）

## 技术栈

- Vue 3 + TypeScript
- Nuxt UI v4（Reka UI + Tailwind CSS v4）
- Pinia 状态管理
- TanStack Table + @tanstack/vue-virtual
- Vite 构建
- Bun 包管理

## 项目结构

```
src/
├── api/            # Axios HTTP 客户端 + qBittorrent API 模块
├── assets/         # 全局样式
├── components/
│   ├── layout/     # 侧边栏、顶栏
│   └── torrent/    # 种子表格、卡片、详情抽屉、批量工具栏等
├── composables/    # 轮询、速度历史、确认弹窗、添加种子
├── layouts/        # 主布局
├── router/         # Vue Router
├── stores/         # Pinia stores
├── types/          # qBittorrent 类型定义
├── utils/          # 格式化、状态映射
└── views/          # 登录、Dashboard、设置
```

## 项目配置

在 `.env` 中配置 qBittorrent 地址（开发时 Vite 代理会转发请求并重写 Origin/Host 以绕过 CSRF）：

```
VITE_QB_BASE_URL=http://localhost:8080
```

## 项目初始化

```sh
bun install
```

### 开发模式

```sh
bun dev
```

### 类型检查 + 生产构建

```sh
bun run build
```

### Lint

```sh
bun lint
```

## License

MIT
