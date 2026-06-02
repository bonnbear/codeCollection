#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * 调试开关
 *
 * 使用方式：
 * DEBUG_MARK=1 node mark-vue-script-ranges.js ranges.json --dry-run
 */
const DEBUG = process.env.DEBUG_MARK === "1";

/**
 * 箭头函数向后扫描的最大行数
 */
const ARROW_LOOKAHEAD_LINES = 30;

const options = parseCliArgs(process.argv.slice(2));

if (!options.inputFile) {
  console.error("用法: node mark-vue-script-ranges.js ranges.json");
  console.error("");
  console.error("input.json 支持：");
  console.error('  1. 数组: ["src/App.vue", "src/Test.vue"]');
  console.error('  2. 对象: {"src/App.vue": [[1, 10]], "src/Test.vue": true}');
  console.error("");
  console.error("可选参数:");
  console.error("  --dry-run    只预览，不写入文件");
  console.error("  --backup     写入前生成 .bak 备份");
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

/**
 * 解析命令行参数
 */
function parseCliArgs(args) {
  const options = {
    inputFile: null,
    dryRun: false,
    backup: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

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

/**
 * 兼容两种输入：
 * 1. ["src/App.vue"]
 * 2. { "src/App.vue": [[1, 10]] }
 */
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

/**
 * 处理单个 Vue 文件
 */
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

  // 保留原文件换行符风格
  const newline = content.includes("\r\n") ? "\r\n" : "\n";

  // 内部统一用 \n 分割，写回时再恢复原换行符
  const lines = content.split(/\r?\n/);

  // 找出 Vue SFC 根块
  const blocks = detectVueBlocks(lines);

  if (DEBUG) {
    console.log(`\n[DEBUG] ${filePath} 识别到的 Vue 根块:`);
    for (const block of blocks) {
      console.log("[DEBUG]", block);
    }
  }

  // 只处理 <script> / <script setup>，只处理 JS，不处理 TS
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
    const actions = collectScriptActions(lines, block, fileName);

    for (const action of actions) {
      allActions.push(action);
    }
  }

  // 插入动作从后往前执行，避免前面的插入影响后面的行号
  const insertActions = allActions
    .filter(action => action.type === "insertAfter")
    .sort((a, b) => b.afterLineNo - a.afterLineNo);

  const appliedActions = [];

  for (const action of insertActions) {
    const insertIndex = action.afterLineNo;

    if (insertIndex < 0 || insertIndex > lines.length) {
      continue;
    }

    /**
     * 这里不要再做重复检测。
     *
     * 原因：
     * 当前插入动作是从后往前执行的。
     * 如果后面的声明已经先插入了 void，
     * 前面的声明再检查“后几行”时，就可能扫到后面刚插入的 void，
     * 从而误判为当前声明已经插过，导致漏插。
     *
     * 重复检测已经在 addInsertAction 阶段基于原始 lines 做过。
     */
    lines.splice(insertIndex, 0, action.text);

    appliedActions.push({
      kind: action.kind,
      lineNo: action.afterLineNo,
      result: action.text.trim()
    });
  }

  if (appliedActions.length || options.dryRun) {
    console.log("\n" + "=".repeat(78));
    console.log("SCRIPT 标记插入报告 — " + filePath);
    console.log("=".repeat(78));

    const varCount = appliedActions.filter(item => item.kind === "var").length;
    const fnCount = appliedActions.filter(item => item.kind === "function-body").length;

    console.log(`\n  变量声明后插入数: ${varCount}`);
    console.log(`  函数块第一行插入数: ${fnCount}`);
    console.log("  范围: 只处理 <script> / <script setup>，不处理 template/style");
    console.log("  支持:");
    console.log("    - const / let / var 单行或多行声明");
    console.log("    - function foo() {}");
    console.log("    - async function foo() {}");
    console.log("    - export function foo() {}");
    console.log("    - export default function foo() {}");
    console.log("    - const foo = function () {}");
    console.log("    - const foo = async function () {}");
    console.log("    - const foo = () => {}");
    console.log("    - const foo = async () => {}");
    console.log("    - export default () => {}");
    console.log("    - export default async () => {}");
    console.log("    - foo = () => {}");
    console.log("    - this.foo = () => {}");
    console.log("    - obj.foo = () => {}");
    console.log("  跳过:");
    console.log("    - 普通对象字面量内部");
    console.log("    - Vue2 Options API 对象内部");
    console.log("    - defineComponent / Vue.extend 参数对象内部");
    console.log("    - 对象数组内部");
    console.log("    - 表达式返回箭头函数");
    console.log("    - 返回对象表达式箭头函数");
    console.log("    - 回调箭头函数体，例如 onMounted(() => {}) 的函数体开头");
    console.log("    - lang='ts' / lang='tsx' 的 script 块");
    console.log("    - src 外链 script 块");

    if (appliedActions.length) {
      console.log(`\n${"─".repeat(72)}`);
      console.log(`【SCRIPT 修改】 (${appliedActions.length} 个 void 标记)`);
      console.log(`${"─".repeat(72)}`);

      for (const action of appliedActions.sort((a, b) => a.lineNo - b.lineNo)) {
        const kindText = action.kind === "var" ? "变量声明后" : "函数块第一行";
        console.log(`  L${String(action.lineNo).padStart(3)} ✅ ${kindText} → ${action.result}`);
      }
    } else {
      console.log("\n没有找到可插入位置，未修改 script。");
    }

    if (options.dryRun) {
      console.log(`\n${"=".repeat(78)}`);
      console.log("预览处理后的文件:");
      console.log("=".repeat(78));
      console.log(lines.join("\n"));
    }
  }

  if (!appliedActions.length) {
    return;
  }

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

/**
 * 收集 script 内需要插入的动作
 */
function collectScriptActions(lines, block, fileName) {
  const actions = [];
  const usedInsertLine = new Set();

  let lineNo = block.startLine;

  while (lineNo <= block.endLine) {
    const line = lines[lineNo - 1];
    const trimmed = stripLineCommentForScript(line).trim();

    if (!trimmed) {
      lineNo++;
      continue;
    }

    if (alreadyMarked(line)) {
      if (DEBUG) {
        console.log(`[DEBUG] L${lineNo} 已有标记，跳过: ${JSON.stringify(trimmed)}`);
      }

      lineNo++;
      continue;
    }

    const insideObjectDefinitionBlock = isLikelyInsideObjectDefinitionBlock(
      lines,
      block,
      lineNo
    );

    if (DEBUG) {
      console.log(
        `[DEBUG] L${lineNo}`,
        JSON.stringify(trimmed),
        {
          insideObjectDefinitionBlock,
          isVar: isVariableDeclarationStart(trimmed),
          isFunctionOpenCandidate:
            isFunctionDeclarationStart(trimmed) ||
            isVariableFunctionExpressionStart(trimmed) ||
            isExportDefaultArrowFunctionStart(lines, block, lineNo) ||
            isTopLevelVariableArrowFunctionStart(lines, block, lineNo) ||
            isAssignmentArrowFunctionStart(lines, block, lineNo)
        }
      );
    }

    // 变量声明：const / let / var
    if (!insideObjectDefinitionBlock && isVariableDeclarationStart(trimmed)) {
      const endLineNo = findStatementEndLine(lines, block, lineNo);

      if (DEBUG) {
        console.log(`[DEBUG] L${lineNo} 变量声明结束行:`, endLineNo);
      }

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
        } else if (DEBUG) {
          console.log(`[DEBUG] L${lineNo} 变量声明是对象/配置类声明，跳过变量后插入`);
        }
      }
    }

    // 函数块第一行
    if (!insideObjectDefinitionBlock) {
      const functionOpenLineNo = detectFunctionBodyOpenLine(lines, block, lineNo);

      if (DEBUG && functionOpenLineNo != null) {
        console.log(`[DEBUG] L${lineNo} 函数体打开行:`, functionOpenLineNo);
      }

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

/**
 * 添加插入动作
 */
function addInsertAction({
  actions,
  usedInsertLine,
  lines,
  block,
  fileName,
  afterLineNo,
  kind
}) {
  if (afterLineNo == null) return;
  if (afterLineNo < block.startLine) return;
  if (afterLineNo > block.endLine) return;

  const key = `${kind}:${afterLineNo}`;
  if (usedInsertLine.has(key)) return;

  if (hasExistingScriptMarkImmediatelyAfter(lines, afterLineNo, block.endLine)) {
    if (DEBUG) {
      console.log(`[DEBUG] L${afterLineNo} 后面第一行有效代码已经是标记，跳过`);
    }

    return;
  }

  const anchorLine = lines[afterLineNo - 1] || "";
  const indent = getInsertionIndentForAction(lines, block, afterLineNo, kind);
  const scriptText = `${block.startLine}-${block.endLine}`;
  const random = randomNumber8();
  const payload = `${fileName}|script:${scriptText}|random:${random}`;
  const value = JSON.stringify(payload);

  if (kind === "function-body" && isSingleLineFunctionBody(anchorLine)) {
    if (DEBUG) {
      console.log(`[DEBUG] L${afterLineNo} 单行函数体，跳过`);
    }

    return;
  }

  actions.push({
    type: "insertAfter",
    afterLineNo,
    text: `${indent}void ${value};`,
    payload,
    kind
  });

  usedInsertLine.add(key);
}

/**
 * 判断插入点后面第一个有效代码行是否已经是标记
 */
function hasExistingScriptMarkImmediatelyAfter(lines, afterLineNo, endLineNo) {
  for (let lineNo = afterLineNo + 1; lineNo <= endLineNo; lineNo++) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (
      /\b__mark_r\d+\b/.test(line) ||
      /(?:range|script):\d+-\d+(?:\s+|\|)random:\d+/.test(line) ||
      hasVoidScriptMark(line)
    ) {
      return true;
    }

    return false;
  }

  return false;
}

function isVariableDeclarationStart(trimmed) {
  return /^(?:export\s+)?(?:const|let|var)\b/.test(trimmed);
}

function isFunctionDeclarationStart(trimmed) {
  return /^(?:export\s+default\s+|export\s+)?(?:async\s+)?function(?:\s+|\*)/.test(
    trimmed
  );
}

function isVariableFunctionExpressionStart(trimmed) {
  return /^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*(?:async\s+)?function(?:\s+|\*)?/.test(
    trimmed
  );
}

/**
 * 判断变量声明是不是对象/配置类声明
 */
function isObjectLikeVariableDeclaration(statementText) {
  const text = String(statementText).trim();

  if (!/^(?:export\s+)?(?:const|let|var)\b/.test(text)) {
    return false;
  }

  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*\{/.test(text)) {
    return true;
  }

  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*\[[\s\S]*\{/.test(text)) {
    return true;
  }

  if (
    /^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*\(\s*\{/.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

/**
 * 找变量声明或普通语句的结束行
 */
function findStatementEndLine(lines, block, startLineNo) {
  const state = createMiniScanState();

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1];

    scanLineMini(line, state);

    const code = stripLineCommentForScript(line).trim();

    if (!code) continue;

    if (state.inBlockComment || state.inString || state.inTemplateString) {
      continue;
    }

    if (state.parenDepth !== 0 || state.bracketDepth !== 0 || state.braceDepth !== 0) {
      continue;
    }

    if (/;\s*$/.test(code)) {
      return lineNo;
    }

    const next = findNextSignificantScriptLine(lines, block, lineNo + 1);

    if (!next) {
      return lineNo;
    }

    const nextText = stripLineCommentForScript(next.text).trim();

    if (!isLikelyContinuationLine(code, nextText)) {
      return lineNo;
    }
  }

  return null;
}

function isLikelyContinuationLine(currentText, nextText) {
  if (!nextText) return false;

  if (/[,+*/%&|^?:=<>!\-.]\s*$/.test(currentText)) {
    return true;
  }

  if (/^[)\]}.,?:]/.test(nextText)) {
    return true;
  }

  if (/^\./.test(nextText)) {
    return true;
  }

  return false;
}

/**
 * 检测函数体打开位置
 */
function detectFunctionBodyOpenLine(lines, block, lineNo) {
  const line = lines[lineNo - 1];
  const code = stripLineCommentForScript(line).trim();

  if (!code) return null;
  if (isOnlyCommentLine(code)) return null;

  if (/^(if|for|while|switch|catch|with|else|do|try|finally)\b/.test(code)) {
    return null;
  }

  if (isLikelyInsideObjectDefinitionBlock(lines, block, lineNo)) {
    return null;
  }

  if (isFunctionDeclarationStart(code)) {
    return findFunctionOpenBraceLine(lines, block, lineNo);
  }

  if (isVariableFunctionExpressionStart(code)) {
    return findFunctionOpenBraceLine(lines, block, lineNo);
  }

  if (isExportDefaultArrowFunctionStart(lines, block, lineNo)) {
    return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  }

  if (isTopLevelVariableArrowFunctionStart(lines, block, lineNo)) {
    return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  }

  if (isAssignmentArrowFunctionStart(lines, block, lineNo)) {
    return findArrowFunctionOpenBraceLine(lines, block, lineNo);
  }

  return null;
}

/**
 * export default 箭头函数
 */
function isExportDefaultArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1]).trim();

  if (!/^export\s+default\b/.test(firstLine)) {
    return false;
  }

  if (/^export\s+default\s+(?:async\s+)?function\b/.test(firstLine)) {
    return false;
  }

  if (/=>/.test(firstLine)) {
    return true;
  }

  const maxLookAheadLine = Math.min(block.endLine, lineNo + ARROW_LOOKAHEAD_LINES);

  for (let currentLineNo = lineNo + 1; currentLineNo <= maxLookAheadLine; currentLineNo++) {
    const text = stripLineCommentForScript(lines[currentLineNo - 1]).trim();

    if (!text) continue;

    if (/=>/.test(text)) {
      return true;
    }

    if (/;\s*$/.test(text)) {
      return false;
    }

    if (/^(?:export\s+)?(?:const|let|var|function|class)\b/.test(text)) {
      return false;
    }
  }

  return false;
}

