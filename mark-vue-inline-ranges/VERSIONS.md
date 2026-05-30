# mark-vue-inline-ranges 版本说明

## 快速选择

| 需求 | 推荐版本 |
|------|---------|
| 只加注释，不改代码结构 | **v4** |
| 加假分号混淆 | **v7** |

---

## v3 → v7 演进（核心功能线）

### v3（基础版）
- 基础功能，支持 template / script / style 块注释插入

### v4（+安全检测）
- 新增 `hasTemplateCommentRisk()`：跳过 `<Transition>`、`<slot>`、`<template>` 附近的行，避免破坏 `v-else` 邻接关系
- 新增 `isSpecialDirectiveLine()`：跳过 `/// <reference`、`//# sourceMappingURL=` 等特殊指令行
- 新增 `isJsxLine()`：跳过含 JSX 标签的行
- **注释系列最终版，推荐使用**

### v5（+假分号，默认风格切换）
- 默认风格从 `random` 改为 `random-semicolon`
- `random-semicolon` 扩展到 script 块（注释前随机插入 0–3 个分号）

### v6（+语法感知）
- 新增脚本上下文追踪（`arrayDepth`、`objectDepth`、`templateDepth`）
- 新增 `shouldSkipSemicolonWithReason()`，以下位置不加分号：
  - 对象方法定义、对象/数组字面量开头结尾
  - 解构赋值、`import` / `export` 语句
  - 模板字符串行、数组/对象/模板字面量内部行

### v7（修复 shebang 缩进）
- 与 v6 逻辑完全相同，仅修复 `#!/usr/bin/env node` 误缩进
- **假分号系列最终版，推荐使用**

---

## 三个独立文件（CLI 功能线）

### mark-vue-inline-ranges.js（最早原型）
- 只接受一个位置参数，无可选 CLI 参数
- 无错误处理
- script 固定 `//`，style 固定 `/* */`

### mark-vue-inline-ranges1.js（健壮性增强）
- 新增 `--dry-run`、`--backup`、`--no-template-comments` 参数
- JSON 读取加 try/catch 和格式校验
- 根标签行识别支持多行开始标签（如 `<script\n  setup\n>`）
- 新增 `unknown` 块跳过、白名单机制、raw text 行跳过
- payload 文件名安全化

### mark-vue-inline-ranges.cjs（当前主文件）
- 在 `1.js` 基础上新增 `--mark-style` 参数
- script 支持：`default`（`//`）、`block`（`/* */`）、`random`（默认，随机选）
- style 支持：`default`（`/* */`）、`semicolon`（固定加分号）、`random-semicolon`（50% 概率）
