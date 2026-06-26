const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const templateMarker = require("../bin/mark-vue-template-by-files");
const scriptMarker = require("../bin/mark-vue-script-void-by-files");

const rootDir = path.resolve(__dirname, "..");
const templateBin = path.join(rootDir, "bin", "mark-vue-template-by-files.js");
const scriptBin = path.join(rootDir, "bin", "mark-vue-script-void-by-files.js");

function normalizeTemplateMarks(text) {
  return text.replace(/data-mark-\d{8}/g, "data-mark-MARK");
}

function normalizeScriptMarks(text) {
  return text.replace(
    /void "([^"]+)\|script:all\|random:\d{8}";/g,
    'void "$1|script:all|random:MARK";'
  );
}

function writeFixture(tmpDir, relativePath, content) {
  const filePath = path.join(tmpDir, relativePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");

  return filePath;
}

function runCli(binPath, cwd, args) {
  return execFileSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vue-sfc-file-block-marker-"));
}

function testSharedInputParsing() {
  assert.deepStrictEqual(
    templateMarker.getVueFileListFromInput({
      "src/App.vue": [[75, 479]],
      "src/Home.vue": "10-80",
    }),
    ["src/App.vue", "src/Home.vue"]
  );
  assert.deepStrictEqual(scriptMarker.getVueFileListFromInput(["src/App.vue"]), [
    "src/App.vue",
  ]);
}

function testTemplateDryRunDoesNotWriteAndIgnoresRanges() {
  const tmpDir = makeTmpDir();
  const vueText = `<template>
  <div class="box">
    <span>{{ name }}</span>
    <!-- <p>skip</p> -->
  </div>
</template>
<script>
export default {};
</script>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(
    tmpDir,
    "ranges.json",
    JSON.stringify({ "src/App.vue": [[999, 1000]] }, null, 2)
  );

  const output = runCli(templateBin, tmpDir, ["ranges.json", "--dry-run"]);

  assert.match(output, /\[dry-run\].*src\/App\.vue 将插入 2 个 data-mark/);
  assert.match(output, /ranges\.json 文件数：1/);
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, "src/App.vue"), "utf8"), vueText);
}

function testTemplateWriteBackupAndIdempotency() {
  const tmpDir = makeTmpDir();
  const vueText = `<template>
  <main>
    <img src="/logo.png" />
  </main>
</template>
`;

  const filePath = writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify(["src/App.vue"], null, 2));

  const firstOutput = runCli(templateBin, tmpDir, ["ranges.json", "--backup"]);
  const nextText = fs.readFileSync(filePath, "utf8");

  assert.match(firstOutput, /\[backup\]/);
  assert.match(firstOutput, /\[ok\].*插入 2 个 data-mark/);
  assert.strictEqual(fs.readFileSync(`${filePath}.bak`, "utf8"), vueText);
  assert.match(nextText, /<main data-mark-\d{8}>/);
  assert.match(nextText, /<img data-mark-\d{8} src="\/logo\.png" \/>/);

  const secondOutput = runCli(templateBin, tmpDir, ["ranges.json"]);

  assert.match(secondOutput, /没有可插入标签或已经插过/);
  assert.strictEqual(fs.readFileSync(filePath, "utf8"), nextText);
}

function testTemplateSkipsScriptAndStyle() {
  const tmpDir = makeTmpDir();
  const vueText = `<template>
  <div>real</div>
</template>
<script>
const html = "<section></section>";
</script>
<style>
.box::before { content: "<span>"; }
</style>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify({ "src/App.vue": true }, null, 2));

  runCli(templateBin, tmpDir, ["ranges.json"]);

  const nextText = normalizeTemplateMarks(
    fs.readFileSync(path.join(tmpDir, "src/App.vue"), "utf8")
  );

  assert.strictEqual(
    nextText,
    `<template>
  <div data-mark-MARK>real</div>
</template>
<script>
const html = "<section></section>";
</script>
<style>
.box::before { content: "<span>"; }
</style>
`
  );
}

function testScriptDryRunDoesNotWriteAndIgnoresRanges() {
  const tmpDir = makeTmpDir();
  const vueText = `<template>
  <div>{{ name }}</div>
</template>
<script>
import {
  one,
  two,
} from "./api";
export default {};
</script>
`;

  writeFixture(tmpDir, "src/BusinessObjective.vue", vueText);
  writeFixture(
    tmpDir,
    "ranges.json",
    JSON.stringify({ "src/BusinessObjective.vue": ["10-80"] }, null, 2)
  );

  const output = runCli(scriptBin, tmpDir, ["ranges.json", "--dry-run"]);

  assert.match(output, /\[dry-run\].*BusinessObjective\.vue 将插入 1 条 void 标记/);
  assert.strictEqual(
    fs.readFileSync(path.join(tmpDir, "src/BusinessObjective.vue"), "utf8"),
    vueText
  );
}