/**
 * 顶层变量箭头函数
 */
function isTopLevelVariableArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1]).trim();

  if (!/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=/.test(firstLine)) {
    return false;
  }

  if (/=>/.test(firstLine)) {
    return true;
  }

  const maxLookAheadLine = Math.min(block.endLine, lineNo + ARROW_LOOKAHEAD_LINES);

  for (let currentLineNo = lineNo + 1; currentLineNo <= maxLookAheadLine; currentLineNo++) {
    const text = stripLineCommentForScript(lines[currentLineNo - 1]).trim();

    if (!text) continue;

    if (/=>/.test(text)) {
      return true;
    }

    if (/;\s*$/.test(text)) {
      return false;
    }

    if (/^(?:export\s+)?(?:const|let|var|function|class)\b/.test(text)) {
      return false;
    }
  }

  return false;
}

/**
 * 普通赋值箭头函数
 */
function isAssignmentArrowFunctionStart(lines, block, lineNo) {
  const firstLine = stripLineCommentForScript(lines[lineNo - 1]).trim();

  if (/^(?:export\s+)?(?:const|let|var)\b/.test(firstLine)) {
    return false;
  }

  if (/^(return|throw|if|for|while|switch|catch|with|else|do|try|finally)\b/.test(firstLine)) {
    return false;
  }

  if (!/^(?:this\.)?[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*=/.test(firstLine)) {
    return false;
  }

  if (/=>/.test(firstLine)) {
    return true;
  }

  const maxLookAheadLine = Math.min(block.endLine, lineNo + ARROW_LOOKAHEAD_LINES);

  for (let currentLineNo = lineNo + 1; currentLineNo <= maxLookAheadLine; currentLineNo++) {
    const text = stripLineCommentForScript(lines[currentLineNo - 1]).trim();

    if (!text) continue;

    if (/=>/.test(text)) {
      return true;
    }

    if (/;\s*$/.test(text)) {
      return false;
    }

    if (/^(?:export\s+)?(?:const|let|var|function|class)\b/.test(text)) {
      return false;
    }
  }

  return false;
}

/**
 * 找箭头函数块体打开的 {
 */
function findArrowFunctionOpenBraceLine(lines, block, startLineNo) {
  const state = createMiniScanState();

  let sawArrow = false;
  let arrowLineNo = null;
  let arrowColumn = -1;

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1];

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (state.escapeNext) {
        state.escapeNext = false;
        continue;
      }

      if (state.inBlockComment) {
        if (ch === "*" && next === "/") {
          state.inBlockComment = false;
          i++;
        }
        continue;
      }

      if (state.inString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === state.inString) {
          state.inString = null;
        }

        continue;
      }

      if (state.inTemplateString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === "`") {
          state.inTemplateString = false;
        }

        continue;
      }

      if (ch === "/" && next === "/") {
        break;
      }

      if (ch === "/" && next === "*") {
        state.inBlockComment = true;
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        state.inString = ch;
        continue;
      }

      if (ch === "`") {
        state.inTemplateString = true;
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

        if (/\(\s*$/.test(beforeBrace)) {
          return null;
        }

        if (lineNo === arrowLineNo) {
          const betweenArrowAndBrace = line.slice(arrowColumn + 2, i).trim();

          if (betweenArrowAndBrace !== "") {
            return null;
          }
        } else {
          const prev = findPrevSignificantScriptLine(lines, block, lineNo - 1);

          if (!prev || prev.lineNo !== arrowLineNo) {
            return null;
          }
        }

        return lineNo;
      }
    }

    const trimmed = stripLineCommentForScript(line).trim();

    if (sawArrow && /;\s*$/.test(trimmed)) {
      return null;
    }

    if (!sawArrow && /;\s*$/.test(trimmed)) {
      return null;
    }
  }

  return null;
}

