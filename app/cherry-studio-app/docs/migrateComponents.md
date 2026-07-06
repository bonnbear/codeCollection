# Tamagui 到 HeroUI 组件迁移计划

## 迁移须知

1. 新迁移的组件统一放在 `src/componentsV2/` 目录，并提供默认样式；扩展样式前先查阅现有实现。
2. 将 Tamagui 组件改写为 HeroUI (`heroui-native`) 或项目自建的 HeroUI 包装组件；删除残留的 `tamagui` / `@tamagui/*` 引用。
3. 新增图标需在 `src/componentsV2/icons/LucideIcon/index.tsx` 中注册并复用既有 `IconProps` 类型。

## 迁移概述

- **数据更新时间**: 2025-09-21
- **HeroUI 组件库**: `src/componentsV2/` 共 98 个 `.tsx` 文件，全部已脱离 Tamagui。
- **旧组件目录**: `src/components/` 目录已移除，历史组件全部迁移完成。
- **页面**: `src/screens/` 共 57 个 `.tsx`，55 个已脱离 Tamagui，剩余 2 个待迁移（`home/messages/MultiModelTab.tsx`, `settings/providers/ManageModelsScreen.tsx`）。
- **其他核心入口**: 4 个基础文件中仅 `src/App.tsx` 仍直接引用 Tamagui（`src/hooks/useDialog.tsx`, `src/hooks/useToast.tsx`, `src/navigators/AssistantDetailTabNavigator.tsx` 已迁移）。
- **总体 Tamagui 引用**: 3 / 159 跟踪文件 → 已完成 156 (98.1%)。

## 迁移进度

### ✅ HeroUI 组件 (`src/componentsV2/`, 98/98)

**Base**

- [x] `base/AvatarEditButton/index.tsx`
- [x] `base/ContextMenu/index.tsx`
- [x] `base/CustomTag/index.tsx`
- [x] `base/ExternalLink/index.tsx`
- [x] `base/IconButton/index.tsx`
- [x] `base/Image/index.tsx`
- [x] `base/SearchInput/index.tsx`
- [x] `base/Select/index.tsx`
- [x] `base/SelectionSheet/index.tsx`
- [x] `base/Skeleton/ImageSkeleton.tsx`
- [x] `base/Text/index.tsx`
- [x] `base/TextField/index.tsx`

**Layout**

- [x] `layout/Container/index.tsx`
- [x] `layout/DrawerGestureWrapper/index.tsx`
- [x] `layout/Group/index.tsx`
- [x] `layout/Group/GroupTitle.tsx`
- [x] `layout/PressableRow/index.tsx`
- [x] `layout/Row/index.tsx`
- [x] `layout/Row/RowRightArrow.tsx`
- [x] `layout/SafeAreaContainer/index.tsx`
- [x] `layout/XStack/index.tsx`
- [x] `layout/YStack/index.tsx`

**Features - 通用**

- [x] `features/HeaderBar/index.tsx`
- [x] `features/MarqueeComponent/index.tsx`
- [x] `features/ModelGroup/index.tsx`
- [x] `features/ModelTags/index.tsx`
- [x] `features/Searching/index.tsx`
- [x] `features/TopicItem/index.tsx`
- [x] `features/TopicList/index.tsx`

**Features - Assistant**

- [x] `features/Assistant/AssistantItem.tsx`
- [x] `features/Assistant/AssistantItemCard.tsx`
- [x] `features/Assistant/AssistantItemSheet.tsx`
- [x] `features/Assistant/AssistantItemSkeleton.tsx`
- [x] `features/Assistant/AssistantMarketLoading.tsx`
- [x] `features/Assistant/AssistantsTabContent.tsx`
- [x] `features/Assistant/EmojiAvatar.tsx`
- [x] `features/Assistant/GroupTag.tsx`
- [x] `features/Assistant/ModelTabContent.tsx`
- [x] `features/Assistant/PromptTabContent.tsx`
- [x] `features/Assistant/ToolTabContent.tsx`

**Features - Chat 顶部栏**

- [x] `features/ChatScreen/Header/AssistantSelection.tsx`
- [x] `features/ChatScreen/Header/index.tsx`
- [x] `features/ChatScreen/Header/MenuButton.tsx`
- [x] `features/ChatScreen/Header/NewTopicButton.tsx`

**Features - Chat 消息输入**

- [x] `features/ChatScreen/MessageInput/FilePreview.tsx`
- [x] `features/ChatScreen/MessageInput/index.tsx`
- [x] `features/ChatScreen/MessageInput/MentionButton.tsx`
- [x] `features/ChatScreen/MessageInput/PauseButton.tsx`
- [x] `features/ChatScreen/MessageInput/PreviewItems/FileItem.tsx`
- [x] `features/ChatScreen/MessageInput/PreviewItems/ImageItem.tsx`
- [x] `features/ChatScreen/MessageInput/PreviewItems/PreviewItem.tsx`
- [x] `features/ChatScreen/MessageInput/SendButton.tsx`
- [x] `features/ChatScreen/MessageInput/ThinkButton.tsx`
- [x] `features/ChatScreen/MessageInput/ToolButton.tsx`
- [x] `features/ChatScreen/MessageInput/ToolPreview.tsx`

**Features - Sheet**

