#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEBUG = process.env.DEBUG_MARK === "1";
const ARROW_LOOKAHEAD_LINES = 30;

const options = parseCliArgs(process.argv.slice(2));

if (!options.inputFile) {
  printUsage();
  process.exit(1);
}

let inputData;

try {
  inputData = JSON.parse(fs.readFileSync(options.inputFile, "utf8"));
} catch (error) {
  console.error(`[错误] 读取或解析 JSON 失败: ${options.inputFile}`);
  console.error(error.message);
  process.exit(1);
}

const filePaths = normalizeInputFiles(inputData);

if (!filePaths.length) {
  console.error("[错误] 输入 JSON 中没有可处理的 vue 文件路径。");
  console.error("支持对象格式，例如：");
  console.error(JSON.stringify({ "src/App.vue": [[1, 10]] }, null, 2));
  console.error("也支持数组格式，例如：");
  console.error(JSON.stringify(["src/App.vue"], null, 2));
  process.exit(1);
}

for (const filePath of filePaths) {
  processVueFile(filePath, options);
}

function printUsage() {
  console.error("用法: node mark-vue-script-ranges.js ranges.json");
  console.error("");
  console.error("input.json 支持：");
  console.error('  1. 数组: ["src/App.vue", "src/Test.vue"]');
  console.error('  2. 对象: {"src/App.vue": [[1, 10]], "src/Test.vue": true}');
  console.error("");
  console.error("可选参数:");
  console.error("  --dry-run    只预览，不写入文件");
  console.error("  --backup     写入前生成 .bak 备份");
}

function parseCliArgs(args) {
  const options = {
    inputFile: null,
    dryRun: false,
    backup: false
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--backup") {
      options.backup = true;
      continue;
    }

    if (!options.inputFile) {
      options.inputFile = arg;
      continue;
    }

    console.warn(`[警告] 忽略未知参数: ${arg}`);
  }

  return options;
}

function normalizeInputFiles(inputData) {
  if (Array.isArray(inputData)) {
    return inputData
      .map(item => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.file ?? item.filePath ?? item.path ?? null;
        }
        return null;
      })
      .filter(Boolean)
      .map(String);
  }

  if (inputData && typeof inputData === "object") {
    return Object.keys(inputData).map(String);
  }

  return [];
}

function processVueFile(filePath, options) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[跳过] 文件不存在: ${filePath}`);
    return;
  }

  if (!filePath.endsWith(".vue")) {
    console.warn(`[跳过] 不是 vue 文件: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const blocks = detectVueBlocks(lines);

  if (DEBUG) {
    console.log(`\n[DEBUG] ${filePath} 识别到的 Vue 根块:`);
    for (const block of blocks) console.log("[DEBUG]", block);
  }

  const scriptBlocks = blocks.filter(block => {
    return block.type === "script" && isSupportedScriptBlock(block);
  });

  if (!scriptBlocks.length) {
    console.warn(`[跳过] 没有可处理的 script 块: ${filePath}`);
    return;
  }

  const fileName = makeSafePayloadFileName(path.basename(filePath));
  const allActions = [];

  for (const block of scriptBlocks) {
    allActions.push(...collectScriptActions(lines, block, fileName));
  }

  const insertActions = allActions
    .filter(action => action.type === "insertAfter")
    .sort((a, b) => b.afterLineNo - a.afterLineNo);
  const appliedActions = [];

  for (const action of insertActions) {
    const insertIndex = action.afterLineNo;
    if (insertIndex < 0 || insertIndex > lines.length) continue;
    lines.splice(insertIndex, 0, action.text);
    appliedActions.push({
      kind: action.kind,
      lineNo: action.afterLineNo,
      result: action.text.trim()
    });
  }

  if (appliedActions.length || options.dryRun) {
    printReport(filePath, appliedActions, lines, options.dryRun);
  }

  if (!appliedActions.length) return;

  if (options.dryRun) {
    console.log(`\n[预览] ${filePath}，插入 ${appliedActions.length} 个 void，未写入`);
    return;
  }

  if (options.backup) {
    const backupPath = `${filePath}.bak`;
    fs.writeFileSync(backupPath, content, "utf8");
    console.log(`[备份] ${backupPath}`);
  }

  fs.writeFileSync(filePath, lines.join(newline), "utf8");
  console.log(`[完成] ${filePath}，插入 ${appliedActions.length} 个 void`);
}

