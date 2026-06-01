#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const options = parseCliArgs(process.argv.slice(2));

if (!options.inputFile) {
  console.error("用法: node mark-vue-template-ranges.js ranges.json");
  console.error("");
  console.error("可选参数:");
  console.error("  --dry-run      只预览，不写入文件");
  console.error("  --backup       写入前生成 .bak 备份");
  process.exit(1);
}

let rangeMap;

try {
  rangeMap = JSON.parse(fs.readFileSync(options.inputFile, "utf8"));
} catch (error) {
  console.error(`[错误] 读取或解析 JSON 失败: ${options.inputFile}`);
  console.error(error.message);
  process.exit(1);
}

if (!rangeMap || typeof rangeMap !== "object" || Array.isArray(rangeMap)) {
  console.error("[错误] ranges.json 顶层必须是对象，例如：");
  console.error(JSON.stringify({ "src/App.vue": [[1, 10], "(20,30)", "40-50"] }, null, 2));
  process.exit(1);
}

for (const [filePath, rawRanges] of Object.entries(rangeMap)) {
  processVueFileTemplateOnly(filePath, rawRanges, options);
}

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

function processVueFileTemplateOnly(filePath, rawRanges, options) {
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

  const rawRangeList = normalizeRawRanges(rawRanges);

  const ranges = rawRangeList
    .map(parseRange)
    .filter(Boolean)
    .map(([start, end]) => ({
      start: Math.min(Number(start), Number(end)),
      end: Math.max(Number(start), Number(end))
    }))
    .filter(r => Number.isInteger(r.start) && Number.isInteger(r.end))
    .filter(r => r.start >= 1 && r.end >= 1 && r.start <= lines.length);

  if (!ranges.length) {
    console.warn(`[跳过] 没有有效 range: ${filePath}`);
    return;
  }

  const blocks = detectVueBlocks(lines);
  const rootTagLines = collectVueRootBlockTagLines(blocks);
  const templateRawTextLines = collectTemplateRawTextLines(lines, blocks);

  const lineMarks = new Map();

  for (const range of ranges) {
    const startLine = clamp(range.start, 1, lines.length);
    const endLine = clamp(range.end, 1, lines.length);
    const fileName = makeSafePayloadFileName(path.basename(filePath));
    const rangeText = `${startLine}-${endLine}`;
    const rangeRandom = randomNumber8();
    const payload = `${fileName}|range:${rangeText}|random:${rangeRandom}`;

    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      const line = lines[lineNo - 1];

      if (shouldSkipEmptyLine(line)) continue;
      if (rootTagLines.has(lineNo)) continue;
      if (lineMarks.has(lineNo)) continue;
      if (templateRawTextLines.has(lineNo)) continue;

      const block = getBlockByLine(blocks, lineNo);

      if (block.type !== "template") continue;
      if (!isSupportedTemplateBlock(block)) continue;

      lineMarks.set(lineNo, { block, payload });
    }
  }

  const entries = Array.from(lineMarks.entries()).sort((a, b) => a[0] - b[0]);

  let changedCount = 0;
  const report = [];

  for (const [lineNo, mark] of entries) {
    const index = lineNo - 1;
    const originalLine = lines[index];

    if (alreadyTemplateMarked(originalLine)) {
      report.push({
        lineNo,
        changed: false,
        reason: "已有 data-mark",
        original: originalLine.trim().slice(0, 120),
        result: originalLine.trim().slice(0, 120)
      });
      continue;
    }

    const newLine = appendTemplateDataMarkSafely(lines, blocks, lineNo, originalLine, mark.payload);

    if (newLine !== originalLine) {
      lines[index] = newLine;
      changedCount++;

      report.push({
        lineNo,
        changed: true,
        reason: "",
        original: originalLine.trim().slice(0, 120),
        result: newLine.trim().slice(0, 160)
      });
    } else {
      report.push({
        lineNo,
        changed: false,
        reason: getTemplateSkipReason(lines, blocks, lineNo, originalLine, templateRawTextLines, rootTagLines),
        original: originalLine.trim().slice(0, 120),
        result: originalLine.trim().slice(0, 120)
      });
    }
  }

  if (changedCount || options.dryRun) {
    console.log("\n" + "=".repeat(78));
    console.log("TEMPLATE-ONLY 标记报告 — " + filePath);
    console.log("=".repeat(78));

    console.log(`\n  template 标记行数: ${changedCount}`);
    console.log("  script: 不处理");
    console.log("  style: 不处理");
    console.log("  template 规则: range 内安全开始标签加 data-mark 属性，不追加 HTML 注释");

    if (report.length) {
      console.log(`\n${"─".repeat(72)}`);
      console.log(`【TEMPLATE】 (${report.filter(l => l.changed).length} 标记 / ${report.filter(l => !l.changed).length} 跳过)`);
      console.log(`${"─".repeat(72)}`);

      for (const item of report) {
        if (item.changed) {
          console.log(`  L${String(item.lineNo).padStart(3)} ✅ → ${item.result}`);
        } else {
          console.log(`  L${String(item.lineNo).padStart(3)} ⏭️  (${item.reason}) | ${item.original}`);
        }
      }
    }

    console.log(`\n${"=".repeat(78)}`);
    console.log("完整处理后的文件:");
    console.log("=".repeat(78));
    console.log(lines.join("\n"));
  }

  if (!changedCount) {
    return;
  }

  if (options.dryRun) {
    console.log(`\n[预览] ${filePath}，template 标记 ${changedCount} 行，未写入`);
    return;
  }

  if (options.backup) {
    const backupPath = `${filePath}.bak`;
    fs.writeFileSync(backupPath, content, "utf8");
    console.log(`[备份] ${backupPath}`);
  }

  fs.writeFileSync(filePath, lines.join(newline), "utf8");
  console.log(`[完成] ${filePath}，template 标记 ${changedCount} 行`);
}

