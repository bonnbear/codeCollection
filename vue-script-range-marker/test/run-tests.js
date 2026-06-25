"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const bin = path.join(root, "bin", "mark-vue-script-ranges.js");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vue-script-marker-"));

function writeFile(rel, content) {
  const target = path.join(tmpRoot, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return target;
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: tmpRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) }
  });
  if (options.expectFailure) return result;
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result;
}

const basicVue = writeFile(
  "Basic.vue",
  `<template>
  <div>{{ count }}</div>
</template>
<script setup>
const count = 1;

function inc() {
  return count + 1;
}

const asyncWork = async () => {
  return Promise.resolve(count);
};

const config = {
  inner: () => {
    return 1;
  }
};
</script>
<style>
.demo { color: red; }
</style>
`
);

const tsVue = writeFile(
  "Typed.vue",
  `<script setup lang="ts">
const count: number = 1;
</script>
`
);

const srcVue = writeFile(
  "External.vue",
  `<script src="./external.js"></script>
`
);

const multiVue = writeFile(
  "Multi.vue",
  `<script>
export default async () => {
  return 1;
}
</script>
<script setup>
let name =
  "demo";
this.load = () => {
  return name;
};
</script>
`
);

writeFile("ranges.json", JSON.stringify([basicVue, tsVue, srcVue, multiVue], null, 2));

const dryRun = run(["ranges.json", "--dry-run"]);
assert.match(dryRun.stdout, /Basic\.vue/);
assert.match(dryRun.stdout, /Multi\.vue/);
assert.match(dryRun.stderr, /Typed\.vue/);
assert.match(dryRun.stderr, /External\.vue/);
assert.doesNotMatch(fs.readFileSync(basicVue, "utf8"), /\|script:\d+-\d+\|random:\d+/);

run(["ranges.json", "--backup"]);

const basicOut = fs.readFileSync(basicVue, "utf8");
const multiOut = fs.readFileSync(multiVue, "utf8");

assert.match(basicOut, /void "Basic\.vue\|script:\d+-\d+\|random:\d+";/);
assert.match(multiOut, /void "Multi\.vue\|script:\d+-\d+\|random:\d+";/);
assert.ok(fs.existsSync(`${basicVue}.bak`), "backup was not created");
assert.doesNotMatch(fs.readFileSync(tsVue, "utf8"), /\|script:\d+-\d+\|random:\d+/);
assert.doesNotMatch(fs.readFileSync(srcVue, "utf8"), /\|script:\d+-\d+\|random:\d+/);
assert.strictEqual((basicOut.match(/inner: \(\) =>/g) || []).length, 1);

const countAfterFirstRun = (basicOut.match(/\|script:\d+-\d+\|random:\d+/g) || []).length;
run(["ranges.json"]);
const basicAfterSecondRun = fs.readFileSync(basicVue, "utf8");
const countAfterSecondRun = (basicAfterSecondRun.match(/\|script:\d+-\d+\|random:\d+/g) || []).length;
assert.strictEqual(countAfterSecondRun, countAfterFirstRun, "second run inserted duplicate markers");

const badJson = writeFile("bad.json", "{ nope");
const failed = run([badJson], { expectFailure: true });
assert.notStrictEqual(failed.status, 0);
assert.match(failed.stderr, /读取或解析 JSON 失败/);

console.log("All tests passed");
