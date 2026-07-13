# Tasks

- [x] Task 1: 基础集成：安装 @nuxt/ui，配置 Vite 插件、Vue 插件、CSS 导入，移除 naive-ui 依赖
  - [x] SubTask 1.1: 安装 `@nuxt/ui` 依赖，移除 `naive-ui` 和 `@vicons/ionicons5`
  - [x] SubTask 1.2: 在 `vite.config.ts` 添加 `@nuxt/ui/vite` 插件
  - [x] SubTask 1.3: 在 `src/main.ts` 添加 `@nuxt/ui/vue-plugin`
  - [x] SubTask 1.4: 更新 `src/assets/main.css` 为 `@import "tailwindcss"; @import "@nuxt/ui";`
  - [x] SubTask 1.5: 更新 `tsconfig.app.json` 添加 `#build/ui/*` 路径别名和 `auto-imports.d.ts`、`components.d.ts`
  - [x] SubTask 1.6: 更新 `.gitignore` 添加 `auto-imports.d.ts` 和 `components.d.ts`
  - [x] SubTask 1.7: 重写 `src/App.vue`：用 `UApp` 替代 `NConfigProvider + NMessageProvider + NDialogProvider`
  - [x] SubTask 1.8: 创建 `app.config.ts` 配置主题色（primary: blue, neutral: slate）

- [x] Task 2: 主题切换迁移：用 `useColorMode` 替代 naive-ui darkTheme
  - [x] SubTask 2.1: 更新 `src/stores/settings.ts`：移除 `themeOverrides` 逻辑，集成 `useColorMode`
  - [x] SubTask 2.2: 更新 `src/components/layout/AppTopbar.vue` 主题切换按钮：调用 `useColorMode`

- [x] Task 3: 图标系统迁移：`@vicons/ionicons5` 组件 → Iconify 字符串
  - [x] SubTask 3.1: 更新 `src/utils/state.ts`：图标从 Component 改为字符串（`i-lucide-xxx`）
  - [x] SubTask 3.2: 更新所有组件中的 `NIcon` 使用为 `UIcon` 或 `icon` prop

- [x] Task 4: 主布局迁移：`NLayout/NLayoutSider` → Tailwind CSS flexbox
  - [x] SubTask 4.1: 重写 `src/layouts/MainLayout.vue`：用 div + Tailwind class 替代 NLayout 系列
  - [x] SubTask 4.2: 侧边栏折叠通过 `sidebarCollapsed` class 控制 width，不再依赖 NLayoutSider

- [x] Task 5: 侧边栏组件迁移：`AppSidebar.vue`
  - [x] SubTask 5.1: 替换 `NIcon` → `UIcon`，`NBadge` → `UChip`/`UBadge`，`NScrollbar` → `UScrollArea`，`NButton` → `UButton`，`NTooltip` → `UTooltip`，`NEmpty` → `UEmpty`

- [x] Task 6: 顶栏组件迁移：`AppTopbar.vue`
  - [x] SubTask 6.1: 替换 `NButton` → `UButton`，`NIcon` → `UIcon`，`NDropdown` → `UDropdown`，`useMessage` → `useToast`

- [x] Task 7: 种子表格迁移：`TorrentTable.vue`（核心）
  - [x] SubTask 7.1: 用 `UTable`（TanStack Table）替代 `NDataTable`
  - [x] SubTask 7.2: 配置 `columns` 为 TanStack `ColumnDef` 格式，保留自定义渲染（进度条/状态图标/速度/标签）
  - [x] SubTask 7.3: 实现行选择：用 TanStack `rowSelection` state + `enableRowSelection`
  - [x] SubTask 7.4: 实现列排序：用 TanStack `getSortedRowModel`（采用 `manualSorting: true`，实际排序由 `store.sortedTorrents` 完成，TanStack 仅负责 UI 指示器）
  - [ ] SubTask 7.5: 实现虚拟滚动：用 `UScrollArea` 的 `virtualize` 或 `@tanstack/vue-virtual`（用户已明确要求"虚拟滚动先用普通模式"，此子任务延后）
  - [x] SubTask 7.6: 保留行点击打开详情功能（通过 `@select` 事件 + `getRowId`，排除 checkbox 区域）

- [x] Task 8: 移动端卡片列表迁移：`TorrentCardList.vue`
  - [x] SubTask 8.1: 替换 `NCheckbox` → `UCheckbox`，`NProgress` → `UProgress`，`NIcon` → `UIcon`，`NTag` → `UBadge`