/**
 * 找 function 函数体打开的 {
 */
function findFunctionOpenBraceLine(lines, block, startLineNo) {
  const state = createMiniScanState();
  let sawFunctionKeyword = false;

  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1];
    const code = stripLineCommentForScript(line);

    if (/\bfunction\b/.test(code)) {
      sawFunctionKeyword = true;
    }

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (state.escapeNext) {
        state.escapeNext = false;
        continue;
      }

      if (state.inBlockComment) {
        if (ch === "*" && next === "/") {
          state.inBlockComment = false;
          i++;
        }
        continue;
      }

      if (state.inString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === state.inString) {
          state.inString = null;
        }

        continue;
      }

      if (state.inTemplateString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === "`") {
          state.inTemplateString = false;
        }

        continue;
      }

      if (ch === "/" && next === "/") {
        break;
      }

      if (ch === "/" && next === "*") {
        state.inBlockComment = true;
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        state.inString = ch;
        continue;
      }

      if (ch === "`") {
        state.inTemplateString = true;
        continue;
      }

      if (ch === "{") {
        if (sawFunctionKeyword) {
          return lineNo;
        }
      }
    }

    const trimmed = stripLineCommentForScript(line).trim();

    if (/;\s*$/.test(trimmed) && !/[{]\s*$/.test(trimmed)) {
      return null;
    }
  }

  return null;
}

