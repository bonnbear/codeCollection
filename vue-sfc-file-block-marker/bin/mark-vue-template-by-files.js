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

function detectTemplateBlocks(lines) {
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const openMatch = line.match(/^\s*<template(?:\s[^>]*)?>/i);

    if (!openMatch) {
      index++;
      continue;
    }

    const openLine = index + 1;
    let closeIndex = index + 1;

    while (closeIndex < lines.length) {
      if (/^\s*<\/template\s*>/i.test(lines[closeIndex])) {
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
      type: "template",
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

function hasDataMark(line) {
  return /\bdata-mark-\d+\b/.test(line);
}

function isUnsafeTemplateLine(line) {
  const trimmed = line.trim();

  if (!trimmed) return true;
  if (trimmed.startsWith("<!--")) return true;
  if (/^<\/[\w:-]+/.test(trimmed)) return true;
  if (/^<!DOCTYPE/i.test(trimmed)) return true;
  if (/^<\?xml/i.test(trimmed)) return true;
  if (hasDataMark(line)) return true;

  return false;
}

function insertDataMarkIntoTemplateLine(line) {
  if (isUnsafeTemplateLine(line)) {
    return {
      changed: false,
      line,
    };
  }

  const match = line.match(/<([A-Za-z][\w:-]*)(\s|\/>|>)/);

  if (!match) {
    return {
      changed: false,
      line,
    };
  }

  const attr = `data-mark-${createRandomId()}`;
  const tagStartIndex = match.index;
  const separator = match[2];
  const insertIndex = tagStartIndex + match[0].indexOf(separator);
  const nextLine =
    line.slice(0, insertIndex) + ` ${attr}` + line.slice(insertIndex);

  return {
    changed: true,
    line: nextLine,
  };
}

function processTemplateBlock(lines, block) {
  let inserted = 0;

  for (
    let lineNo = block.contentStartLine;
    lineNo <= block.contentEndLine;
    lineNo++
  ) {
    const lineIndex = lineNo - 1;
    const result = insertDataMarkIntoTemplateLine(lines[lineIndex]);

    if (result.changed) {
      lines[lineIndex] = result.line;
      inserted++;
    }
  }

  return inserted;
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
  const templateBlocks = detectTemplateBlocks(lines);

  if (!templateBlocks.length) {
    console.log(`[skip] ${filePath} 没有 template 块`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  let totalInserted = 0;

  for (const block of templateBlocks) {
    totalInserted += processTemplateBlock(lines, block);
  }

  if (totalInserted === 0) {
    console.log(`[skip] ${filePath} 没有可插入标签或已经插过`);
    return {
      changed: false,
      inserted: 0,
    };
  }

  const nextContent = lines.join(newline);

  if (options.dryRun) {
    console.log(`[dry-run] ${filePath} 将插入 ${totalInserted} 个 data-mark`);
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
  console.log(`[ok] ${filePath} 插入 ${totalInserted} 个 data-mark`);

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
  console.log(`- 插入 data-mark 数：${insertedCount}`);

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
  detectTemplateBlocks,
  getVueFileListFromInput,
  insertDataMarkIntoTemplateLine,
  processTemplateBlock,
  processVueFile,
};
