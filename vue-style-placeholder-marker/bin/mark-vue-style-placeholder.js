#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseCliArgs(argv) {
  const options = {
    inputFile: null,
    dryRun: false,
    backup: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

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

function getVueFileListFromInput(rangeMap) {
  if (Array.isArray(rangeMap)) {
    return rangeMap.filter((item) => typeof item === "string");
  }

  if (rangeMap && typeof rangeMap === "object") {
    return Object.keys(rangeMap);
  }

  return [];
}

function detectStyleBlocks(lines) {
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const openMatch = line.match(/^\s*<style(?:\s[^>]*)?>/i);

    if (!openMatch) {
      index++;
      continue;
    }

    const openLine = index + 1;
    let closeIndex = index + 1;

    while (closeIndex < lines.length) {
      if (/^\s*<\/style\s*>/i.test(lines[closeIndex])) {
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
      type: "style",
      openLine,
      closeLine,
      contentStartLine: openLine + 1,
      contentEndLine: closeLine - 1,
    });

    index = closeIndex + 1;
  }

  return blocks;
}

function hasPlaceholderMark(line) {
  return /\bplaceholder-mark-id\s*:/.test(line);
}

function createPlaceholderDeclaration() {
  const random = Math.floor(Math.random() * 90000000) + 10000000;

  return `placeholder-mark-id:${random};`;
}

function getIndent(line) {
  const match = line.match(/^\s*/);

  return match ? match[0] : "";
}

function isBlankLine(line) {
  return line.trim() === "";
}

function isCssCommentLikeLine(line) {
  const trimmed = line.trim();

  return (
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.endsWith("*/")
  );
}

function isAtRuleLine(line) {
  return /^\s*@/.test(line);
}

function isContainerAtRuleLine(line) {
  return /^\s*@(media|supports|container|layer|keyframes|-webkit-keyframes)\b/i.test(
    line
  );
}

function isCssDeclarationLine(line) {
  const trimmed = line.trim();

  if (!trimmed) return false;
  if (isCssCommentLikeLine(trimmed)) return false;
  if (trimmed.startsWith("@")) return false;
  if (trimmed.endsWith("{")) return false;
  if (trimmed === "}") return false;
  if (!trimmed.includes(":")) return false;
  if (!trimmed.endsWith(";")) return false;

  return true;
}

function countCharOutsideString(line, targetChar) {
  let count = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === targetChar) {
      count++;
    }
  }

  return count;
}

function getCurrentTargetRule(ruleStack) {
  for (let i = ruleStack.length - 1; i >= 0; i--) {
    const rule = ruleStack[i];

    if (rule.isTarget) {
      return rule;
    }
  }

  return null;
}

function insertPlaceholderIntoStyleBlock(lines, styleBlock) {
  const startLine = styleBlock.contentStartLine;
  const endLine = styleBlock.contentEndLine;
  const ruleStack = [];
  const insertTasks = [];

  for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
    const lineIndex = lineNo - 1;
    const line = lines[lineIndex];

    if (isBlankLine(line)) {
      continue;
    }

    if (isCssCommentLikeLine(line)) {
      continue;
    }

    const openBraceCount = countCharOutsideString(line, "{");
    const closeBraceCount = countCharOutsideString(line, "}");

    if (openBraceCount > 0) {
      const isAtRule = isAtRuleLine(line);
      const isContainerAtRule = isContainerAtRuleLine(line);
      const isTarget = !isContainerAtRule;

      ruleStack.push({
        startLine: lineNo,
        isAtRule,
        isContainerAtRule,
        isTarget,
        lastDeclarationLineIndex: null,
        lastDeclarationIndent: null,
        hasInserted: false,
      });
    }

    if (hasPlaceholderMark(line)) {
      const currentRule = getCurrentTargetRule(ruleStack);

      if (currentRule) {
        currentRule.hasInserted = true;
      }

      continue;
    }

    if (isCssDeclarationLine(line)) {
      const currentRule = getCurrentTargetRule(ruleStack);

      if (currentRule) {
        currentRule.lastDeclarationLineIndex = lineIndex;
        currentRule.lastDeclarationIndent = getIndent(line);
      }
    }

    if (closeBraceCount > 0) {
      for (let i = 0; i < closeBraceCount; i++) {
        const finishedRule = ruleStack.pop();

        if (!finishedRule) {
          continue;
        }

        if (!finishedRule.isTarget) {
          continue;
        }

        if (finishedRule.lastDeclarationLineIndex === null) {
          continue;
        }

        if (finishedRule.hasInserted) {
          continue;
        }

        insertTasks.push({
          lineIndex: finishedRule.lastDeclarationLineIndex,
          indent: finishedRule.lastDeclarationIndent || "  ",
          declaration: createPlaceholderDeclaration(),
        });

        finishedRule.hasInserted = true;
      }
    }
  }

  insertTasks.sort((a, b) => b.lineIndex - a.lineIndex);

  for (const task of insertTasks) {

    lines.splice(task.lineIndex + 1, 0, `${task.indent}${task.declaration}`);
  }

  return insertTasks.length;
}

