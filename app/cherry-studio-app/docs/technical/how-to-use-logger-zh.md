# 如何使用日志 LoggerService

这是关于如何使用日志的开发者文档。

CherryStudio使用统一的日志服务来打印和记录日志，**若无特殊原因，请勿使用`console.xxx`来打印日志**

以下是详细说明

## 在 React Native 中使用

### 引入

```typescript
import { loggerService } from '@/services/LoggerService'
```

### 设置module信息（规范要求）

在import头之后，设置：

```typescript
const logger = loggerService.withContext('moduleName')
```

- `moduleName`是当前文件模块的名称，命名可以以文件名、主类名、主函数名等，原则是清晰明了
- `moduleName`会在终端中打印出来，也会在文件日志中体现，方便筛选

### 设置`CONTEXT`信息（可选）

在`withContext`中，也可以设置其他`CONTEXT`信息：

```typescript
const logger = loggerService.withContext('moduleName', CONTEXT)
```

- `CONTEXT`为`{ key: value, ... }`
- `CONTEXT`信息不会在终端中打印出来，但是会在文件日志中记录，方便筛选

### 记录日志

在代码中，可以随时调用 `logger` 来记录日志，支持的方法有：`error`, `warn`, `info`, `verbose`, `debug`, `silly`
各级别的含义，请参考下面的章节。

以下以 `logger.info` 和 `logger.error` 举例如何使用，其他级别是一样的：

```typescript
logger.info('message', data1, data2, ...)
logger.info('message', { key: 'value' })
logger.error('message', new Error('error message'))
logger.info('message', { logToFile: true }) // 强制记录到文件
```

- `message` 是必填的字符串，其他参数都是可选的
- 可以传递额外的数据作为单独的参数，这些数据会被记录
- 如果传递了`Error`类型，会自动记录错误堆栈
- 要强制将日志条目写入文件（无论当前文件日志级别如何），可以在最后一个参数中添加 `{ logToFile: true }`

### 控制台日志级别

- 开发环境下，所有日志级别（`silly` 及以上）都会打印到控制台
- 生产环境下，默认控制台日志级别为 `info`，只有 `info` 级别及以上的日志会打印到控制台

更改控制台日志级别：

- 可以通过 `logger.setConsoleLevel('newLevel')` 来更改控制台日志级别
- `logger.resetConsoleLevel()` 可以重置为默认级别
- `logger.getConsoleLevel()` 可以获取当前控制台日志级别

**注意** 更改日志级别是全局生效的，请不要在代码中随意更改，除非你非常清楚自己在做什么

### 文件日志级别

- 在开发和生产环境下，默认文件日志级别为 `info`，只有 `info` 级别及以上的日志会写入日志文件
- 日志文件存储在应用的文档目录中

更改文件日志级别：

- 可以通过 `logger.setFileLogLevel('newLevel')` 来更改文件日志级别
- `logger.resetFileLogLevel()` 可以重置为默认级别
- `logger.getFileLogLevel()` 可以获取当前文件日志级别

**注意** 更改文件日志级别是全局生效的，请不要在代码中随意更改，除非你非常清楚自己在做什么

### 其他实用方法

LoggerService 提供了用于管理日志文件的其他实用方法：

#### 读取日志文件内容

```typescript
const logContents = await logger.getLogFileContents()
```

此方法返回当前日志文件的内容作为字符串。

#### 清空日志文件

```typescript
await logger.clearLogFile()
```

此方法删除当前日志文件。

#### 获取日志文件路径

```typescript
const logPath = logger.getLogFilePath()
```

此方法返回日志文件的绝对路径。

## 日志级别的使用规范

日志有很多级别，什么时候应该用哪个级别，下面是在CherryStudio中应该遵循的规范：
(按优先级从高到低排列，包含 LEVEL_MAP 中的数值)

| 日志级别      | 优先级 | 核心定义与使用场景                                                                                       | 示例                                                                                                                                 |
| :------------ | :----- | :------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **`error`**   | 5      | **严重错误，导致程序崩溃或核心功能无法使用。** <br> 这是最高优先级的日志，通常需要立即上报或提示用户。   | - 应用崩溃。 <br> - 无法读写用户关键数据文件（如数据库、配置文件），导致应用无法运行。<br> - 所有未捕获的异常。                      |
| **`warn`**    | 4      | **潜在问题或非预期情况，但不影响程序核心功能。** <br> 程序可以从中恢复或使用备用方案。                   | - 配置文件 `settings.json` 缺失，已使用默认配置启动。 <br> - 自动更新检查失败，但不影响当前版本使用。<br> - 某个非核心插件加载失败。 |
| **`info`**    | 3      | **记录应用生命周期和关键用户行为。** <br> 这是发布版中默认应记录的级别，用于追踪用户的主要操作路径。     | - 应用启动、退出。<br> - 用户成功打开/保存文件。 <br> - 主屏幕创建/关闭。<br> - 开始执行一项重要任务（如"开始导出过程"）。           |
| **`verbose`** | 2      | **比 `info` 更详细的流程信息，用于追踪特定功能。** <br> 在诊断特定功能问题时开启，帮助理解内部执行流程。 | - 正在加载模块。 <br> - 导航事件。<br> - 正在应用滤镜或变换。                                                                        |
| **`debug`**   | 1      | **开发和调试时使用的详细诊断信息。** <br> **严禁在发布版中默认开启**，因为它可能包含敏感数据并影响性能。 | - 函数调用的参数: `{ width: 800, ... }`。<br> - API 响应中的具体数据内容。<br> - React 组件中的状态变更详情。                        |
| **`silly`**   | 0      | **最详尽的底层信息，仅用于极限调试。** <br> 几乎不在常规开发中使用，仅为解决棘手问题。                   | - 实时触摸坐标。<br> - 读取文件时每个数据块（chunk）的大小。<br> - 每一次渲染帧的耗时。                                              |