function normalizeRawRanges(rawRanges) {
  if (Array.isArray(rawRanges)) return rawRanges;

  if (
    typeof rawRanges === "number" ||
    typeof rawRanges === "string" ||
    (rawRanges && typeof rawRanges === "object")
  ) {
    return [rawRanges];
  }

  return [];
}

function parseRange(item) {
  if (typeof item === "number") return [item, item];

  if (Array.isArray(item) && item.length >= 2) {
    return [Number(item[0]), Number(item[1])];
  }

  if (item && typeof item === "object") {
    const start = item.start ?? item.begin ?? item.from ?? item.line;
    const end = item.end ?? item.to ?? item.line ?? start;

    if (start != null && end != null) {
      return [Number(start), Number(end)];
    }
  }

  if (typeof item === "string") {
    const normalized = item
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/，/g, ",")
      .replace(/【/g, "[")
      .replace(/】/g, "]")
      .replace(/－/g, "-")
      .replace(/—/g, "-")
      .replace(/–/g, "-")
      .replace(/～/g, "~")
      .replace(/至/g, "-")
      .replace(/到/g, "-");

    const pairMatch = normalized.match(/(\d+)\s*(?:,|-|~|:)\s*(\d+)/);

    if (pairMatch) return [Number(pairMatch[1]), Number(pairMatch[2])];

    const singleMatch = normalized.match(/^\s*(\d+)\s*$/);

    if (singleMatch) {
      const line = Number(singleMatch[1]);
      return [line, line];
    }
  }

  console.warn(`[警告] 无法解析 range: ${JSON.stringify(item)}`);
  return null;
}

function detectVueBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const lineForMatch = stripBomAtFirstLine(lines[i], i);
    const openMatch = lineForMatch.match(/^\s*<\s*([A-Za-z][A-Za-z0-9:_-]*)\b/i);

    if (!openMatch) {
      i++;
      continue;
    }

    const type = openMatch[1].toLowerCase();
    const openLine = i + 1;
    const openEnd = findRootOpenTagEnd(lines, i);

    if (!openEnd) {
      blocks.push({
        type,
        lang: null,
        hasSrc: false,
        openLine,
        openEndLine: openLine,
        startLine: openLine + 1,
        endLine: lines.length,
        closeLine: null,
        openTagText: lines[i]
      });
      break;
    }

    const openEndLine = openEnd.index + 1;
    const openTagText = lines.slice(i, openEnd.index + 1).join("\n");
    const lang = normalizeLang(extractAttr(openTagText, "lang"));
    const hasSrc = extractAttr(openTagText, "src") != null;
    const selfClosing = isSelfClosingRootOpenTag(openTagText);

    let closeIndex = null;

    if (selfClosing) {
      closeIndex = openEnd.index;
    } else {
      const closeInfo = findRootCloseTag(lines, type, openEnd.index, openEnd.column);
      closeIndex = closeInfo ? closeInfo.index : null;
    }

    const closeLine = closeIndex != null ? closeIndex + 1 : null;
    const startLine = openEndLine + 1;
    const endLine = closeIndex != null ? closeIndex : lines.length;

    blocks.push({
      type,
      lang,
      hasSrc,
      openLine,
      openEndLine,
      startLine,
      endLine,
      closeLine,
      openTagText
    });

    if (closeIndex != null) {
      i = closeIndex + 1;
    } else {
      break;
    }
  }

  return blocks;
}