function printReport(filePath, appliedActions, lines, dryRun) {
  console.log("\n" + "=".repeat(78));
  console.log("SCRIPT 标记插入报告 - " + filePath);
  console.log("=".repeat(78));
  console.log(`\n  变量声明后插入数: ${appliedActions.filter(item => item.kind === "var").length}`);
  console.log(`  函数块第一行插入数: ${appliedActions.filter(item => item.kind === "function-body").length}`);
  console.log("  范围: 只处理 <script> / <script setup>，不处理 template/style");
  console.log("  跳过: TS/TSX、src 外链 script、对象配置块内部、单行函数体、已存在标记位置");

  if (appliedActions.length) {
    console.log(`\n${"-".repeat(72)}`);
    console.log(`【SCRIPT 修改】 (${appliedActions.length} 个 void 标记)`);
    console.log(`${"-".repeat(72)}`);

    for (const action of appliedActions.sort((a, b) => a.lineNo - b.lineNo)) {
      const kindText = action.kind === "var" ? "变量声明后" : "函数块第一行";
      console.log(`  L${String(action.lineNo).padStart(3)} ${kindText} -> ${action.result}`);
    }
  } else {
    console.log("\n没有找到可插入位置，未修改 script。");
  }

  if (dryRun) {
    console.log(`\n${"=".repeat(78)}`);
    console.log("预览处理后的文件:");
    console.log("=".repeat(78));
    console.log(lines.join("\n"));
  }
}

function collectScriptActions(lines, block, fileName) {
  const actions = [];
  const usedInsertLine = new Set();
  let lineNo = block.startLine;

  while (lineNo <= block.endLine) {
    const line = lines[lineNo - 1] || "";
    const trimmed = stripLineCommentForScript(line).trim();

    if (!trimmed || alreadyMarked(line)) {
      lineNo++;
      continue;
    }

    const insideObjectDefinitionBlock = isLikelyInsideObjectDefinitionBlock(lines, block, lineNo);

    if (DEBUG) {
      console.log(`[DEBUG] L${lineNo}`, JSON.stringify(trimmed), {
        insideObjectDefinitionBlock,
        isVar: isVariableDeclarationStart(trimmed),
        functionOpenLineNo: !insideObjectDefinitionBlock
          ? detectFunctionBodyOpenLine(lines, block, lineNo)
          : null
      });
    }

    if (!insideObjectDefinitionBlock && isVariableDeclarationStart(trimmed)) {
      const endLineNo = findStatementEndLine(lines, block, lineNo);
      if (endLineNo != null) {
        const statementText = lines
          .slice(lineNo - 1, endLineNo)
          .map(item => stripLineCommentForScript(item))
          .join("\n");

        if (!isObjectLikeVariableDeclaration(statementText)) {
          addInsertAction({
            actions,
            usedInsertLine,
            lines,
            block,
            fileName,
            afterLineNo: endLineNo,
            kind: "var"
          });
        }
      }
    }

    if (!insideObjectDefinitionBlock) {
      const functionOpenLineNo = detectFunctionBodyOpenLine(lines, block, lineNo);
      if (functionOpenLineNo != null) {
        addInsertAction({
          actions,
          usedInsertLine,
          lines,
          block,
          fileName,
          afterLineNo: functionOpenLineNo,
          kind: "function-body"
        });
      }
    }

    lineNo++;
  }

  return actions;
}

