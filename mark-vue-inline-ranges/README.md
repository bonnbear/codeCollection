# mark-vue-inline-ranges

给 Vue 单文件组件（`.vue`）按「行号区间」批量打**行内标记**的小脚本。

对指定区间内的每一行，在**语法安全的位置**追加一条标记：

| 区块 | 标记形式 | 示例 |
|------|----------|------|
| `<template>` 普通行 | HTML 注释 | `<div> <!--Home.vue\|range:23-49\|random:12345678-->` |
| `<template>` 多行开始标签内部 | `data-mark-*` 属性 | `class="box" data-mark-r12345678="Home.vue\|range:23-49\|random:12345678"` |
| `<script>` | `//` 行注释 | `const a = 1 //Home.vue\|range:23-49\|random:12345678` |
| `<style>` | `/* */` 块注释 | `padding: 8px; /*Home.vue\|range:23-49\|random:12345678*/` |

每条标记包含：`文件名 | range:起-止 | random:8位随机数`。同一个区间内所有行共用同一个 `random`，方便按区间归类、检索、再清除。

---

## 运行环境

- Node.js（用到内置 `fs` / `path` / `crypto`，**无需安装任何依赖**）

---

## 调用方式

```bash
node mark-vue-inline-ranges.js <ranges.json>
```

唯一参数是一个 **JSON 配置文件路径**，描述「哪些文件的哪些行号区间要打标记」。

```bash
# 示例
node mark-vue-inline-ranges.js ranges.json
```

> ⚠️ 脚本会**就地修改**（原地覆盖）目标 `.vue` 文件，建议先提交 git 或先备份。

---

## 参数文件 `ranges.json` 的格式

顶层是一个对象：**键 = .vue 文件路径**（相对运行目录或绝对路径均可），**值 = 该文件的区间数组**。

```jsonc
{
  "src/views/Home.vue":   [[23, 49]],                 // 数组形式 [起, 止]
  "src/views/About.vue":  [[1, 30], [60, 90]],          // 一个文件可多个区间
  "src/App.vue":          [{ "start": 10, "end": 25 }], // 对象形式 {start, end}
  "src/components/Foo.vue": ["12,40"],                  // 字符串 "起,止"
  "src/components/Bar.vue": ["（5，18）", "[20,33]"]      // 兼容全角 / 中括号
}
```

### 区间（range）支持的写法

| 写法 | 例子 |
|------|------|
| 数组 | `[23, 49]` |
| 对象 | `{ "start": 23, "end": 49 }`（也认 `begin/from`、`to`） |
| 半角字符串 | `"23,49"` / `"(23,49)"` / `"[23,49]"` |
| 全角字符串 | `"（23，49）"` / `"【23，49】"` |

说明：
- 行号从 **1** 开始；`起 > 止` 会自动交换；超出文件范围会被裁剪。
- 多个区间**重叠**时，同一行只被**第一个**覆盖它的区间标记，不会叠加多条。

---

## 完整示例

`ranges.json`：

```json
{
  "src/components/marktest/TestEdge.vue": [[1, 60]],
  "src/views/Home.vue": [[10, 25], "（40，55）"]
}
```

运行：

```bash
node mark-vue-inline-ranges.js ranges.json
```

输出：

```
[完成] src/components/marktest/TestEdge.vue
[完成] src/views/Home.vue
```

打标记后（`<template>` 多行标签自动用 `data-mark` 属性，含 `>` 的属性行也能正确打上）：

```html
<button data-mark-r93178947="TestEdge.vue|range:1-60|random:86789360"
  class="b1" data-mark-r16535970="TestEdge.vue|range:1-60|random:86789360"
  @click="() => count++" data-mark-r91740350="TestEdge.vue|range:1-60|random:86789360"
  :title="count > 0 ? '正数' : '非正'" data-mark-r40328674="TestEdge.vue|range:1-60|random:86789360"
>
```

---

## 语法安全策略（自动跳过这些行，避免破坏语法）

- **空行**、以及顶格的 SFC 根块标签行（`<template>` / `<script>` / `<style>` 及其闭合）
- `<template>`：多行属性值内部（如跨行的 `:class="{…}"`）、多行 `{{ }}` 插值内部、多行 `<!-- -->` 注释内部
- `<script>`：多行字符串 / 模板字符串内部、多行块注释 `/* */` 内部
- `<style>`：多行注释 `/* */` 内部
- 缩进的嵌套 `<template v-if>` **不会**被当作根块跳过（仍会被标记）

---

## 重复运行安全（幂等）

脚本会识别已存在的标记（`range:..-.. random/|random:..` 或 `data-mark-r..=`），**已标记的行不会被再次追加**，可重复运行而不会叠加。

---

## 清除标记

标记格式固定，可用编辑器全局替换或 `sed` 批量删除，例如：

```bash
# 删除行内 HTML / JS / CSS 注释形式的标记
sed -i '' -E 's/ *<!--[^|]+\|range:[0-9]+-[0-9]+\|random:[0-9]+-->//g' path/to/*.vue
sed -i '' -E 's| *//[^|]+\|range:[0-9]+-[0-9]+\|random:[0-9]+||g' path/to/*.vue
sed -i '' -E 's| */\*[^|]+\|range:[0-9]+-[0-9]+\|random:[0-9]+\*/||g' path/to/*.vue
# 删除 template 中的 data-mark 属性
sed -i '' -E 's/ *data-mark-r[0-9]+="[^"]*"//g' path/to/*.vue
```

> 上面是 macOS 的 `sed -i ''` 写法；Linux 用 `sed -i -E ...`（去掉空引号）。
