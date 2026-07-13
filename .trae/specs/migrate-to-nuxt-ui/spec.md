# 迁移到 Nuxt UI 组件库 Spec

## Why
当前 Tide 项目使用 naive-ui 作为 UI 组件库，存在侧边栏折叠等样式问题难以根治（naive-ui 的 CSS-in-JS 方式与 Tailwind CSS 难以协同）。迁移到 Nuxt UI 可以统一基于 Tailwind CSS 的样式体系，获得更好的可定制性和一致性，同时减少样式冲突。

## What Changes
- **BREAKING** 移除 `naive-ui` 依赖，改用 `@nuxt/ui`（v4）
- **BREAKING** 所有组件前缀从 `N` 改为 `U`（如 `NButton` → `UButton`）
- **BREAKING** 图标系统从 `@vicons/ionicons5` 组件式改为 Iconify 字符串式（`i-lucide-xxx`）
- **BREAKING** Provider 结构简化：`NConfigProvider + NMessageProvider + NDialogProvider` → 单个 `UApp`
- **BREAKING** 消息提示从 `useMessage` 改为 `useToast`
- **BREAKING** 表格组件从 `NDataTable`（内置虚拟滚动）改为 `UTable`（基于 TanStack Table，虚拟滚动需自行接入 `UScrollArea`）
- **BREAKING** Popconfirm 无直接对应组件，改用 `useOverlay + UModal` 实现
- **BREAKING** NTag 可关闭/可勾选能力无直接对应，UBadge 需自行扩展
- 主题配置从 `themeOverrides`（JS 对象）改为 `app.config.ts` + Tailwind CSS 变量
- 暗色模式从 naive-ui 的 `darkTheme` 改为 Tailwind `.dark` class + `useColorMode`

## Impact
- Affected specs: 无（首次创建 spec）
- Affected code:
  - `package.json`：依赖变更
  - `vite.config.ts`：添加 `@nuxt/ui/vite` 插件
  - `src/main.ts`：添加 `@nuxt/ui/vue-plugin`
  - `src/App.vue`：Provider 结构重写
  - `src/assets/main.css`：CSS 导入变更
  - `src/layouts/MainLayout.vue`：布局组件替换
  - `src/components/layout/AppSidebar.vue`：全部组件替换
  - `src/components/layout/AppTopbar.vue`：全部组件替换
  - `src/components/torrent/TorrentTable.vue`：表格组件重写（核心）
  - `src/components/torrent/TorrentCardList.vue`：组件替换
  - `src/components/torrent/DetailDrawer.vue`：Drawer/Tabs/Table 替换
  - `src/components/torrent/BatchToolbar.vue`：Button/Modal/Popconfirm 替换
  - `src/components/torrent/AddTorrentModal.vue`：Modal/Upload 替换
  - `src/views/Login.vue`：表单组件替换
  - `src/views/Settings.vue`：表单组件替换
  - `src/views/Dashboard.vue`：组件引用更新
  - `src/utils/state.ts`：图标引用改为 Iconify 字符串
  - `src/stores/settings.ts`：主题管理逻辑调整

## ADDED Requirements

### Requirement: Nuxt UI 基础集成
系统 SHALL 在 Vite + Vue 3 项目中正确集成 Nuxt UI v4，包括 Vite 插件、Vue 插件、CSS 导入和 `UApp` 根组件包裹。

#### Scenario: 基础集成完成
- **WHEN** 开发者运行 `bun run dev`
- **THEN** 应用启动无报错，Nuxt UI 组件可自动导入使用
- **AND** `useToast`、`useOverlay`、`useColorMode` 等 composable 可正常调用

### Requirement: 图标系统迁移
系统 SHALL 使用 Iconify 字符串格式（`i-lucide-xxx`）替代 `@vicons/ionicons5` 组件式图标，通过 `UIcon` 组件或组件的 `icon` prop 渲染。

#### Scenario: 图标正常渲染
- **WHEN** 页面渲染包含图标的组件
- **THEN** 所有图标正常显示，无缺失或 broken 图标