- [x] Task 9: 详情抽屉迁移：`DetailDrawer.vue`
  - [x] SubTask 9.1: 用 `USlideover` 替代 `NDrawer`
  - [x] SubTask 9.2: 用 `UTabs`（items 数组驱动）替代 `NTabs`/`NTabPane`
  - [x] SubTask 9.3: 用 `UTable` 替代文件/Tracker/Peers 的 `NDataTable`
  - [x] SubTask 9.4: 替换 `NProgress` → `UProgress`，`NTag` → `UBadge`，`NButton` → `UButton`，`NEllipsis` → Tailwind `truncate` class
  - [x] SubTask 9.5: `useMessage` → `useToast`

- [x] Task 10: 批量工具栏迁移：`BatchToolbar.vue`
  - [x] SubTask 10.1: 替换 `NButton` → `UButton`，`NIcon` → `UIcon`，`NSpace` → Tailwind flex
  - [x] SubTask 10.2: 创建 `useConfirmDialog` composable（基于 `useOverlay + UModal`）替代 `NPopconfirm`
  - [x] SubTask 10.3: 标签操作弹窗：`NModal + NDynamicTags` → `UModal` + `UInput`/`UBadge` 组合
  - [x] SubTask 10.4: `useMessage` → `useToast`

- [x] Task 11: 添加种子弹窗迁移：`AddTorrentModal.vue`
  - [x] SubTask 11.1: 用 `UModal` 替代 `NModal`
  - [x] SubTask 11.2: 替换 `NUpload`/`NUploadDragger`：用原生 input[type=file] + Tailwind 拖拽样式，或 `UButton` 触发
  - [x] SubTask 11.3: 替换 `NInput` → `UInput`，`NSelect` → `USelect`，`NSwitch` → `USwitch`
  - [x] SubTask 11.4: `useMessage` → `useToast`

- [x] Task 12: 登录页迁移：`Login.vue`
  - [x] SubTask 12.1: 用 `UForm` + `UFormField` + `UInput` + `UButton` 替代 naive-ui 表单组件
  - [x] SubTask 12.2: 替换 `NCard` → `UCard`，`NIcon` → `UIcon`

- [x] Task 13: 设置页迁移：`Settings.vue`
  - [x] SubTask 13.1: 用 `UForm` + `UFormField` + `UInput`/`UInputNumber`/`USelect`/`USwitch` 替代 naive-ui 表单
  - [x] SubTask 13.2: 替换 `NCard` → `UCard`，`NButton` → `UButton`
  - [x] SubTask 13.3: `useMessage` → `useToast`

- [x] Task 14: Dashboard 视图更新
  - [x] SubTask 14.1: 更新 `src/views/Dashboard.vue` 中组件引用（移除 naive-ui 残留）

- [x] Task 15: 类型检查与构建验证
  - [x] SubTask 15.1: 运行 `vue-tsc --build` 确保无类型错误
  - [x] SubTask 15.2: 运行 `vite build` 确保构建通过
  - [x] SubTask 15.3: 修复所有编译错误

- [x] Task 16: 运行时验证
  - [x] SubTask 16.1: 启动 dev server，验证登录页渲染
  - [x] SubTask 16.2: 验证登录后主布局渲染（侧边栏/顶栏/内容区）
  - [ ] SubTask 16.3: 验证种子列表表格渲染（排序/选择/行点击）— 无种子数据，待用户验证
  - [ ] SubTask 16.4: 验证详情抽屉 4 个标签页 — 无种子数据，待用户验证
  - [ ] SubTask 16.5: 验证批量操作（暂停/恢复/标签/删除确认）— 无种子数据，待用户验证
  - [x] SubTask 16.6: 验证添加种子弹窗
  - [x] SubTask 16.7: 验证主题切换
  - [x] SubTask 16.8: 验证侧边栏折叠/展开

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 3, Task 4]
- [Task 6] depends on [Task 3]
- [Task 7] depends on [Task 3]
- [Task 8] depends on [Task 3]
- [Task 9] depends on [Task 3, Task 7]
- [Task 10] depends on [Task 3]
- [Task 11] depends on [Task 3]
- [Task 12] depends on [Task 1]
- [Task 13] depends on [Task 1]
- [Task 14] depends on [Task 5, Task 6, Task 7, Task 8, Task 9, Task 10, Task 11]
- [Task 15] depends on [Task 14]
- [Task 16] depends on [Task 15]
