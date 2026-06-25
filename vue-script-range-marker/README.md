# vue-script-range-marker

给 Vue SFC 的 JavaScript `<script>` / `<script setup>` 块插入 `void` 标记，跳过 `template`、`style`、TS/TSX、外链 `src` script，以及对象配置块内部。

## 用法

```bash
node bin/mark-vue-script-ranges.js ranges.json --dry-run
node bin/mark-vue-script-ranges.js ranges.json --backup
```

`ranges.json` 支持两种输入：

```json
["src/App.vue", "src/Test.vue"]
```

```json
{
  "src/App.vue": [[1, 10]],
  "src/Test.vue": true
}
```

调试：

```bash
DEBUG_MARK=1 node bin/mark-vue-script-ranges.js ranges.json --dry-run
```

## 测试

```bash
npm test
```