function findRootOpenTagEnd(lines, startIndex) {
  let inQuote = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    for (let column = 0; column < line.length; column++) {
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

function findRootCloseTag(lines, type, openEndIndex, openEndColumn) {
  const sameLineRest = lines[openEndIndex].slice(openEndColumn + 1);
  const inlineCloseRe = new RegExp(`<\\s*\\/\\s*${escapeRegExp(type)}\\s*>`, "i");

  if (inlineCloseRe.test(sameLineRest)) return { index: openEndIndex };

  const closeLineRe = new RegExp(`^\\s*<\\s*\\/\\s*${escapeRegExp(type)}\\s*>\\s*$`, "i");

  for (let i = openEndIndex + 1; i < lines.length; i++) {
    if (closeLineRe.test(stripBomAtFirstLine(lines[i], i))) return { index: i };
  }

  return null;
}

function isSelfClosingRootOpenTag(openTagText) {
  return /\/\s*>\s*$/.test(openTagText);
}

function collectVueRootBlockTagLines(blocks) {
  const set = new Set();

  for (const block of blocks) {
    for (let lineNo = block.openLine; lineNo <= block.openEndLine; lineNo++) {
      set.add(lineNo);
    }

    if (block.closeLine) set.add(block.closeLine);
  }

  return set;
}

function getBlockByLine(blocks, lineNo) {
  const block = blocks.find(b => lineNo >= b.startLine && lineNo <= b.endLine);

  if (block) return block;

  return {
    type: "unknown",
    lang: null,
    hasSrc: false,
    startLine: 1,
    endLine: Number.MAX_SAFE_INTEGER
  };
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

function isSupportedTemplateBlock(block) {
  if (block.hasSrc) return false;
  return block.lang == null || block.lang === "" || block.lang === "html";
}

function shouldSkipEmptyLine(line) {
  return line.trim() === "";
}

function alreadyTemplateMarked(line) {
  return /\bdata-mark-r\d+\s*=/.test(line);
}

function appendTemplateDataMarkSafely(lines, blocks, lineNo, line, payload) {
  const block = getBlockByLine(blocks, lineNo);

  if (block.type !== "template") return line;

  const state = getTemplateTagStateAtLine(lines, block, lineNo);

  if (state.startsInsideAnyTag) {
    if (!state.startsInsideOpenTag) return line;

    return tryInsertDataMarkAtCurrentLineTagEnd(lines, block, lineNo, line, payload);
  }

  if (state.endsInsideAnyTag) {
    return line;
  }

  const inserted = tryInsertDataMarkIntoTemplateLine(lines, blocks, lineNo, line, payload);

  if (inserted.changed) return inserted.line;

  return line;
}

function getTemplateTagStateAtLine(lines, block, lineNo) {
  const state = createTemplateScanState();

  for (let i = block.startLine; i < lineNo; i++) {
    scanTemplateLineForState(lines[i - 1], state);
  }

  const before = cloneTemplateScanState(state);

  scanTemplateLineForState(lines[lineNo - 1], state);

  const after = cloneTemplateScanState(state);

  return {
    startsInsideAnyTag: Boolean(before.inTag),
    startsInsideOpenTag: Boolean(
      before.inTag &&
        !before.inClosingTag &&
        isTemplateAttrEligibleTag(before.tagName)
    ),
    startsTagName: before.tagName,
    endsInsideAnyTag: Boolean(after.inTag),
    endsInsideOpenTag: Boolean(
      after.inTag &&
        !after.inClosingTag &&
        isTemplateAttrEligibleTag(after.tagName)
    ),
    endsTagName: after.tagName
  };
}

function createTemplateScanState() {
  return {
    inTag: false,
    inClosingTag: false,
    tagName: null,
    inQuote: null,
    inMustache: false,
    inHtmlComment: false
  };
}

function cloneTemplateScanState(state) {
  return {
    inTag: state.inTag,
    inClosingTag: state.inClosingTag,
    tagName: state.tagName,
    inQuote: state.inQuote,
    inMustache: state.inMustache,
    inHtmlComment: state.inHtmlComment
  };
}

function scanTemplateLineForState(line, state) {
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (state.inHtmlComment) {
      if (ch === "-" && next === "-" && line[i + 2] === ">") {
        state.inHtmlComment = false;
        i += 3;
        continue;
      }

      i++;
      continue;
    }

    if (state.inMustache) {
      if (ch === "}" && next === "}") {
        state.inMustache = false;
        i += 2;
        continue;
      }

      i++;
      continue;
    }

    if (state.inQuote) {
      if (ch === state.inQuote) state.inQuote = null;
      i++;
      continue;
    }

    if (!state.inTag) {
      if (ch === "<" && next === "!" && line[i + 2] === "-" && line[i + 3] === "-") {
        state.inHtmlComment = true;
        i += 4;
        continue;
      }

      if (ch === "{" && next === "{") {
        state.inMustache = true;
        i += 2;
        continue;
      }

      const tagStart = parseTemplateTagStartAt(line, i);

      if (tagStart) {
        state.inTag = true;
        state.inClosingTag = tagStart.closing;
        state.tagName = tagStart.name;
        i = tagStart.nameEnd;
        continue;
      }

      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      state.inQuote = ch;
      i++;
      continue;
    }

    if (ch === ">") {
      state.inTag = false;
      state.inClosingTag = false;
      state.tagName = null;
      i++;
      continue;
    }

    i++;
  }

  return state;
}

function parseTemplateTagStartAt(line, index) {
  if (line[index] !== "<") return null;

  let i = index + 1;
  let closing = false;

  if (line[i] === "/") {
    closing = true;
    i++;
  }

  if (!line[i] || !/[A-Za-z]/.test(line[i])) return null;

  const nameStart = i;

  while (i < line.length && /[A-Za-z0-9:_\-.]/.test(line[i])) {
    i++;
  }

  return {
    closing,
    name: line.slice(nameStart, i).toLowerCase(),
    nameEnd: i
  };
}

function isTemplateAttrEligibleTag(tagName) {
  if (!tagName) return false;

  if (tagName === "template") return false;
  if (tagName === "script") return false;
  if (tagName === "style") return false;
  if (tagName === "textarea") return false;
  if (tagName === "title") return false;

  return true;
}

function tryInsertDataMarkAtCurrentLineTagEnd(lines, block, lineNo, line, payload) {
  const stateBefore = createTemplateScanState();

  for (let i = block.startLine; i < lineNo; i++) {
    scanTemplateLineForState(lines[i - 1], stateBefore);
  }

  if (
    !stateBefore.inTag ||
    stateBefore.inClosingTag ||
    !isTemplateAttrEligibleTag(stateBefore.tagName)
  ) {
    return line;
  }

  const tagEndIndex = findTagEndInLine(line, 0);

  if (tagEndIndex < 0) {
    return line;
  }

  const tagRange = findCurrentMultilineTemplateTagRange(lines, block, lineNo);

  if (tagRange && hasExistingDataMarkInLineRange(lines, tagRange.startLine, tagRange.endLine)) {
    return line;
  }

  const attr = buildDataMarkAttr(payload);

  return insertAttrBeforeTagEnd(line, tagEndIndex, attr);
}

function findCurrentMultilineTemplateTagRange(lines, block, lineNo) {
  const state = createTemplateScanState();
  let currentTagStartLine = null;

  for (let i = block.startLine; i <= lineNo; i++) {
    const before = cloneTemplateScanState(state);

    if (!before.inTag) {
      const startInfo = findFirstTemplateTagStartInfo(lines[i - 1]);

      if (
        startInfo &&
        !startInfo.closing &&
        isTemplateAttrEligibleTag(startInfo.name)
      ) {
        currentTagStartLine = i;
      }
    }

    scanTemplateLineForState(lines[i - 1], state);

    if (i === lineNo) {
      if (before.inTag) {
        return {
          startLine: currentTagStartLine || block.startLine,
          endLine: lineNo
        };
      }

      if (!state.inTag && currentTagStartLine === lineNo) {
        return {
          startLine: lineNo,
          endLine: lineNo
        };
      }
    }

    if (!state.inTag) {
      currentTagStartLine = null;
    }
  }

  return null;
}

function findFirstTemplateTagStartInfo(line) {
  const state = {
    inHtmlComment: false,
    inMustache: false
  };

  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (state.inHtmlComment) {
      if (ch === "-" && next === "-" && line[i + 2] === ">") {
        state.inHtmlComment = false;
        i += 3;
        continue;
      }

      i++;
      continue;
    }

    if (state.inMustache) {
      if (ch === "}" && next === "}") {
        state.inMustache = false;
        i += 2;
        continue;
      }

      i++;
      continue;
    }

    if (ch === "<" && next === "!" && line[i + 2] === "-" && line[i + 3] === "-") {
      state.inHtmlComment = true;
      i += 4;
      continue;
    }

    if (ch === "{" && next === "{") {
      state.inMustache = true;
      i += 2;
      continue;
    }

    const tagStart = parseTemplateTagStartAt(line, i);

    if (tagStart) {
      return tagStart;
    }

    i++;
  }

  return null;
}

function tryInsertDataMarkIntoTemplateLine(lines, blocks, lineNo, line, payload) {
  const block = getBlockByLine(blocks, lineNo);
  const tag = findFirstEligibleCompleteOpenTag(line);

  if (!tag) {
    return { changed: false, line };
  }

  const tagRange = {
    startLine: lineNo,
    endLine: lineNo
  };

  if (hasExistingDataMarkInLineRange(lines, tagRange.startLine, tagRange.endLine)) {
    return { changed: false, line };
  }

  const attr = buildDataMarkAttr(payload);
  const newLine = insertAttrBeforeTagEnd(line, tag.endIndex, attr);

  return {
    changed: newLine !== line,
    line: newLine
  };
}

function findFirstEligibleCompleteOpenTag(line) {
  const state = {
    inHtmlComment: false,
    inMustache: false
  };

  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (state.inHtmlComment) {
      if (ch === "-" && next === "-" && line[i + 2] === ">") {
        state.inHtmlComment = false;
        i += 3;
        continue;
      }

      i++;
      continue;
    }

    if (state.inMustache) {
      if (ch === "}" && next === "}") {
        state.inMustache = false;
        i += 2;
        continue;
      }

      i++;
      continue;
    }

    if (ch === "<" && next === "!" && line[i + 2] === "-" && line[i + 3] === "-") {
      state.inHtmlComment = true;
      i += 4;
      continue;
    }

    if (ch === "{" && next === "{") {
      state.inMustache = true;
      i += 2;
      continue;
    }

    const tagStart = parseTemplateTagStartAt(line, i);

    if (!tagStart || tagStart.closing) {
      i++;
      continue;
    }

    if (!isTemplateAttrEligibleTag(tagStart.name)) {
      i++;
      continue;
    }

    const endIndex = findTagEndInLine(line, tagStart.nameEnd);

    if (endIndex < 0) {
      return null;
    }

    return {
      startIndex: i,
      endIndex,
      tagName: tagStart.name
    };
  }

  return null;
}