function addInsertAction({ actions, usedInsertLine, lines, block, fileName, afterLineNo, kind }) {
  if (afterLineNo == null) return;
  if (afterLineNo < block.startLine || afterLineNo > block.endLine) return;

  const key = `${kind}:${afterLineNo}`;
  if (usedInsertLine.has(key)) return;

  if (hasExistingScriptMarkImmediatelyAfter(lines, afterLineNo, block.endLine)) {
    if (DEBUG) console.log(`[DEBUG] L${afterLineNo} 后面第一行有效代码已经是标记，跳过`);
    return;
  }

  const anchorLine = lines[afterLineNo - 1] || "";
  if (kind === "function-body" && isSingleLineFunctionBody(anchorLine)) {
    if (DEBUG) console.log(`[DEBUG] L${afterLineNo} 单行函数体，跳过`);
    return;
  }

  const indent = getInsertionIndentForAction(lines, block, afterLineNo, kind);
  const scriptText = `${block.startLine}-${block.endLine}`;
  const random = randomNumber8();
  const payload = `${fileName}|script:${scriptText}|random:${random}`;
  const value = JSON.stringify(payload);

  actions.push({
    type: "insertAfter",
    afterLineNo,
    text: `${indent}void ${value};`,
    payload,
    kind
  });
  usedInsertLine.add(key);
}

function hasExistingScriptMarkImmediatelyAfter(lines, afterLineNo, endLineNo) {
  for (let lineNo = afterLineNo + 1; lineNo <= endLineNo; lineNo++) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (alreadyMarked(line)) return true;
    return false;
  }
  return false;
}

function isVariableDeclarationStart(trimmed) {
  return /^(?:export\s+)?(?:const|let|var)\b/.test(trimmed);
}

function isFunctionDeclarationStart(trimmed) {
  return /^(?:export\s+default\s+|export\s+)?(?:async\s+)?function(?:\s+|\*)/.test(trimmed);
}

function isVariableFunctionExpressionStart(trimmed) {
  return /^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*(?:async\s+)?function(?:\s+|\*)?/.test(trimmed);
}

function isObjectLikeVariableDeclaration(statementText) {
  const text = String(statementText).trim();
  if (!/^(?:export\s+)?(?:const|let|var)\b/.test(text)) return false;
  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*\{/.test(text)) return true;
  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*\[[\s\S]*\{/.test(text)) return true;
  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*\(\s*\{/.test(text)) return true;
  return false;
}

function findStatementEndLine(lines, block, startLineNo) {
  const state = createMiniScanState();

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1] || "";
    scanLineMini(line, state);
    const code = stripLineCommentForScript(line).trim();
    if (!code) continue;
    if (state.inBlockComment || state.inString || state.inTemplateString) continue;
    if (state.parenDepth !== 0 || state.bracketDepth !== 0 || state.braceDepth !== 0) continue;
    if (/;\s*$/.test(code)) return lineNo;

    const next = findNextSignificantScriptLine(lines, block, lineNo + 1);
    if (!next) return lineNo;
    if (!isLikelyContinuationLine(code, stripLineCommentForScript(next.text).trim())) return lineNo;
  }

  return null;
}

function isLikelyContinuationLine(currentText, nextText) {
  if (!nextText) return false;
  if (/[,+*/%&|^?:=<>!\-.]\s*$/.test(currentText)) return true;
  if (/^[)\]}.,?:]/.test(nextText)) return true;
  if (/^\./.test(nextText)) return true;
  return false;
}

function detectFunctionBodyOpenLine(lines, block, lineNo) {
  const line = lines[lineNo - 1] || "";
  const code = stripLineCommentForScript(line).trim();
  if (!code || isOnlyCommentLine(code)) return null;
  if (/^(if|for|while|switch|catch|with|else|do|try|finally)\b/.test(code)) return null;
  if (isLikelyInsideObjectDefinitionBlock(lines, block, lineNo)) return null;
  if (isFunctionDeclarationStart(code)) return findFunctionOpenBraceLine(lines, block, lineNo);
  if (isVariableFunctionExpressionStart(code)) return findFunctionOpenBraceLine(lines, block, lineNo);
  if (isExportDefaultArrowFunctionStart(lines, block, lineNo)) return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  if (isTopLevelVariableArrowFunctionStart(lines, block, lineNo)) return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  if (isAssignmentArrowFunctionStart(lines, block, lineNo)) return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  return null;
}

function isExportDefaultArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1] || "").trim();
  if (!/^export\s+default\b/.test(firstLine)) return false;
  if (/^export\s+default\s+(?:async\s+)?function\b/.test(firstLine)) return false;
  return hasArrowBeforeStatementBoundary(lines, block, lineNo);
}

function isTopLevelVariableArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1] || "").trim();
  if (!/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=/.test(firstLine)) return false;
  return hasArrowBeforeStatementBoundary(lines, block, lineNo);
}

function isAssignmentArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1] || "").trim();
  if (/^(?:export\s+)?(?:const|let|var)\b/.test(firstLine)) return false;
  if (/^(return|throw|if|for|while|switch|catch|with|else|do|try|finally)\b/.test(firstLine)) return false;
  if (!/^(?:this\.)?[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*=/.test(firstLine)) return false;
  return hasArrowBeforeStatementBoundary(lines, block, lineNo);
}

function hasArrowBeforeStatementBoundary(lines, block, lineNo) {
  const maxLookAheadLine = Math.min(block.endLine, lineNo + ARROW_LOOKAHEAD_LINES);
  for (let currentLineNo = lineNo; currentLineNo <= maxLookAheadLine; currentLineNo++) {
    const text = stripLineCommentForScript(lines[currentLineNo - 1] || "").trim();
    if (!text) continue;
    if (/=>/.test(text)) return true;
    if (/;\s*$/.test(text)) return false;
    if (currentLineNo !== lineNo && /^(?:export\s+)?(?:const|let|var|function|class)\b/.test(text)) return false;
  }
  return false;
}

function findArrowFunctionOpenBraceLine(lines, block, startLineNo) {
  const state = createMiniScanState();
  let sawArrow = false;
  let arrowLineNo = null;
  let arrowColumn = -1;

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1] || "";

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      const scan = scanScriptCharState(ch, next, state);
      if (scan === "skip-next") {
        i++;
        continue;
      }
      if (scan === "break-line" || scan === "continue") {
        if (scan === "break-line") break;
        continue;
      }

      if (ch === "=" && next === ">") {
        sawArrow = true;
        arrowLineNo = lineNo;
        arrowColumn = i;
        i++;
        continue;
      }

      if (sawArrow && ch === "{") {
        const beforeBrace = stripLineCommentForScript(line.slice(0, i)).trim();
        if (/\(\s*$/.test(beforeBrace)) return null;

        if (lineNo === arrowLineNo) {
          const betweenArrowAndBrace = line.slice(arrowColumn + 2, i).trim();
          if (betweenArrowAndBrace !== "") return null;
        } else {
          const prev = findPrevSignificantScriptLine(lines, block, lineNo - 1);
          if (!prev || prev.lineNo !== arrowLineNo) return null;
        }

        return lineNo;
      }
    }

    const trimmed = stripLineCommentForScript(line).trim();
    if (sawArrow && /;\s*$/.test(trimmed)) return null;
    if (!sawArrow && /;\s*$/.test(trimmed)) return null;
  }

  return null;
}

function findFunctionOpenBraceLine(lines, block, startLineNo) {
  const state = createMiniScanState();
  let sawFunctionKeyword = false;

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1] || "";
    const code = stripLineCommentForScript(line);
    if (/\bfunction\b/.test(code)) sawFunctionKeyword = true;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      const scan = scanScriptCharState(ch, next, state);
      if (scan === "skip-next") {
        i++;
        continue;
      }
      if (scan === "break-line" || scan === "continue") {
        if (scan === "break-line") break;
        continue;
      }
      if (ch === "{" && sawFunctionKeyword) return lineNo;
    }

    const trimmed = stripLineCommentForScript(line).trim();
    if (/;\s*$/.test(trimmed) && !/[{]\s*$/.test(trimmed)) return null;
  }

  return null;
}

