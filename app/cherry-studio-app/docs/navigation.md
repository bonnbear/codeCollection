# Cherry Studio 导航架构文档

## 导航架构概览

Cherry Studio 采用层次化的导航结构，基于 React Navigation v7 构建，主要分为四个层级：

1. **根导航层**：MainStackNavigator（应用入口）
2. **主抽屉导航层**：AppDrawerNavigator（侧边栏导航）
3. **功能模块导航层**：各功能区域的 StackNavigator
4. **详细页面导航层**：具体功能的子导航

## 导航层级结构

### 第一层：根导航（MainStackNavigator）

**文件位置**：`src/navigators/MainStackNavigator.tsx`

根导航负责应用的初始化流程，根据用户状态决定显示欢迎页面还是主界面：

```
MainStackNavigator
├── WelcomeScreen（欢迎页面）- 仅在首次使用时显示
└── HomeScreen（主界面）- 实际指向 AppDrawerNavigator
```

**特点**：

- 根据 Redux 状态 `app.welcomeShown` 决定是否显示欢迎页面
- 无动画过渡效果（`animation: 'none'`）
- 隐藏头部导航栏

### 第二层：主抽屉导航（AppDrawerNavigator）

**文件位置**：`src/navigators/AppDrawerNavigator.tsx`

主抽屉导航是应用的核心导航容器，提供侧边栏菜单访问各个功能模块：

```
AppDrawerNavigator
├── Home（主页模块）→ HomeStackNavigator
├── Assistant（助手模块）→ AssistantStackNavigator
├── Settings（设置模块）→ SettingsStackNavigator
```

**配置特点**：

- 自定义抽屉内容：`CustomDrawerContent`
- 抽屉宽度：屏幕宽度的 80%
- 抽屉类型：滑动式（`slide`）
- 支持手势滑动（除设置模块外）

### 第三层：功能模块导航

#### 3.1 主页导航（HomeStackNavigator）

**文件位置**：`src/navigators/HomeStackNavigator.tsx`

处理聊天相关的页面导航：

```
HomeStackNavigator
├── ChatScreen（聊天界面）- 参数：{ topicId: string }
├── TopicScreen（话题管理）
└── AssistantDetailScreen（助手详情）- 参数：{ assistantId: string; tab?: string }
```

#### 3.2 助手导航（AssistantStackNavigator）

**文件位置**：`src/navigators/AssistantStackNavigator.tsx`

管理 AI 助手相关功能：

```
AssistantStackNavigator
├── AssistantScreen（助手主页）
├── AssistantMarketScreen（助手市场）
└── AssistantDetailScreen（助手详情）- 参数：{ assistantId: string; tab?: string }
```

#### 3.3 设置导航（SettingsStackNavigator）

**文件位置**：`src/navigators/SettingsStackNavigator.tsx`

应用设置的总入口，连接各个设置子模块：

```
SettingsStackNavigator
├── SettingsScreen（设置主页）
├── GeneralSettings（通用设置）→ GeneralSettingsStackNavigator
├── AssistantSettings（助手设置）→ AssistantSettingsStackNavigator
├── ProvidersSettings（提供商设置）→ ProvidersStackNavigator
├── DataSourcesSettings（数据源设置）→ DataSourcesStackNavigator
├── WebSearchSettings（网页搜索设置）→ WebSearchStackNavigator
└── AboutSettings（关于设置）→ AboutStackNavigator
```

### 第四层：设置子导航

#### 4.1 通用设置导航（GeneralSettingsStackNavigator）

**文件位置**：`src/navigators/settings/GeneralSettingsStackNavigator.tsx`

```
GeneralSettingsStackNavigator
├── GeneralSettingsScreen（通用设置主页）
├── ThemeSettingsScreen（主题设置）
└── LanguageChangeScreen（语言切换）
```

#### 4.2 提供商设置导航（ProvidersStackNavigator）

**文件位置**：`src/navigators/settings/ProvidersStackNavigator.tsx`