function findTagEndInLine(line, startIndex) {
  let inQuote = null;

  for (let i = startIndex; i < line.length; i++) {
    const ch = line[i];

    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (ch === ">") return i;
  }

  return -1;
}

function insertAttrBeforeTagEnd(line, tagEndIndex, attr) {
  const before = line.slice(0, tagEndIndex);
  const after = line.slice(tagEndIndex);

  if (/\/\s*$/.test(before)) {
    return before.replace(/\s*\/\s*$/, ` ${attr} /`) + after;
  }

  if (before.trim() === "") {
    return `${before}${attr}${after}`;
  }

  return before.replace(/\s*$/, "") + ` ${attr}` + after;
}

function buildDataMarkAttr(payload) {
  const attrName = `data-mark-r${randomNumber8()}`;
  const attrValue = escapeHtmlAttr(payload);
  return `${attrName}="${attrValue}"`;
}

function hasExistingDataMarkInLineRange(lines, startLine, endLine) {
  const start = clamp(startLine, 1, lines.length);
  const end = clamp(endLine, 1, lines.length);

  for (let lineNo = start; lineNo <= end; lineNo++) {
    if (/\bdata-mark-r\d+\s*=/.test(lines[lineNo - 1])) {
      return true;
    }
  }

  return false;
}

