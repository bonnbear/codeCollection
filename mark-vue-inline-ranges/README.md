# Vue 文件行标记工具

给 Vue 单文件组件的指定行范围添加标记，支持 template/script/style 三种块。

## 安装

```bash
npm install @vue/compiler-sfc
```

## 使用方法

```bash
node mark-vue-inline-ranges.cjs ranges.json [选项]
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `ranges.json` | **必需**，定义要标记的文件和行范围 |
| `--dry-run` | 只预览，不写入文件 |
| `--backup` | 写入前生成 `.bak` 备份 |
| `--no-template-comments` | template 中无法插 data 属性时直接跳过，不追加 HTML 注释 |
| `--mark-style <style>` | 标记样式（见下表） |

### 标记样式

| 样式 | script | style |
|------|--------|-------|
| `default` | `//` 注释 | `/* */` 注释 |
| `block` | `/* */` 注释 | `/* */` 注释 |
| `semicolon` | - | `;;/* */` 每行加分号 |
| `random` | 随机 `//` 或 `/* */` | `/* */` |
| `random-semicolon` | - | 50% 概率加分号 |

**默认值**: `random`

## ranges.json 格式

```json
{
  "src/views/Home.vue": [[1, 10]],
  "src/components/Button.vue": [[23, 49], [100, 120]],
  "src/App.vue": ["5-10", "20-30"]
}
```

### 支持的格式

每个文件可以配置多个行范围，支持以下格式：

```json
{
  "file.vue": [
    [1, 10],           // 数组格式
    "5-10",            // 字符串格式
    "（3，7）",         // 中文括号
    "【5，9】",         // 中文方括号
    "3~7",             // 波浪号分隔
    "3:7"              // 冒号分隔
  ]
}
```

### 格式兼容表

| 格式 | 示例 |
|------|------|
| 英文括号 | `"(23,49)"` |
| 中文括号 | `"（23，49）"` |
| 英文方括号 | `"[23,49]"` |
| 中文方括号 | `"【23，49】"` |
| 逗号分隔 | `"23,49"` |
| 横线分隔 | `"23-49"` |
| 波浪号分隔 | `"23~49"` |
| 冒号分隔 | `"23:49"` |
| 带前缀 | `"range:23-49"` |

**注意**：反向范围会自动修正，如 `[10, 5]` 会变成 `[5, 10]`。

## 标记效果

### template

```html
<!-- 插入 data 属性 -->
<div data-mark-r12345678="App.vue|range:1-5|random:87654321">内容</div>

<!-- 无法插入属性时追加 HTML 注释 -->
</div> <!--App.vue|range:1-5|random:87654321-->
```

### script

```javascript
const x = 1 //App.vue|range:8-10|random:12345678

// 或 block 样式
const y = 2 /*App.vue|range:8-10|random:12345678*/
```

### style

```css
color: red; /*App.vue|range:15-20|random:12345678*/

/* semicolon 样式 */
background: blue;;/*App.vue|range:15-20|random:12345678*/
```

## 边缘场景处理

工具会智能跳过以下场景：

- ✅ 多行字符串内部
- ✅ 多行注释内部
- ✅ 模板字符串内部
- ✅ HTML 属性值内部
- ✅ `{{ }}` 插值内部
- ✅ 已有标记的行（防止重复标记）
- ✅ SFC 顶层标签行（`<template>`, `<script setup>`, `<style scoped>`）
- ✅ 自定义块（`<i18n>`, `<route>` 等）
- ✅ v-else 邻接风险场景

## 示例

### 基本用法

```bash
# 标记文件
node mark-vue-inline-ranges.cjs ranges.json

# 预览不写入
node mark-vue-inline-ranges.cjs ranges.json --dry-run

# 备份原文件
node mark-vue-inline-ranges.cjs ranges.json --backup

# 使用特定样式
node mark-vue-inline-ranges.cjs ranges.json --mark-style block
```

### ranges.json 示例

```json
{
  "src/views/Home.vue": [
    [1, 50],
    [100, 150]
  ],
  "src/components/Button.vue": [
    "23-49",
    "（60，80）"
  ],
  "src/App.vue": [
    [5, 2],
    [10, 15]
  ]
}
```

## 测试

```bash
# 验证所有标记文件语法
node validate.js
```

## 依赖

- Node.js >= 14
- @vue/compiler-sfc

## License

MIT