function isLikelyInsideObjectDefinitionBlock(lines, block, lineNo) {
  return createObjectContextStack(lines, block, lineNo).some(item => item.kind === "object");
}

function createObjectContextStack(lines, block, lineNo) {
  const state = createMiniScanState();
  const stack = [];

  for (let currentLineNo = block.startLine; currentLineNo < lineNo; currentLineNo++) {
    const line = lines[currentLineNo - 1] || "";

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      const scan = scanScriptCharState(ch, next, state);
      if (scan === "skip-next") {
        i++;
        continue;
      }
      if (scan === "break-line" || scan === "continue") {
        if (scan === "break-line") break;
        continue;
      }

      if (ch === "{") {
        const before = stripLineCommentForScript(line.slice(0, i)).trim();
        stack.push({
          kind: looksLikeObjectOpenBeforeBrace(before) ? "object" : "block",
          lineNo: currentLineNo
        });
        continue;
      }

      if (ch === "}" && stack.length) stack.pop();
    }
  }

  return stack;
}

function looksLikeObjectOpenBeforeBrace(before) {
  if (!before) return false;
  if (/\bfunction\b/.test(before)) return false;
  if (/=>\s*$/.test(before)) return false;
  if (/^(if|for|while|switch|catch|with|else|do|try|finally)\b/.test(before)) return false;
  if (/^class\b/.test(before)) return false;
  if (looksLikeObjectMethodBeforeBrace(before)) return false;
  if (/^export\s+default\s*$/.test(before)) return true;
  if (/^return\s*$/.test(before)) return true;
  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*$/.test(before)) return true;
  if (/^(?:this\.)?[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*=\s*$/.test(before)) return true;
  if (/^[$A-Z_a-z][$\w]*\s*:\s*$/.test(before)) return true;
  if (/\(\s*$/.test(before)) return true;
  if (/[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*\(\s*$/.test(before)) return true;
  if (/[\[,]\s*$/.test(before)) return true;
  if (/,\s*$/.test(before)) return true;
  return false;
}

function looksLikeObjectMethodBeforeBrace(before) {
  if (!before) return false;
  if (/^(if|for|while|switch|catch|with)\b/.test(before)) return false;
  return /^(?:async\s+)?(?:get\s+|set\s+)?\*?\s*[$A-Z_a-z][$\w]*\s*\([^)]*\)\s*$/.test(before);
}

function isSingleLineFunctionBody(line) {
  const code = stripLineCommentForScript(line).trim();
  return /\{.+\}/.test(code);
}

function getInsertionIndentForAction(lines, block, anchorLineNo, kind) {
  const line = lines[anchorLineNo - 1] || "";
  const currentIndent = line.match(/^\s*/)[0];
  if (kind === "function-body") return currentIndent + "  ";
  if (line.trim()) return currentIndent;

  const prev = findPrevIndentLine(lines, block, anchorLineNo - 1);
  if (prev != null) return prev;
  const next = findNextIndentLine(lines, block, anchorLineNo + 1);
  if (next != null) return next;
  return "";
}

function createMiniScanState() {
  return {
    inBlockComment: false,
    inString: null,
    inTemplateString: false,
    escapeNext: false,
    parenDepth: 0,
    bracketDepth: 0,
    braceDepth: 0
  };
}

function scanLineMini(line, state) {
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    const scan = scanScriptCharState(ch, next, state);
    if (scan === "skip-next") {
      i++;
      continue;
    }
    if (scan === "break-line" || scan === "continue") {
      if (scan === "break-line") break;
      continue;
    }
    if (ch === "(") state.parenDepth++;
    if (ch === ")") state.parenDepth = Math.max(0, state.parenDepth - 1);
    if (ch === "[") state.bracketDepth++;
    if (ch === "]") state.bracketDepth = Math.max(0, state.bracketDepth - 1);
    if (ch === "{") state.braceDepth++;
    if (ch === "}") state.braceDepth = Math.max(0, state.braceDepth - 1);
  }
  return state;
}

function scanScriptCharState(ch, next, state) {
  if (state.escapeNext) {
    state.escapeNext = false;
    return "continue";
  }
  if (state.inBlockComment) {
    if (ch === "*" && next === "/") {
      state.inBlockComment = false;
      return "skip-next";
    }
    return "continue";
  }
  if (state.inString) {
    if (ch === "\\") {
      state.escapeNext = true;
      return "continue";
    }
    if (ch === state.inString) state.inString = null;
    return "continue";
  }
  if (state.inTemplateString) {
    if (ch === "\\") {
      state.escapeNext = true;
      return "continue";
    }
    if (ch === "`") state.inTemplateString = false;
    return "continue";
  }
  if (ch === "/" && next === "/") return "break-line";
  if (ch === "/" && next === "*") {
    state.inBlockComment = true;
    return "skip-next";
  }
  if (ch === '"' || ch === "'") {
    state.inString = ch;
    return "continue";
  }
  if (ch === "`") {
    state.inTemplateString = true;
    return "continue";
  }
  return "code";
}

function detectVueBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const lineForMatch = stripBomAtFirstLine(lines[i], i);
    const openInfo = findVueRootOpenTagInLine(lineForMatch);
    if (!openInfo) {
      i++;
      continue;
    }

    const type = openInfo.type;
    const openLine = i + 1;
    const openColumn = openInfo.column;
    const openEnd = findRootOpenTagEnd(lines, i, openColumn);

    if (!openEnd) {
      if (DEBUG) console.log(`[DEBUG] L${openLine} 找到 <${type}>，但没有找到打开标签结束 >`);
      i++;
      continue;
    }

    const openEndLine = openEnd.index + 1;
    const openTagText = collectOpenTagText(lines, i, openColumn, openEnd.index, openEnd.column);
    const lang = normalizeLang(extractAttr(openTagText, "lang"));
    const hasSrc = extractAttr(openTagText, "src") != null;
    const selfClosing = isSelfClosingRootOpenTag(openTagText);

    let closeIndex = null;
    let closeColumn = null;
    if (selfClosing) {
      closeIndex = openEnd.index;
      closeColumn = openEnd.column;
    } else {
      const closeInfo = findRootCloseTag(lines, type, openEnd.index, openEnd.column);
      if (closeInfo) {
        closeIndex = closeInfo.index;
        closeColumn = closeInfo.column;
      }
    }

    blocks.push({
      type,
      lang,
      hasSrc,
      openLine,
      openEndLine,
      startLine: openEndLine + 1,
      endLine: closeIndex != null ? closeIndex : openEndLine,
      closeLine: closeIndex != null ? closeIndex + 1 : null,
      openTagText,
      openColumn,
      closeColumn
    });

    i = closeIndex != null ? closeIndex + 1 : openEnd.index + 1;
  }

  return blocks;
}