### Requirement: 主题切换
系统 SHALL 通过 `useColorMode` 实现暗色/亮色主题切换，通过 `.dark` class 控制 Tailwind CSS 变量。

#### Scenario: 主题切换正常
- **WHEN** 用户点击主题切换按钮
- **THEN** 页面在暗色和亮色之间平滑切换
- **AND** 主题状态持久化到 localStorage

### Requirement: 虚拟滚动表格
系统 SHALL 使用 `UTable` + `UScrollArea`（或 `@tanstack/vue-virtual`）实现种子列表的虚拟滚动，支持大数据量下的流畅滚动。

#### Scenario: 大量数据滚动流畅
- **WHEN** 种子列表包含 1000+ 条记录
- **THEN** 滚动保持 60fps 流畅，无卡顿

### Requirement: 消息提示系统
系统 SHALL 使用 `useToast` 替代 `useMessage`，提供成功/错误/警告/信息四种消息提示。

#### Scenario: 操作反馈
- **WHEN** 用户执行暂停/恢复/删除等操作
- **THEN** 右上角显示 toast 消息，5 秒后自动消失

### Requirement: 确认弹窗
系统 SHALL 使用 `useOverlay + UModal` 实现 `useConfirmDialog` composable，替代 naive-ui 的 `NPopconfirm`。

#### Scenario: 删除确认
- **WHEN** 用户点击"删除种子"按钮
- **THEN** 弹出模态确认框
- **WHEN** 用户点击确认
- **THEN** 执行删除并返回 `true`
- **WHEN** 用户点击取消
- **THEN** 不执行删除并返回 `false`

## MODIFIED Requirements

### Requirement: 种子列表表格
种子列表表格 SHALL 使用 `UTable`（TanStack Table）渲染，支持：
- 列排序（点击表头切换升降序）
- 行选择（checkbox 多选）
- 虚拟滚动（`UScrollArea` 或 `vue-virtual`）
- 自定义单元格渲染（进度条、状态图标、速度、标签）
- 行点击打开详情抽屉

### Requirement: 详情抽屉
详情抽屉 SHALL 使用 `USlideover`（桌面侧滑）渲染，包含 4 个标签页（概要/文件/Tracker/对等方），使用 `UTabs` 驱动，文件和 Tracker 标签页使用 `UTable` 渲染数据。

### Requirement: 批量操作工具栏
批量操作工具栏 SHALL 使用 `UButton` 组合渲染操作按钮，删除操作使用 `useConfirmDialog` composable 确认，标签操作使用 `UModal` + `UInput`（或 `UFormField` 组合）输入。

### Requirement: 添加种子弹窗
添加种子弹窗 SHALL 使用 `UModal` 渲染，包含磁力链接输入（`UInput`）和文件拖拽上传区域。

### Requirement: 登录页
登录页 SHALL 使用 `UForm` + `UInput` + `UButton` 渲染表单，支持地址、用户名、密码输入。

### Requirement: 设置页
设置页 SHALL 使用 `UForm` + `UInput`/`UInputNumber`/`USelect`/`USwitch` 渲染设置项。

### Requirement: 主布局
主布局 SHALL 使用 Tailwind CSS flexbox/grid 布局（替代 `NLayout`/`NLayoutSider`），侧边栏折叠通过 CSS class 切换实现，避免 naive-ui 的宽度控制问题。

## REMOVED Requirements

### Requirement: naive-ui 依赖
**Reason**: 迁移到 Nuxt UI，不再需要 naive-ui
**Migration**: 从 `package.json` 移除 `naive-ui` 依赖，删除 `node_modules/naive-ui`

### Requirement: @vicons/ionicons5 依赖
**Reason**: 改用 Iconify 字符串图标（`i-lucide-xxx`），不再需要组件式图标
**Migration**: 从 `package.json` 移除 `@vicons/ionicons5`，图标引用从组件导入改为字符串
