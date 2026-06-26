# vue-sfc-file-block-marker

按 `ranges.json` 的文件路径清单处理 Vue SFC 的整块内容：

- `mark-vue-template-by-files`：处理整个 `<template>` 块，给普通开始标签插入 `data-mark-xxxxxxxx`。
- `mark-vue-script-void-by-files`：处理整个 `<script>` / `<script setup>` 块，插入 `void "File.vue|script:all|random:xxxxxxxx";`。

`ranges.json` 的 value 不参与行号判断，只取 key 作为文件路径。

## 用法

```bash
node bin/mark-vue-template-by-files.js ranges.json --dry-run
node bin/mark-vue-template-by-files.js ranges.json --backup

node bin/mark-vue-script-void-by-files.js ranges.json --dry-run
node bin/mark-vue-script-void-by-files.js ranges.json --backup
```

`ranges.json` 支持对象或数组：

```json
{
  "src/views/BusinessObjective.vue": [[75, 479]],
  "src/App.vue": ["10-80"]
}
```

```json
[
  "src/App.vue",
  "src/views/Home.vue"
]
```

## 行为

- 只处理 `.vue` 文件。
- template 脚本只处理顶层 `<template>` 内容，不处理 `script` / `style`。
- template 脚本跳过空行、注释行、结束标签、已经带 `data-mark-xxxxxxxx` 的行。
- script 脚本只处理顶层 `<script>` / `<script setup>` 内容，不处理 `template` / `style`。
- script 脚本会跳过顶部空行、directive 和 import，插在业务代码前；支持多行 import。
- 两个脚本都支持 `--dry-run` 预览和 `--backup` 写入前生成 `.bak`。
- 两个脚本重复运行不会重复插入已有标记。

## 测试

```bash
npm test
```