function collectTemplateRawTextLines(lines, blocks) {
  const unsafe = new Set();
  const rawTagNames = ["script", "style", "textarea", "title"];

  for (const block of blocks.filter(b => b.type === "template" && isSupportedTemplateBlock(b))) {
    let rawTag = null;

    for (let lineNo = block.startLine; lineNo <= block.endLine; lineNo++) {
      const line = lines[lineNo - 1];

      if (rawTag) {
        unsafe.add(lineNo);

        const closeRe = new RegExp(`<\\s*\\/\\s*${escapeRegExp(rawTag)}\\s*>`, "i");

        if (closeRe.test(line)) {
          rawTag = null;
        }

        continue;
      }

      for (const tagName of rawTagNames) {
        const openRe = new RegExp(`<\\s*${escapeRegExp(tagName)}\\b`, "i");

        if (openRe.test(line)) {
          unsafe.add(lineNo);

          const closeRe = new RegExp(`<\\s*\\/\\s*${escapeRegExp(tagName)}\\s*>`, "i");

          if (!closeRe.test(line)) {
            rawTag = tagName;
          }

          break;
        }
      }
    }
  }

  return unsafe;
}

function getTemplateSkipReason(lines, blocks, lineNo, line, templateRawTextLines, rootTagLines) {
  if (shouldSkipEmptyLine(line)) return "空行";
  if (rootTagLines.has(lineNo)) return "SFC 根块标签";
  if (templateRawTextLines.has(lineNo)) return "raw text 标签内容";
  if (alreadyTemplateMarked(line)) return "已有 data-mark";

  const block = getBlockByLine(blocks, lineNo);

  if (block.type !== "template") return "非 template 块";
  if (!isSupportedTemplateBlock(block)) return "不支持的 template lang 或 src";

  const state = getTemplateTagStateAtLine(lines, block, lineNo);

  if (state.startsInsideAnyTag && !state.startsInsideOpenTag) return "处于关闭标签或不支持标签内部";
  if (state.startsInsideOpenTag && findTagEndInLine(line, 0) < 0) return "多行开始标签中间行，等待 > 所在行";
  if (state.endsInsideAnyTag) return "多行开始标签起始/中间行，等待 > 所在行";

  if (/^\s*<\s*\//.test(line)) return "关闭标签";
  if (/^\s*<!--/.test(line)) return "HTML 注释";
  if (/^\s*\{\{/.test(line)) return "插值文本";

  return "没有可安全加属性的开始标签";
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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