function findVueRootOpenTagInLine(line) {
  const text = String(line);
  const re = /<\s*([A-Za-z][A-Za-z0-9:_-]*)\b/g;
  let match;

  while ((match = re.exec(text))) {
    const column = match.index;
    const type = match[1].toLowerCase();
    if (/^<\s*\//.test(text.slice(column))) continue;
    if (isInsideHtmlCommentOnSameLine(text, column)) continue;
    if (!isVueSfcBlockType(type)) continue;
    return { type, column };
  }

  return null;
}

function isVueSfcBlockType(type) {
  return ["template", "script", "style", "i18n", "docs", "route"].includes(type);
}

function isInsideHtmlCommentOnSameLine(line, column) {
  const before = line.slice(0, column);
  const lastCommentOpen = before.lastIndexOf("<!--");
  const lastCommentClose = before.lastIndexOf("-->");
  return lastCommentOpen !== -1 && lastCommentOpen > lastCommentClose;
}

function findRootOpenTagEnd(lines, startIndex, startColumn = 0) {
  let inQuote = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] || "";
    const fromColumn = i === startIndex ? startColumn : 0;
    for (let column = fromColumn; column < line.length; column++) {
      const ch = line[column];
      if (inQuote) {
        if (ch === inQuote) inQuote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inQuote = ch;
        continue;
      }
      if (ch === ">") return { index: i, column };
    }
  }
  return null;
}

