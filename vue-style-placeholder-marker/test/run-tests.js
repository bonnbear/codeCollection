const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  countCharOutsideString,
  detectStyleBlocks,
  insertPlaceholderIntoStyleBlock,
  isCssDeclarationLine,
} = require("../bin/mark-vue-style-placeholder");

const rootDir = path.resolve(__dirname, "..");
const binPath = path.join(rootDir, "bin", "mark-vue-style-placeholder.js");

function normalizeMarks(text) {
  return text.replace(/placeholder-mark-id:\d{8};/g, "placeholder-mark-id:MARK;");
}

function writeFixture(tmpDir, relativePath, content) {
  const filePath = path.join(tmpDir, relativePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");

  return filePath;
}

function runCli(cwd, args) {
  return execFileSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function testStyleBlockDetection() {
  const lines = [
    "<template>",
    "  <div></div>",
    "</template>",
    "<style scoped lang=\"scss\">",
    ".box {",
    "  color: red;",
    "}",
    "</style>",
  ];

  assert.deepStrictEqual(detectStyleBlocks(lines), [
    {
      type: "style",
      openLine: 4,
      closeLine: 8,
      contentStartLine: 5,
      contentEndLine: 7,
    },
  ]);
}

function testCssHelpers() {
  assert.strictEqual(countCharOutsideString('content: "{";', "{"), 0);
  assert.strictEqual(countCharOutsideString(".box {", "{"), 1);
  assert.strictEqual(isCssDeclarationLine("  color: red;"), true);
  assert.strictEqual(isCssDeclarationLine("  .box:hover {"), false);
  assert.strictEqual(isCssDeclarationLine("  @media screen {"), false);
}

function testInsertionIntoNestedScss() {
  const text = `<style lang="scss">
.parent {
  color: red;

  .child {
    color: blue;
  }
}
</style>`;
  const lines = text.split("\n");
  const blocks = detectStyleBlocks(lines);
  const inserted = insertPlaceholderIntoStyleBlock(lines, blocks[0]);

  assert.strictEqual(inserted, 2);
  assert.strictEqual(
    normalizeMarks(lines.join("\n")),
    `<style lang="scss">
.parent {
  color: red;
  placeholder-mark-id:MARK;

  .child {
    color: blue;
    placeholder-mark-id:MARK;
  }
}
</style>`
  );
}

function testCliDryRunDoesNotWrite() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vue-style-marker-"));
  const vueText = `<template>
  <main class="box">hello</main>
</template>

<script>
export default {};
</script>

<style scoped>
.box {
  color: red;
}
</style>

<style lang="scss">
@media screen {
  .card {
    padding: 12px;
  }
}
</style>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(
    tmpDir,
    "ranges.json",
    JSON.stringify({ "src/App.vue": [[1, 2]] }, null, 2)
  );

  const output = runCli(tmpDir, ["ranges.json", "--dry-run"]);

  assert.match(output, /\[dry-run\].*将插入 2 条 placeholder-mark-id/);
  assert.match(output, /扫描文件数：1/);
  assert.match(output, /变更文件数：1/);
  assert.match(output, /插入标记数：2/);
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, "src/App.vue"), "utf8"), vueText);
}

function testCliWriteBackupAndIdempotency() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vue-style-marker-"));
  const vueText = `<template>
  <main class="box">hello</main>
</template>
<style>
.box {
  color: red;
}
</style>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify(["src/App.vue"], null, 2));

  const firstOutput = runCli(tmpDir, ["ranges.json", "--backup"]);
  const filePath = path.join(tmpDir, "src/App.vue");
  const nextText = fs.readFileSync(filePath, "utf8");

  assert.match(firstOutput, /\[backup\]/);
  assert.match(firstOutput, /\[ok\].*插入 1 条 placeholder-mark-id/);
  assert.strictEqual(fs.readFileSync(`${filePath}.bak`, "utf8"), vueText);
  assert.match(nextText, /placeholder-mark-id:\d{8};/);

  const secondOutput = runCli(tmpDir, ["ranges.json"]);

  assert.match(secondOutput, /style 块已处理或没有可插入位置/);
  assert.strictEqual(fs.readFileSync(filePath, "utf8"), nextText);
}

function testSkipsTemplateAndScript() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vue-style-marker-"));
  const vueText = `<template>
  <div style="color: red">style word only</div>
</template>
<script>
const css = ".box { color: red; }";
</script>
<style>
.real {
  display: block;
}
</style>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify({ "src/App.vue": true }, null, 2));

  runCli(tmpDir, ["ranges.json"]);

  const nextText = normalizeMarks(fs.readFileSync(path.join(tmpDir, "src/App.vue"), "utf8"));

  assert.strictEqual(
    nextText,
    `<template>
  <div style="color: red">style word only</div>
</template>
<script>
const css = ".box { color: red; }";
</script>
<style>
.real {
  display: block;
  placeholder-mark-id:MARK;
}
</style>
`
  );
}

testStyleBlockDetection();
testCssHelpers();
testInsertionIntoNestedScss();
testCliDryRunDoesNotWrite();
testCliWriteBackupAndIdempotency();
testSkipsTemplateAndScript();

console.log("All tests passed");