管理 AI 服务提供商的复杂配置流程：

```
ProvidersStackNavigator
├── ProvidersScreen（提供商列表）
├── ProviderSettingsScreen（提供商设置）- 参数：{ providerId: string }
├── ProviderListScreen（提供商选择列表）
├── ManageModelsScreen（模型管理）- 参数：{ providerId: string }
└── ApiServiceScreen（API 服务配置）- 参数：{ providerId: string }
```

#### 4.3 其他设置子导航

- **AssistantSettingsStackNavigator**：助手相关设置
- **DataSourcesStackNavigator**：数据源管理
- **WebSearchStackNavigator**：网页搜索配置
- **AboutStackNavigator**：应用信息和关于页面

## 导航设计原则

### 1. 层次化设计

- **清晰的功能分层**：每个导航器负责特定的功能域
- **递进式结构**：从通用到具体，逐级细化
- **模块化组织**：各功能模块相对独立，便于维护

### 2. 用户体验优化

- **统一的过渡动画**：所有 Stack 导航器都使用 iOS 风格的右滑过渡
- **隐藏原生头部**：使用自定义头部组件，保证视觉一致性
- **手势导航支持**：抽屉导航支持手势滑动（设置页面除外）

### 3. 类型安全

- **强类型参数定义**：每个导航器都定义了 TypeScript 参数类型
- **导航属性类型导出**：提供 `NavigationProp` 类型用于组件中的导航操作

### 4. 兼容性考虑

- **向后兼容**：在抽屉导航中保留了直接的 `ChatScreen` 和 `TopicScreen` 入口
- **渐进式重构**：新的层次化结构与旧的直接导航并存

## 导航状态管理

### Redux 集成

- **欢迎页面控制**：通过 `app.welcomeShown` 状态控制首次启动流程
- **导航状态持久化**：React Navigation 自动处理导航状态的持久化

### 参数传递

各导航器支持类型安全的参数传递：

- `ChatScreen`: `{ topicId: string }` - 指定要打开的对话 ID
- `AssistantDetailScreen`: `{ assistantId: string; tab?: string }` - 助手详情页面和可选的标签页
- `ProviderSettingsScreen`: `{ providerId: string }` - 特定提供商的设置页面
- `ManageModelsScreen`: `{ providerId: string }` - 特定提供商的模型管理
- `ApiServiceScreen`: `{ providerId: string }` - 特定提供商的 API 服务配置

## 关键文件说明

| 文件路径                                     | 作用         | 包含屏幕                                       |
| -------------------------------------------- | ------------ | ---------------------------------------------- |
| `MainStackNavigator.tsx`                     | 应用根导航   | WelcomeScreen, HomeScreen                      |
| `AppDrawerNavigator.tsx`                     | 主抽屉导航   | 连接各功能模块                                 |
| `HomeStackNavigator.tsx`                     | 主页功能导航 | ChatScreen, TopicScreen, AssistantDetailScreen |
| `AssistantStackNavigator.tsx`                | 助手功能导航 | AssistantScreen, AssistantMarketScreen         |
| `SettingsStackNavigator.tsx`                 | 设置总导航   | 连接各设置子模块                               |
| `settings/GeneralSettingsStackNavigator.tsx` | 通用设置     | 主题、语言设置                                 |
| `settings/ProvidersStackNavigator.tsx`       | 提供商设置   | API 配置、模型管理                             |

## 导航最佳实践

1. **使用类型安全的导航**：始终使用 TypeScript 定义的参数类型
2. **避免深层嵌套**：当前架构最多支持四层导航，避免更深的嵌套
3. **保持导航一致性**：所有同级导航器使用相同的过渡动画和配置
4. **合理的参数设计**：导航参数应该简洁且必要，避免传递复杂对象

这种层次化的导航架构为 Cherry Studio 提供了清晰的信息架构和流畅的用户体验，同时保证了代码的可维护性和扩展性。
