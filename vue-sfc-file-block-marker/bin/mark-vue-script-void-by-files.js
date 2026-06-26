#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseCliArgs(argv) {
  const options = {
    inputFile: null,
    dryRun: false,
    backup: false,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--") && !options.inputFile) {
      options.inputFile = arg;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--backup") {
      options.backup = true;
      continue;
    }

    throw new Error(`未知参数：${arg}`);
  }

  if (!options.inputFile) {
    throw new Error("缺少 ranges.json 参数");
  }

  return options;
}

function getVueFileListFromInput(inputData) {
  if (Array.isArray(inputData)) {
    return inputData.filter((item) => typeof item === "string");
  }

  if (inputData && typeof inputData === "object") {
    return Object.keys(inputData);
  }

  return [];
}

function readFileListFromRangesJson(inputFile) {
  const absInputPath = path.resolve(process.cwd(), inputFile);

  if (!fs.existsSync(absInputPath)) {
    throw new Error(`ranges.json 不存在：${absInputPath}`);
  }

  const rawText = fs.readFileSync(absInputPath, "utf8");
  const inputData = JSON.parse(rawText);
  const fileList = getVueFileListFromInput(inputData);

  if (!fileList.length) {
    throw new Error("ranges.json 中没有找到需要处理的 Vue 文件");
  }

  return fileList;
}

function isVueFile(filePath) {
  return filePath.endsWith(".vue");
}

function detectScriptBlocks(lines) {
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const openMatch = line.match(/^\s*<script(?:\s[^>]*)?>/i);

    if (!openMatch) {
      index++;
      continue;
    }

    const openLine = index + 1;
    let closeIndex = index + 1;

    while (closeIndex < lines.length) {
      if (/^\s*<\/script\s*>/i.test(lines[closeIndex])) {
        break;
      }

      closeIndex++;
    }

    if (closeIndex >= lines.length) {
      index++;
      continue;
    }

    const closeLine = closeIndex + 1;

    blocks.push({
      type: "script",
      openLine,
      closeLine,
      contentStartLine: openLine + 1,
      contentEndLine: closeLine - 1,
    });

    index = closeIndex + 1;
  }

  return blocks;
}

function createRandomId() {
  return Math.floor(Math.random() * 90000000) + 10000000;
}

function hasVoidMark(line) {
  return /void\s+["'][^"']*\|script:all\|random:\d+["']\s*;?/.test(line);
}

function scriptBlockHasVoidMark(lines, block) {
  for (
    let lineNo = block.contentStartLine;
    lineNo <= block.contentEndLine;
    lineNo++
  ) {
    if (hasVoidMark(lines[lineNo - 1])) {
      return true;
    }
  }

  return false;
}

function getIndent(line) {
  const match = line.match(/^\s*/);

  return match ? match[0] : "";
}

function isDirectiveLine(line) {
  return /^\s*["'][^"']+["']\s*;?\s*$/.test(line);
}

function isImportStartLine(line) {
  return /^\s*import\b/.test(line);
}

function isSingleLineImport(line) {
  const trimmed = line.trim();

  if (!isImportStartLine(trimmed)) return false;
  if (/^import\s+["'][^"']+["']\s*;?$/.test(trimmed)) return true;

  return /;\s*$/.test(trimmed);
}

function findImportEndLine(lines, block, startLineNo) {
  if (isSingleLineImport(lines[startLineNo - 1])) {
    return startLineNo;
  }

  for (let lineNo = startLineNo + 1; lineNo <= block.contentEndLine; lineNo++) {
    if (/;\s*$/.test(lines[lineNo - 1].trim())) {
      return lineNo;
    }
  }

  return startLineNo;
}

function findInsertIndex(lines, block) {
  let lineNo = block.contentStartLine;

  if (block.contentStartLine > block.contentEndLine) {
    return block.contentStartLine - 1;
  }

  while (lineNo <= block.contentEndLine && lines[lineNo - 1].trim() === "") {
    lineNo++;
  }

  while (lineNo <= block.contentEndLine && isDirectiveLine(lines[lineNo - 1])) {
    lineNo++;
  }

  while (lineNo <= block.contentEndLine && isImportStartLine(lines[lineNo - 1])) {
    lineNo = findImportEndLine(lines, block, lineNo) + 1;
  }

  return lineNo - 1;
}

function createVoidMark(filePath) {
  const fileName = path.basename(filePath);

  return `void "${fileName}|script:all|random:${createRandomId()}";`;
}

function processScriptBlock(lines, block, filePath) {
  if (scriptBlockHasVoidMark(lines, block)) {
    return 0;
  }

  const insertIndex = findInsertIndex(lines, block);
  const refLine = lines[insertIndex] || "";
  const indent = getIndent(refLine);
  const markLine = `${indent}${createVoidMark(filePath)}`;

  lines.splice(insertIndex, 0, markLine);

  return 1;
}

function processVueFile(filePath, options) {
  const absFilePath = path.resolve(process.cwd(), filePath);

  if (!isVueFile(absFilePath)) {
    console.log(`[skip] ${filePath} 不是 .vue 文件`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  if (!fs.existsSync(absFilePath)) {
    console.log(`[skip] ${filePath} 文件不存在`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  const content = fs.readFileSync(absFilePath, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const scriptBlocks = detectScriptBlocks(lines);

  if (!scriptBlocks.length) {
    console.log(`[skip] ${filePath} 没有 script 块`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  let totalInserted = 0;

  for (let index = scriptBlocks.length - 1; index >= 0; index--) {
    totalInserted += processScriptBlock(lines, scriptBlocks[index], absFilePath);
  }

  if (totalInserted === 0) {
    console.log(`[skip] ${filePath} script 已经插过 void 标记`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  const nextContent = lines.join(newline);

  if (options.dryRun) {
    console.log(`[dry-run] ${filePath} 将插入 ${totalInserted} 条 void 标记`);
    return {
      changed: true,
      inserted: totalInserted,
    };
  }

  if (options.backup) {
    fs.writeFileSync(`${absFilePath}.bak`, content, "utf8");
    console.log(`[backup] ${absFilePath}.bak`);
  }

  fs.writeFileSync(absFilePath, nextContent, "utf8");
  console.log(`[ok] ${filePath} 插入 ${totalInserted} 条 void 标记`);

  return {
    changed: true,
    inserted: totalInserted,
  };
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const fileList = readFileListFromRangesJson(options.inputFile);
  let fileCount = 0;
  let changedCount = 0;
  let insertedCount = 0;

  for (const filePath of fileList) {
    fileCount++;

    const result = processVueFile(filePath, options);

    if (result.changed) {
      changedCount++;
      insertedCount += result.inserted;
    }
  }

  console.log("");
  console.log("完成：");
  console.log(`- ranges.json 文件数：${fileCount}`);
  console.log(`- 变更文件数：${changedCount}`);
  console.log(`- 插入 void 数：${insertedCount}`);

  if (options.dryRun) {
    console.log("");
    console.log("当前是 --dry-run 模式，没有写入文件。");
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[error] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  detectScriptBlocks,
  findInsertIndex,
  getVueFileListFromInput,
  processScriptBlock,
  processVueFile,
};
