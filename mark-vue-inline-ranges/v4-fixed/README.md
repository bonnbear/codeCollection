# V4-Fixed: 注释系列最终版（CSS 括号追踪修复）

基于 `v4` 修复，只加注释，不影响源文件行数。

## 修复内容

`collectStyleUnsafeLines()` 新增 **圆括号深度追踪**，解决 CSS 多行函数值内部被错误打标的问题：

```css
/* 修复前：linear-gradient() 内部每行都被追加注释 */
background: linear-gradient( /*payload*/
  to bottom, /*payload*/      ← ❌ 错误
  #fff, /*payload*/           ← ❌ 错误  
  #000 /*payload*/            ← ❌ 错误
); /*payload*/

/* 修复后：括号内全部跳过 */
background: linear-gradient(
  to bottom,
  #fff,
  #000
);
border-radius: 4px; /*payload*/   ← ✅ 只在括号外打标
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `mark-vue-inline-ranges-v4.cjs` | V4-Fixed 工具（纯注释模式） |
| `ranges.json` | 测试用 ranges 配置 |
| `EdgeTest.vue` | 原始测试文件（202 行） |
| `EdgeTest.vue.marked.output` | 处理后输出（202 行，行数不变） |

## 使用

```bash
# 预览不写入
node mark-vue-inline-ranges-v4.cjs ranges.json --dry-run

# 正式标记（备份原文件）
node mark-vue-inline-ranges-v4.cjs ranges.json --backup
```

## 边界场景覆盖

- SFC 根块标签跳过 (`<template>`, `<script setup>`, `<style>`)
- 多行 HTML 属性值 / `{{ }}` 插值 / HTML 注释内部跳过
- 多行开始标签内安全插入 data 属性
- v-else 邻接风险保护
- `<Transition>` / `<slot>` / 内层 `<template>` 保护
- 特殊指令行保护 (`/// <reference`, `//# sourceMappingURL`)
- JSX 行保护
- **CSS 圆括号 `()` 内部跳过** (linear-gradient, calc, var 等)
- 自定义块跳过 (`<i18n>`, `<route>` 等)
- 已有标记防重复