/**
 * 判断当前行是否大概率处在对象字面量定义块里
 */
function isLikelyInsideObjectDefinitionBlock(lines, block, lineNo) {
  const stack = createObjectContextStack(lines, block, lineNo);

  if (!stack.length) {
    return false;
  }

  return stack.some(item => item.kind === "object");
}

/**
 * 创建当前行之前的大括号上下文栈
 */
function createObjectContextStack(lines, block, lineNo) {
  const state = createMiniScanState();
  const stack = [];

  for (let currentLineNo = block.startLine; currentLineNo < lineNo; currentLineNo++) {
    const line = lines[currentLineNo - 1];

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (state.escapeNext) {
        state.escapeNext = false;
        continue;
      }

      if (state.inBlockComment) {
        if (ch === "*" && next === "/") {
          state.inBlockComment = false;
          i++;
        }
        continue;
      }

      if (state.inString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === state.inString) {
          state.inString = null;
        }

        continue;
      }

      if (state.inTemplateString) {
        if (ch === "\\") {
          state.escapeNext = true;
          continue;
        }

        if (ch === "`") {
          state.inTemplateString = false;
        }

        continue;
      }

      if (ch === "/" && next === "/") {
        break;
      }

      if (ch === "/" && next === "*") {
        state.inBlockComment = true;
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        state.inString = ch;
        continue;
      }

      if (ch === "`") {
        state.inTemplateString = true;
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

      if (ch === "}") {
        if (stack.length) {
          stack.pop();
        }

        continue;
      }
    }
  }

  return stack;
}