function collectOpenTagText(lines, startIndex, startColumn, endIndex, endColumn) {
  if (startIndex === endIndex) return lines[startIndex].slice(startColumn, endColumn + 1);
  const parts = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (i === startIndex) parts.push(lines[i].slice(startColumn));
    else if (i === endIndex) parts.push(lines[i].slice(0, endColumn + 1));
    else parts.push(lines[i]);
  }
  return parts.join("\n");
}

function findRootCloseTag(lines, type, openEndIndex, openEndColumn) {
  const closeRe = new RegExp(`<\\s*\\/\\s*${escapeRegExp(type)}\\s*>`, "ig");
  for (let i = openEndIndex; i < lines.length; i++) {
    const line = lines[i] || "";
    const searchStart = i === openEndIndex ? openEndColumn + 1 : 0;
    closeRe.lastIndex = searchStart;
    const match = closeRe.exec(line);
    if (!match) continue;
    if (isInsideHtmlCommentOnSameLine(line, match.index)) continue;
    return { index: i, column: match.index };
  }
  return null;
}

function isSelfClosingRootOpenTag(openTagText) {
  return /\/\s*>\s*$/.test(openTagText);
}

function extractAttr(tagText, attrName) {
  const re = new RegExp(
    "\\b" + escapeRegExp(attrName) + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))",
    "i"
  );
  const match = tagText.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function normalizeLang(lang) {
  if (lang == null) return null;
  return String(lang).trim().toLowerCase();
}

function isSupportedScriptBlock(block) {
  if (!block || block.type !== "script" || block.hasSrc) return false;
  return block.lang == null || block.lang === "" || block.lang === "js" || block.lang === "javascript";
}

function stripLineCommentForScript(line) {
  let inString = null;
  let inTemplate = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (ch === "`") inTemplate = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === "/" && next === "/") return line.slice(0, i);
  }

  return line;
}

function isOnlyCommentLine(trimmed) {
  return /^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || /^\*/.test(trimmed);
}

function findPrevSignificantScriptLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo >= block.startLine; lineNo--) {
    const text = (lines[lineNo - 1] || "").trim();
    if (!text || /^\/\//.test(text) || /^\/\*/.test(text) || /^\*/.test(text)) continue;
    return { lineNo, text };
  }
  return null;
}

function findNextSignificantScriptLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const text = (lines[lineNo - 1] || "").trim();
    if (!text || /^\/\//.test(text) || /^\/\*/.test(text) || /^\*/.test(text)) continue;
    return { lineNo, text };
  }
  return null;
}

function hasVoidScriptMark(line) {
  return /\bvoid\s+["'][^"']*\|(?:range|script):\d+-\d+\|random:\d+["']\s*;?/.test(line);
}

function alreadyMarked(line) {
  return (
    /(?:range|script):\d+-\d+(?:\s+|\|)random:\d+/.test(line) ||
    /\b__mark_r\d+\b/.test(line) ||
    hasVoidScriptMark(line)
  );
}

function findPrevIndentLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo >= block.startLine; lineNo--) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();
    if (!trimmed || /^\./.test(trimmed)) continue;
    return line.match(/^\s*/)[0];
  }
  return null;
}

function findNextIndentLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();
    if (!trimmed || /^\./.test(trimmed)) continue;
    return line.match(/^\s*/)[0];
  }
  return null;
}

function makeSafePayloadFileName(fileName) {
  return String(fileName)
    .replace(/\s+/g, "_")
    .replace(/\|/g, "_")
    .replace(/--+/g, "-")
    .replace(/[<>"'&]/g, "_");
}

function randomNumber8() {
  return crypto.randomInt(10000000, 100000000);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBomAtFirstLine(line, index) {
  if (index !== 0) return line;
  return line.replace(/^\uFEFF/, "");
}
