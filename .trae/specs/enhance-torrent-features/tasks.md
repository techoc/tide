# Tasks

- [x] Task 1: 安装虚拟滚动依赖
  - [x] SubTask 1.1: 安装 `@tanstack/vue-virtual`
  - [x] SubTask 1.2: 验证依赖安装成功，`package.json` 已更新

- [x] Task 2: Store 增强搜索与速度历史
  - [x] SubTask 2.1: 在 `src/stores/torrentList.ts` 新增 `searchQuery` ref 状态
  - [x] SubTask 2.2: 增强 `filteredTorrents` computed，加入按 `searchQuery` 模糊匹配 `name` 的过滤逻辑（不区分大小写）
  - [x] SubTask 2.3: 新增 `speedHistory` ref（存储最近 60 个采样点的 `{ dl: number, up: number, ts: number }`），提供 `pushSpeedSample(dl, up)` 方法
  - [x] SubTask 2.4: 在 `fetchTransfer` 成功后调用 `pushSpeedSample` 记录速度采样
  - [x] SubTask 2.5: 新增统计 computed：`totalSize`（所有种子 size 之和）、`totalDownloaded`（downloaded 之和）、`seedingCount`、`downloadingCount`、`pausedCount`、`completedCount`

- [x] Task 3: 顶栏搜索框
  - [x] SubTask 3.1: 在 `src/components/layout/AppTopbar.vue` 速度显示与操作按钮之间新增 `UInput` 搜索框
  - [x] SubTask 3.2: 搜索框绑定 `store.searchQuery`，带 `i-lucide-search` 图标和清除按钮（`@input` 实时更新，输入清空时恢复）
  - [x] SubTask 3.3: 搜索框样式适配移动端（宽度自适应，`hidden sm:block` 或全宽切换）

- [x] Task 4: 速度历史 composable
  - [x] SubTask 4.1: 创建 `src/composables/useSpeedHistory.ts`，封装速度采样环形缓冲（max 60 点）
  - [x] SubTask 4.2: 提供 `history`（只读 ref）、`push(dl, up)`、`clear()` 方法
  - [x] SubTask 4.3: 在 Dashboard 的轮询中调用 push 记录速度历史

- [x] Task 5: 统计概览组件
  - [x] SubTask 5.1: 创建 `src/components/torrent/StatsOverview.vue`，接收 `store` 数据
  - [x] SubTask 5.2: 实现速度曲线 SVG 折线图（纯 SVG，无额外依赖，双线：下载/上传，60 采样点）
  - [x] SubTask 5.3: 实现分类分布卡片（下载中/做种/暂停/已完成，带图标和颜色）
  - [x] SubTask 5.4: 实现存储概览（总大小、已下载、剩余）
  - [x] SubTask 5.5: 实现折叠/展开切换（折叠时仅显示一行摘要：当前速度 + 种子总数）

- [x] Task 6: Dashboard 集成统计概览
  - [x] SubTask 6.1: 在 `src/views/Dashboard.vue` 标题栏下方集成 `StatsOverview` 组件
  - [x] SubTask 6.2: 启动 transfer 轮询（已有 `fetchTransfer`，需确认调用）并接入 `useSpeedHistory`
  - [x] SubTask 6.3: 统计面板折叠状态持久化到 `localStorage`（通过 settings store 或直接 localStorage）

- [x] Task 7: 右键上下文菜单组件
  - [x] SubTask 7.1: 创建 `src/components/torrent/TorrentContextMenu.vue`，使用 `UDropdownMenu` + 虚拟触发器
  - [x] SubTask 7.2: 菜单项：查看详情、暂停/恢复（根据当前状态动态显示）、强制续传、复制 Hash、复制名称、添加标签、删除种子
  - [x] SubTask 7.3: 实现菜单定位（跟随鼠标坐标，通过 `:ui` 或 inline style 控制 `top/left`）
  - [x] SubTask 7.4: 实现复制 Hash/名称功能（`navigator.clipboard.writeText` + toast 反馈）
  - [x] SubTask 7.5: 实现单行操作（复用 store 的 `pauseSelected` 等，但传入单个 hash；或新增 `pauseOne(hash)` 等便捷方法）

- [x] Task 8: 表格接入虚拟滚动
  - [x] SubTask 8.1: 在 `src/components/torrent/TorrentTable.vue` 引入 `useVirtualizer` from `@tanstack/vue-virtual`
  - [x] SubTask 8.2: 创建滚动容器 ref（`scrollContainer`），配置 `useVirtualizer({ count, getScrollElement, estimateSize, overscan })`
  - [x] SubTask 8.3: 渲染虚拟行：用 `virtualItems` map 渲染绝对定位的行（`position: absolute; top; transform`）
  - [x] SubTask 8.4: 保留列定义、排序、行选择、行点击功能，确保在虚拟滚动下正常工作
  - [x] SubTask 8.5: 处理表格高度自适应（容器 `h-full overflow-auto`，虚拟列表 `height: totalSize`）

- [x] Task 9: 表格接入右键菜单
  - [x] SubTask 9.1: 在 `TorrentTable.vue` 行元素上绑定 `@contextmenu.prevent="onContextMenu($event, row)"`
  - [x] SubTask 9.2: `onContextMenu` 设置菜单坐标和当前行 hash，显示 `TorrentContextMenu`
  - [x] SubTask 9.3: 菜单操作完成后关闭菜单并刷新列表（如需要）

- [x] Task 10: 类型检查与构建验证
  - [x] SubTask 10.1: 运行 `vue-tsc --build` 确保无类型错误
  - [x] SubTask 10.2: 运行 `vite build` 确保构建通过
  - [x] SubTask 10.3: 修复所有编译错误

- [x] Task 11: 运行时验证
  - [x] SubTask 11.1: 验证搜索框实时过滤
  - [x] SubTask 11.2: 验证统计概览展开/折叠和速度曲线实时更新
  - [ ] SubTask 11.3: 验证右键菜单各项操作 — 无种子数据，待用户验证
  - [ ] SubTask 11.4: 验证虚拟滚动在大列表下流畅（如有大量种子）— 无种子数据，待用户验证
  - [ ] SubTask 11.5: 验证排序/选择/行点击在虚拟滚动下正常 — 无种子数据，待用户验证

# Task Dependencies
- [Task 2] depends on [nothing]（store 增强可独立进行）
- [Task 3] depends on [Task 2]（搜索框绑定 store.searchQuery）
- [Task 4] depends on [nothing]（composable 独立）
- [Task 5] depends on [Task 2, Task 4]（统计组件读取 store 数据和速度历史）
- [Task 6] depends on [Task 5]（Dashboard 集成统计组件）
- [Task 7] depends on [Task 2]（右键菜单复用 store 操作方法）
- [Task 8] depends on [Task 1]（虚拟滚动需要依赖）
- [Task 9] depends on [Task 7, Task 8]（表格接入右键菜单，需先有菜单组件和虚拟滚动）
- [Task 10] depends on [Task 3, Task 6, Task 9]
- [Task 11] depends on [Task 10]

# 并行执行建议
- 第一批（无依赖）：Task 1、Task 2、Task 4 可并行
- 第二批：Task 3（依赖 2）、Task 5（依赖 2、4）、Task 7（依赖 2）、Task 8（依赖 1）可并行
- 第三批：Task 6（依赖 5）、Task 9（依赖 7、8）
- 最后：Task 10 → Task 11