function looksLikeObjectOpenBeforeBrace(before) {
  if (!before) {
    return false;
  }

  if (/\bfunction\b/.test(before)) {
    return false;
  }

  if (/=>\s*$/.test(before)) {
    return false;
  }

  if (/^(if|for|while|switch|catch|with|else|do|try|finally)\b/.test(before)) {
    return false;
  }

  if (/^class\b/.test(before)) {
    return false;
  }

  if (looksLikeObjectMethodBeforeBrace(before)) {
    return false;
  }

  if (/^export\s+default\s*$/.test(before)) {
    return true;
  }

  if (/^return\s*$/.test(before)) {
    return true;
  }

  if (/^(?:export\s+)?(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=\s*$/.test(before)) {
    return true;
  }

  if (/^(?:this\.)?[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*=\s*$/.test(before)) {
    return true;
  }

  if (/^[$A-Z_a-z][$\w]*\s*:\s*$/.test(before)) {
    return true;
  }

  if (/\(\s*$/.test(before)) {
    return true;
  }

  if (/[$A-Z_a-z][$\w]*(?:\.[_$A-Z_a-z][$\w]*)*\s*\(\s*$/.test(before)) {
    return true;
  }

  if (/[\[,]\s*$/.test(before)) {
    return true;
  }

  if (/,\s*$/.test(before)) {
    return true;
  }

  return false;
}

function looksLikeObjectMethodBeforeBrace(before) {
  if (!before) return false;

  if (/^(if|for|while|switch|catch|with)\b/.test(before)) {
    return false;
  }

  return /^(?:async\s+)?(?:get\s+|set\s+)?\*?\s*[$A-Z_a-z][$\w]*\s*\([^)]*\)\s*$/.test(
    before
  );
}

function isSingleLineFunctionBody(line) {
  const code = stripLineCommentForScript(line).trim();

  return /\{.+\}/.test(code);
}

function getInsertionIndentForAction(lines, block, anchorLineNo, kind) {
  const line = lines[anchorLineNo - 1] || "";
  const currentIndent = line.match(/^\s*/)[0];

  if (kind === "function-body") {
    return currentIndent + "  ";
  }

  if (line.trim()) {
    return currentIndent;
  }

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

    if (state.escapeNext) {
      state.escapeNext = false;
      continue;
    }

    if (state.inBlockComment) {
      if (ch === "*" && next === "/") {
        state.inBlockComment = false;
        i++;
      }
      continue;
    }

    if (state.inString) {
      if (ch === "\\") {
        state.escapeNext = true;
        continue;
      }

      if (ch === state.inString) {
        state.inString = null;
      }

      continue;
    }

    if (state.inTemplateString) {
      if (ch === "\\") {
        state.escapeNext = true;
        continue;
      }

      if (ch === "`") {
        state.inTemplateString = false;
      }

      continue;
    }

    if (ch === "/" && next === "/") {
      break;
    }

    if (ch === "/" && next === "*") {
      state.inBlockComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      state.inString = ch;
      continue;
    }

    if (ch === "`") {
      state.inTemplateString = true;
      continue;
    }

    if (ch === "(") {
      state.parenDepth++;
      continue;
    }

    if (ch === ")") {
      state.parenDepth = Math.max(0, state.parenDepth - 1);
      continue;
    }

    if (ch === "[") {
      state.bracketDepth++;
      continue;
    }

    if (ch === "]") {
      state.bracketDepth = Math.max(0, state.bracketDepth - 1);
      continue;
    }

    if (ch === "{") {
      state.braceDepth++;
      continue;
    }

    if (ch === "}") {
      state.braceDepth = Math.max(0, state.braceDepth - 1);
      continue;
    }
  }

  return state;
}

/**
 * 检测 Vue SFC 根块
 *
 * 修复点：
 * 1. 不要求 <template> / <script> / <style> 必须在行首
 * 2. 允许根标签出现在一行中间
 * 3. 如果某个块没有正确闭合，不再直接吞掉整个文件
 * 4. 继续向后扫描，尽量识别独立的 script 块
 */
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
      if (DEBUG) {
        console.log(
          `[DEBUG] L${openLine} 找到 <${type}>，但没有找到打开标签结束 >，跳过该行继续扫描`
        );
      }

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

    const closeLine = closeIndex != null ? closeIndex + 1 : null;
    const startLine = openEndLine + 1;

    /**
     * 这里按行处理：
     *
     * 常规：
     * <script>
     * const a = 1;
     * </script>
     *
     * 如果是行内：
     * <script>const a = 1;</script>
     *
     * 当前脚本仍不重点处理行内 script。
     */
    const endLine = closeIndex != null ? closeIndex : openEndLine;

    blocks.push({
      type,
      lang,
      hasSrc,
      openLine,
      openEndLine,
      startLine,
      endLine,
      closeLine,
      openTagText,
      openColumn,
      closeColumn
    });

    if (DEBUG) {
      console.log(
        `[DEBUG] 识别根块 <${type}>`,
        {
          openLine,
          openEndLine,
          startLine,
          endLine,
          closeLine,
          openColumn,
          closeColumn,
          lang,
          hasSrc
        }
      );
    }

    if (closeIndex != null) {
      i = closeIndex + 1;
    } else {
      i = openEnd.index + 1;
    }
  }

  return blocks;
}

/**
 * 在一行中查找 Vue SFC 根块打开标签
 */
function findVueRootOpenTagInLine(line) {
  const text = String(line);
  const re = /<\s*([A-Za-z][A-Za-z0-9:_-]*)\b/g;

  let match;

  while ((match = re.exec(text))) {
    const column = match.index;
    const type = match[1].toLowerCase();

    if (/^<\s*\//.test(text.slice(column))) {
      continue;
    }

    if (isInsideHtmlCommentOnSameLine(text, column)) {
      continue;
    }

    if (!isVueSfcBlockType(type)) {
      continue;
    }

    return {
      type,
      column
    };
  }

  return null;
}

function isVueSfcBlockType(type) {
  return (
    type === "template" ||
    type === "script" ||
    type === "style" ||
    type === "i18n" ||
    type === "docs" ||
    type === "route"
  );
}

function isInsideHtmlCommentOnSameLine(line, column) {
  const before = line.slice(0, column);

  const lastCommentOpen = before.lastIndexOf("<!--");
  const lastCommentClose = before.lastIndexOf("-->");

  return lastCommentOpen !== -1 && lastCommentOpen > lastCommentClose;
}

/**
 * 找根标签打开结束的 >
 */
function findRootOpenTagEnd(lines, startIndex, startColumn = 0) {
  let inQuote = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
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

      if (ch === ">") {
        return { index: i, column };
      }
    }
  }

  return null;
}

