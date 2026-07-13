# 种子管理功能完善 Spec

## Why
Tide 已完成 naive-ui → Nuxt UI v4 迁移，基础功能可用。当前种子列表在大数据量下存在性能瓶颈（无虚拟滚动），缺少快速搜索能力、全局统计概览、以及单行快捷操作入口。本 spec 完善 4 个核心功能以提升日常使用效率。

## What Changes
- 种子列表接入 `@tanstack/vue-virtual` 实现虚拟滚动，支持 1000+ 条流畅渲染
- 顶栏新增搜索框，支持按名称实时模糊搜索；store 增加 `searchQuery` 状态和过滤逻辑
- 新增统计概览组件 `StatsOverview.vue`，展示速度曲线（实时折线图）、分类分布、存储占用、做种/下载计数
- 种子表格行新增右键上下文菜单（基于 `UDropdownMenu` 手动触发），支持单行快捷操作（暂停/恢复/强制续传/删除/复制 Hash/查看详情/加标签）

## Impact
- Affected specs: `migrate-to-nuxt-ui`（迁移已完成，本 spec 在其基础上增强）
- Affected code:
  - `package.json`：新增 `@tanstack/vue-virtual` 依赖
  - `src/stores/torrentList.ts`：新增 `searchQuery`、`speedHistory` 状态，增强 `filteredTorrents`
  - `src/components/torrent/TorrentTable.vue`：接入虚拟滚动 + 右键菜单
  - `src/components/layout/AppTopbar.vue`：新增搜索框
  - `src/components/torrent/StatsOverview.vue`：新建统计概览组件
  - `src/components/torrent/TorrentContextMenu.vue`：新建右键菜单组件
  - `src/composables/useSpeedHistory.ts`：新建速度历史记录 composable
  - `src/views/Dashboard.vue`：集成统计概览（可折叠/可关闭）
  - `src/api/modules/torrents.ts`：新增单行操作复用现有批量 API（无需新增接口）

## ADDED Requirements

### Requirement: 种子列表虚拟滚动
系统 SHALL 使用 `@tanstack/vue-virtual` 的 `useVirtualizer` 为种子表格实现虚拟滚动，仅渲染可视区域内的行，支持 1000+ 条记录下 60fps 流畅滚动。

#### Scenario: 大数据量滚动流畅
- **WHEN** 种子列表包含 1000+ 条记录
- **THEN** 滚动保持流畅，DOM 节点数量恒定（约可视行数 + overscan）
- **AND** 排序、选择、行点击功能在虚拟滚动下正常工作

### Requirement: 种子搜索
系统 SHALL 在顶栏提供实时搜索框，用户输入关键词后按种子名称模糊匹配过滤列表。

#### Scenario: 实时搜索
- **WHEN** 用户在搜索框输入关键词
- **THEN** 种子列表实时过滤，仅显示名称包含关键词（不区分大小写）的种子
- **AND** 搜索框带清除按钮，清空后恢复完整列表
- **AND** 搜索状态与分类/标签筛选叠加生效

### Requirement: 统计概览
系统 SHALL 提供可折叠的统计概览面板，展示全局下载/上传速度历史曲线、种子分类分布、存储占用和做种统计。

#### Scenario: 查看统计
- **WHEN** 用户在 Dashboard 顶部展开统计面板
- **THEN** 显示最近 60 秒的下载/上传速度折线图（实时更新）
- **AND** 显示各状态种子数量分布（下载中/做种/暂停/已完成）
- **AND** 显示总存储占用和已下载总量
- **WHEN** 用户点击折叠按钮
- **THEN** 面板收起，仅保留一行摘要（当前速度 + 种子总数）

### Requirement: 右键上下文菜单
系统 SHALL 在种子表格行上提供右键上下文菜单，支持对单行种子快捷执行常用操作。

#### Scenario: 右键操作单个种子
- **WHEN** 用户在表格行上右键点击
- **THEN** 在鼠标位置弹出上下文菜单
- **AND** 菜单包含：查看详情、暂停/恢复、强制续传、复制 Hash、复制名称、添加标签、删除
- **WHEN** 用户点击菜单项
- **THEN** 对该行种子执行对应操作
- **AND** 操作结果通过 toast 反馈

## MODIFIED Requirements

### Requirement: 种子列表表格
种子列表表格 SHALL 在 UTable 基础上接入 `@tanstack/vue-virtual` 虚拟滚动，保留原有列排序、行选择、行点击打开详情、自定义单元格渲染功能。同时表格行 SHALL 支持右键菜单触发。

### Requirement: 顶栏
顶栏 SHALL 在全局速度显示与操作按钮之间新增搜索输入框（UInput），支持实时搜索和清除。

### Requirement: Dashboard 视图
Dashboard 视图 SHALL 在标题栏下方集成可折叠的 `StatsOverview` 组件，用户可手动展开/收起。

## REMOVED Requirements
无