function processVueFile(filePath, options) {
  if (!filePath.endsWith(".vue")) {
    console.log(`[skip] ${filePath} 不是 .vue 文件`);

    return {
      changed: false,
      inserted: 0,
    };
  }

  if (!fs.existsSync(filePath)) {
    console.log(`[skip] ${filePath} 文件不存在`);

    return {
      changed: false,
      inserted: 0,
    };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const styleBlocks = detectStyleBlocks(lines);

  if (!styleBlocks.length) {
    console.log(`[skip] ${filePath} 没有 <style> 块`);

    return {
      changed: false,
      inserted: 0,
    };
  }

  let totalInserted = 0;
  const allStyleBlocks = styleBlocks
    .slice()
    .sort((a, b) => b.contentStartLine - a.contentStartLine);

  for (const styleBlock of allStyleBlocks) {
    const inserted = insertPlaceholderIntoStyleBlock(lines, styleBlock);

    totalInserted += inserted;
  }

  if (totalInserted === 0) {
    console.log(`[skip] ${filePath} style 块已处理或没有可插入位置`);

    return {
      changed: false,
      inserted: 0,
    };
  }

  const nextContent = lines.join(newline);

  if (options.dryRun) {
    console.log(
      `[dry-run] ${filePath} 将插入 ${totalInserted} 条 placeholder-mark-id`
    );

    return {
      changed: true,
      inserted: totalInserted,
    };
  }

  if (options.backup) {
    const backupPath = `${filePath}.bak`;

    fs.writeFileSync(backupPath, content, "utf8");

    console.log(`[backup] ${backupPath}`);
  }

  fs.writeFileSync(filePath, nextContent, "utf8");

  console.log(`[ok] ${filePath} 插入 ${totalInserted} 条 placeholder-mark-id`);

  return {
    changed: true,
    inserted: totalInserted,
  };
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.inputFile);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`ranges.json 不存在：${inputPath}`);
  }

  const rawText = fs.readFileSync(inputPath, "utf8");
  const rangeMap = JSON.parse(rawText);
  const fileList = getVueFileListFromInput(rangeMap);

  if (!fileList.length) {
    throw new Error("ranges.json 中没有找到需要处理的 Vue 文件");
  }

  let fileCount = 0;
  let changedCount = 0;
  let insertedCount = 0;

  for (const filePath of fileList) {
    fileCount++;

    const absFilePath = path.resolve(process.cwd(), filePath);
    const result = processVueFile(absFilePath, options);

    if (result.changed) {
      changedCount++;
      insertedCount += result.inserted;
    }
  }

  console.log("");
  console.log("完成：");
  console.log(`- 扫描文件数：${fileCount}`);
  console.log(`- 变更文件数：${changedCount}`);
  console.log(`- 插入标记数：${insertedCount}`);

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
  countCharOutsideString,
  detectStyleBlocks,
  getVueFileListFromInput,
  insertPlaceholderIntoStyleBlock,
  isCssDeclarationLine,
  processVueFile,
};
