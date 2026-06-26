# vue-style-placeholder-marker

给 `ranges.json` 文件清单里的 Vue SFC 文件的所有 `<style>` 块插入 CSS 无用属性：

```css
placeholder-mark-id:79806068;
```

当前版本只把 `ranges.json` 当作文件清单使用，不再根据里面的行号判断具体命中哪个 style。只要 `.vue` 文件出现在 `ranges.json` 里，就处理它里面的全部 `<style>` 块。

## 用法

```bash
node bin/mark-vue-style-placeholder.js ranges.json --dry-run
node bin/mark-vue-style-placeholder.js ranges.json --backup
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
- 只处理顶层 `<style>` / `<style scoped lang="scss">` 等块。
- 不处理 `template` 和 `script`。
- 对每个普通 CSS/SCSS 规则块最多插入一次。
- 默认插在当前规则块最后一条 CSS 声明后面。
- 已存在 `placeholder-mark-id:` 的规则块不会重复插入。
- `--dry-run` 只预览，不写入文件。
- `--backup` 写入前生成同名 `.bak` 文件。

## 测试

```bash
npm test
```
