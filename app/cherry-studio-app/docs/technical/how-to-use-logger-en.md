# How to use the LoggerService

This is a developer document on how to use the logger.

CherryStudio uses a unified logging service to print and record logs. **Unless there is a special reason, do not use `console.xxx` to print logs**

The following are detailed instructions.

## Usage in React Native

### Importing

```typescript
import { loggerService } from '@/services/LoggerService'
```

### Setting module information (Required by convention)

After the import statements, set it up as follows:

```typescript
const logger = loggerService.withContext('moduleName')
```

- `moduleName` is the name of the current file's module. It can be named after the filename, main class name, main function name, etc. The principle is to be clear and understandable.
- `moduleName` will be printed in the terminal and will also be present in the file log, making it easier to filter.

### Setting `CONTEXT` information (Optional)

In `withContext`, you can also set other `CONTEXT` information:

```typescript
const logger = loggerService.withContext('moduleName', CONTEXT)
```

- `CONTEXT` is an object of the form `{ key: value, ... }`.
- `CONTEXT` information will not be printed in the terminal, but it will be recorded in the file log, making it easier to filter.

### Logging

In your code, you can call `logger` at any time to record logs. The supported methods are: `error`, `warn`, `info`, `verbose`, `debug`, `silly`.
For the meaning of each level, please refer to the section below.

The following examples show how to use `logger.info` and `logger.error`. Other levels are used in the same way:

```typescript
logger.info('message', data1, data2, ...)
logger.info('message', { key: 'value' })
logger.error('message', new Error('error message'))
logger.info('message', { logToFile: true }) // Force log to file
```

- `message` is a required string. All other parameters are optional.
- Additional data can be passed as separate parameters and will be logged.
- If an `Error` type is passed, the error stack will be automatically recorded.
- To force a log entry to be written to file regardless of the current file log level, add `{ logToFile: true }` as the last parameter.

### Console Log Levels

- In the development environment, all log levels (`silly` and above) are printed to the console.
- In the production environment, the default console log level is `info`. Only `info` level and above are printed to the console.

Changing the console log level:

- You can change the console log level with `logger.setConsoleLevel('newLevel')`.
- `logger.resetConsoleLevel()` resets it to the default level.
- `logger.getConsoleLevel()` gets the current console log level.

**Note:** Changing the log level has a global effect. Please do not change it arbitrarily in your code unless you are very clear about what you are doing.

### File Log Levels

- In both development and production environments, the default file log level is `info`. Only `info` level and above are written to the log file.
- Log files are stored in the app's document directory.

Changing the file log level:

- You can change the file log level with `logger.setFileLogLevel('newLevel')`.
- `logger.resetFileLogLevel()` resets it to the default level.
- `logger.getFileLogLevel()` gets the current file log level.

**Note:** Changing the file log level has a global effect. Please do not change it arbitrarily in your code unless you are very clear about what you are doing.

### Additional Utility Methods

The LoggerService provides additional utility methods for managing log files:

#### Reading Log File Contents

```typescript
const logContents = await logger.getLogFileContents()
```

This method returns the contents of the current log file as a string.

#### Clearing Log File

```typescript
await logger.clearLogFile()
```

This method deletes the current log file.

#### Getting Log File Path

```typescript
const logPath = logger.getLogFilePath()
```

This method returns the absolute path to the log file.

## Log Level Usage Guidelines

There are many log levels. The following are the guidelines that should be followed in CherryStudio for when to use each level:
(Arranged from highest to lowest priority, with numeric values from the LEVEL_MAP)

| Log Level     | Priority | Core Definition & Use Case                                                                                                                                                                          | Example                                                                                                                                                                                                            |
| :------------ | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`error`**   | 5        | **Critical error causing the program to crash or core functionality to become unusable.** <br> This is the highest-priority log, usually requiring immediate reporting or user notification.        | - Application crash. <br> - Failure to read/write critical user data files (e.g., database, configuration files), preventing the application from running. <br> - All unhandled exceptions.                        |
| **`warn`**    | 4        | **Potential issue or unexpected situation that does not affect the program's core functionality.** <br> The program can recover or use a fallback.                                                  | - Configuration file `settings.json` is missing; started with default settings. <br> - Auto-update check failed, but does not affect the use of the current version. <br> - A non-essential plugin failed to load. |
| **`info`**    | 3        | **Records application lifecycle events and key user actions.** <br> This is the default level that should be recorded in a production release to trace the user's main operational path.            | - Application start, exit. <br> - User successfully opens/saves a file. <br> - Main screen created/closed. <br> - Starting an important task (e.g., "Start export process").                                       |
| **`verbose`** | 2        | **More detailed flow information than `info`, used for tracing specific features.** <br> Enabled when diagnosing issues with a specific feature to help understand the internal execution flow.     | - Loading module. <br> - Navigation events. <br> - Applying filters or transformations.                                                                                                                            |
| **`debug`**   | 1        | **Detailed diagnostic information used during development and debugging.** <br> **Must not be enabled by default in production releases**, as it may contain sensitive data and impact performance. | - Parameters for function calls: `{ width: 800, ... }`. <br> - Specific data content in API responses. <br> - Details of state changes in React components.                                                        |
| **`silly`**   | 0        | **The most detailed, low-level information, used only for extreme debugging.** <br> Rarely used in regular development; only for solving very difficult problems.                                   | - Real-time touch coordinates. <br> - Size of each data chunk when reading a file. <br> - Time taken for each rendered frame.                                                                                      |