- [x] `features/Sheet/BottomSheetSearchInput.tsx`
- [x] `features/Sheet/CitationSheet.tsx`
- [x] `features/Sheet/ModelSheet.tsx`
- [x] `features/Sheet/ReasoningSheet.tsx`
- [x] `features/Sheet/TextSelectionSheet.tsx`
- [x] `features/Sheet/ToolSheet/CameraModal.tsx`
- [x] `features/Sheet/ToolSheet/ExternalTools.tsx`
- [x] `features/Sheet/ToolSheet/index.tsx`
- [x] `features/Sheet/ToolSheet/SystemTools.tsx`
- [x] `features/Sheet/ToolUseSheet.tsx`
- [x] `features/Sheet/WebsearchSheet.tsx`

**Features - Menu**

- [x] `features/Menu/CustomDrawerContent.tsx`
- [x] `features/Menu/MenuTabContent.tsx`

**Features - SettingsScreen**

- [x] `features/SettingsScreen/AddModelSheet.tsx`
- [x] `features/SettingsScreen/AddProviderSheet.tsx`
- [x] `features/SettingsScreen/ApiCheckSheet.tsx`
- [x] `features/SettingsScreen/EmptyModelView.tsx`
- [x] `features/SettingsScreen/ModelSelect.tsx`
- [x] `features/SettingsScreen/ProviderIconButton.tsx`
- [x] `features/SettingsScreen/ProviderItem.tsx`
- [x] `features/SettingsScreen/ProviderSelect.tsx`
- [x] `features/SettingsScreen/RestoreProgressModal.tsx`
- [x] `features/SettingsScreen/WebSearchApiCheckSheet.tsx`
- [x] `features/SettingsScreen/WebsearchProviderRow.tsx`

**Icons**

- [x] `icons/ArrowIcon/index.tsx`
- [x] `icons/AssetsIcon/index.tsx`
- [x] `icons/DefaultProviderIcon/index.tsx`
- [x] `icons/EditIcon/index.tsx`
- [x] `icons/FallbackFavicon/index.tsx`
- [x] `icons/FileIcon/index.tsx`
- [x] `icons/LucideIcon/index.tsx`
- [x] `icons/MarketIcon/index.tsx`
- [x] `icons/MdiLightbulbIcon/index.tsx`
- [x] `icons/ModelChangeIcon/index.tsx`
- [x] `icons/ModelIcon/index.tsx`
- [x] `icons/MultiModelIcon/index.tsx`
- [x] `icons/ProviderIcon/index.tsx`
- [x] `icons/TranslationIcon/index.tsx`
- [x] `icons/UnionIcon/index.tsx`
- [x] `icons/UnionPlusIcon/index.tsx`
- [x] `icons/UserChangeIcon/index.tsx`
- [x] `icons/VoiceIcon/index.tsx`
- [x] `icons/WebSearchIcon/index.tsx`

**Barrel**

- [x] `index.ts`

### 🔄 待迁移组件

当前无待迁移的旧组件。

### 页面组件 (`src/screens/`, 2/57 待迁移)

- [ ] `home/messages/MultiModelTab.tsx`
- [ ] `settings/providers/ManageModelsScreen.tsx`
- 其余 55 个页面文件已移除 Tamagui 依赖，无需迁移。

### 其他 Tamagui 入口 (3/4 已迁移)

- [ ] `src/App.tsx`
- [x] `src/hooks/useDialog.tsx`
- [x] `src/hooks/useToast.tsx`
- [x] `src/navigators/AssistantDetailTabNavigator.tsx`

### 间接依赖（等待相关组件迁移或回归验证）

- `src/hooks/useRestore.ts`、`src/screens/settings/data/*`（依赖 `RestoreProgressModal`）。

## 迁移指南

### 推荐迁移顺序

1. **数据与设置模块**：替换 `RestoreProgressModal`，解锁数据恢复流程的 HeroUI 版本。
2. **页面与基础入口**：统一 Tabs、导航与全局弹窗逻辑，清理剩余 3 个 Tamagui 入口。
3. **回归与验收**：针对迁移后的 Sheet 与消息输入链路补充回归测试与 Storybook 校验。

### 常见迁移模式

1. 将 `tamagui` 导入替换为 HeroUI 或 `componentsV2` 中的封装组件。
2. 调整属性以对齐 HeroUI API，必要时使用 Tailwind className 覆盖样式。
3. 将 Tamagui token 映射到项目配色方案 (`text-*`, `bg-*`, `border-*`)。
4. 替换交互组件（如 `Tabs`, `Switch`, `Select`）时，同步迁移依赖的上下文与逻辑。
5. 迁移完成后回归测试相关页面，确认主题切换与交互反馈正常。

### 测试策略

- 为新增的 HeroUI 组件增加 Storybook / 单元测试或最小使用示例。
- 手动验证受影响页面的亮暗模式、不同屏幕尺寸与可访问性表现。
- 对表单组件执行输入校验、焦点控制、滚动行为检查。
- 聊天相关组件需验证键盘交互、长列表性能与动画效果。

## 进度追踪

- **总体进度**: 156 / 159 (98.1%) — 已脱离 Tamagui 的文件 / 跟踪总文件
- **旧组件目录 (`src/components`)**: 目录已移除，后续无需跟踪
- **页面 (`src/screens`)**: 55 / 57 (96.5%)
- **其他核心入口**: 3 / 4 (75%)
- **HeroUI 组件库**: 98 / 98 (100%)