/**
 * 收集打开标签文本
 */
function collectOpenTagText(lines, startIndex, startColumn, endIndex, endColumn) {
  if (startIndex === endIndex) {
    return lines[startIndex].slice(startColumn, endColumn + 1);
  }

  const parts = [];

  for (let i = startIndex; i <= endIndex; i++) {
    if (i === startIndex) {
      parts.push(lines[i].slice(startColumn));
      continue;
    }

    if (i === endIndex) {
      parts.push(lines[i].slice(0, endColumn + 1));
      continue;
    }

    parts.push(lines[i]);
  }

  return parts.join("\n");
}

/**
 * 找根标签关闭行
 */
function findRootCloseTag(lines, type, openEndIndex, openEndColumn) {
  const closeRe = new RegExp(`<\\s*\\/\\s*${escapeRegExp(type)}\\s*>`, "ig");

  for (let i = openEndIndex; i < lines.length; i++) {
    const line = lines[i];
    const searchStart = i === openEndIndex ? openEndColumn + 1 : 0;

    closeRe.lastIndex = searchStart;

    const match = closeRe.exec(line);

    if (match) {
      if (isInsideHtmlCommentOnSameLine(line, match.index)) {
        continue;
      }

      return {
        index: i,
        column: match.index
      };
    }
  }

  return null;
}