function testScriptWriteBackupImportPositionAndIdempotency() {
  const tmpDir = makeTmpDir();
  const vueText = `<script>
"use strict";
import api from "./api";
import {
  one,
  two,
} from "./more";
export default {};
</script>
`;

  const filePath = writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify(["src/App.vue"], null, 2));

  const firstOutput = runCli(scriptBin, tmpDir, ["ranges.json", "--backup"]);
  const nextText = normalizeScriptMarks(fs.readFileSync(filePath, "utf8"));

  assert.match(firstOutput, /\[backup\]/);
  assert.match(firstOutput, /\[ok\].*插入 1 条 void 标记/);
  assert.strictEqual(fs.readFileSync(`${filePath}.bak`, "utf8"), vueText);
  assert.strictEqual(
    nextText,
    `<script>
"use strict";
import api from "./api";
import {
  one,
  two,
} from "./more";
export default {};
void "App.vue|script:all|random:MARK";
</script>
`
  );

  const secondOutput = runCli(scriptBin, tmpDir, ["ranges.json"]);

  assert.match(secondOutput, /script 已经插过 void 标记/);
  assert.strictEqual(
    normalizeScriptMarks(fs.readFileSync(filePath, "utf8")),
    nextText
  );
}

function testScriptSetupAndMultipleBlocks() {
  const tmpDir = makeTmpDir();
  const vueText = `<script>
export default {};
</script>
<script setup>
const count = 1;
</script>
`;

  writeFixture(tmpDir, "src/App.vue", vueText);
  writeFixture(tmpDir, "ranges.json", JSON.stringify({ "src/App.vue": [[1, 1]] }));

  const output = runCli(scriptBin, tmpDir, ["ranges.json"]);
  const nextText = normalizeScriptMarks(
    fs.readFileSync(path.join(tmpDir, "src/App.vue"), "utf8")
  );

  assert.match(output, /插入 2 条 void 标记/);
  assert.strictEqual(
    nextText,
    `<script>
export default {};
void "App.vue|script:all|random:MARK";
</script>
<script setup>
const count = 1;
void "App.vue|script:all|random:MARK";
</script>
`
  );
}

function testScriptInsertsMultipleSafeStatementMarks() {
  const tmpDir = makeTmpDir();
  const vueText = `<script setup>
import api from "./api";

const count = 1;

function inc() {
  return count + 1;
}

const config = {
  inner: () => {
    return api.load();
  },
};

export default config;
</script>
`;

  writeFixture(tmpDir, "src/BusinessObjective.vue", vueText);
  writeFixture(
    tmpDir,
    "ranges.json",
    JSON.stringify({ "src/BusinessObjective.vue": [[75, 479]] }, null, 2)
  );

  const output = runCli(scriptBin, tmpDir, ["ranges.json"]);
  const nextText = normalizeScriptMarks(
    fs.readFileSync(path.join(tmpDir, "src/BusinessObjective.vue"), "utf8")
  );

  assert.match(output, /插入 6 条 void 标记/);
  assert.strictEqual(
    nextText,
    `<script setup>
import api from "./api";

const count = 1;
void "BusinessObjective.vue|script:all|random:MARK";

function inc() {
  return count + 1;
  void "BusinessObjective.vue|script:all|random:MARK";
}
void "BusinessObjective.vue|script:all|random:MARK";

const config = {
  inner: () => {
    return api.load();
    void "BusinessObjective.vue|script:all|random:MARK";
  },
};
void "BusinessObjective.vue|script:all|random:MARK";

export default config;
void "BusinessObjective.vue|script:all|random:MARK";
</script>
`
  );
}

testSharedInputParsing();
testTemplateDryRunDoesNotWriteAndIgnoresRanges();
testTemplateWriteBackupAndIdempotency();
testTemplateSkipsScriptAndStyle();
testScriptDryRunDoesNotWriteAndIgnoresRanges();
testScriptWriteBackupImportPositionAndIdempotency();
testScriptSetupAndMultipleBlocks();
testScriptInsertsMultipleSafeStatementMarks();

console.log("All tests passed");