function isSelfClosingRootOpenTag(openTagText) {
  return /\/\s*>\s*$/.test(openTagText);
}

function extractAttr(tagText, attrName) {
  const re = new RegExp(
    "\\b" +
      escapeRegExp(attrName) +
      "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))",
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
  if (!block) return false;
  if (block.type !== "script") return false;
  if (block.hasSrc) return false;

  return (
    block.lang == null ||
    block.lang === "" ||
    block.lang === "js" ||
    block.lang === "javascript"
  );
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

    if (ch === "/" && next === "/") {
      return line.slice(0, i);
    }
  }

  return line;
}

function isOnlyCommentLine(trimmed) {
  return /^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || /^\*/.test(trimmed);
}

function findPrevSignificantScriptLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo >= block.startLine; lineNo--) {
    const text = lines[lineNo - 1].trim();

    if (!text) continue;
    if (/^\/\//.test(text)) continue;
    if (/^\/\*/.test(text)) continue;
    if (/^\*/.test(text)) continue;

    return { lineNo, text };
  }

  return null;
}

function findNextSignificantScriptLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const text = lines[lineNo - 1].trim();

    if (!text) continue;
    if (/^\/\//.test(text)) continue;
    if (/^\/\*/.test(text)) continue;
    if (/^\*/.test(text)) continue;

    return { lineNo, text };
  }

  return null;
}

function hasExistingScriptMarkInRange(lines, startLine, endLine) {
  const start = clamp(startLine, 1, lines.length);
  const end = clamp(endLine, 1, lines.length);

  for (let lineNo = start; lineNo <= end; lineNo++) {
    const line = lines[lineNo - 1];

    if (
      /\b__mark_r\d+\b/.test(line) ||
      /(?:range|script):\d+-\d+(?:\s+|\|)random:\d+/.test(line) ||
      hasVoidScriptMark(line)
    ) {
      return true;
    }
  }

  return false;
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

    if (!trimmed) continue;
    if (/^\./.test(trimmed)) continue;

    return line.match(/^\s*/)[0];
  }

  return null;
}

function findNextIndentLine(lines, block, startLineNo) {
  for (let lineNo = startLineNo; lineNo <= block.endLine; lineNo++) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (/^\./.test(trimmed)) continue;

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

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBomAtFirstLine(line, index) {
  if (index !== 0) return line;
  return line.replace(/^\uFEFF/, "");
}