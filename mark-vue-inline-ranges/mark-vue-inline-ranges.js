#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("用法: node mark-vue-inline-ranges.js ranges.json");
  process.exit(1);
}

const rangeMap = JSON.parse(fs.readFileSync(inputFile, "utf8"));

for (const [filePath, rawRanges] of Object.entries(rangeMap)) {
  processVueFile(filePath, rawRanges);
}

function processVueFile(filePath, rawRanges) {
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

  const ranges = rawRanges
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
  const templateUnsafeLines = collectTemplateUnsafeLines(lines, blocks);
  const scriptUnsafeLines = collectScriptUnsafeLines(lines, blocks);
  const styleUnsafeLines = collectStyleUnsafeLines(lines, blocks);
  const lineMarks = new Map();

  for (const range of ranges) {
    const startLine = clamp(range.start, 1, lines.length);
    const endLine = clamp(range.end, 1, lines.length);

    const fileName = path.basename(filePath);
    const rangeText = `${startLine}-${endLine}`;

    /**
     * 一个 range 一个随机数字。
     * 同一个 range 内所有行使用同一个 random。
     */
    const rangeRandom = randomNumber8();

    /**
     * 标记内容不要有空格。
     */
    const payload = `${fileName}|range:${rangeText}|random:${rangeRandom}`;

    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      const line = lines[lineNo - 1];

      if (shouldSkipEmptyLine(line)) {
        continue;
      }

      /**
       * 只跳过 SFC 根块标签行。
       * 不跳过缩进的嵌套 <template v-if>。
       */
      if (isVueRootBlockTagLine(line)) {
        continue;
      }

      /**
       * 修复点(重叠 range):
       * 同一行只允许被第一个覆盖它的 range 标记，
       * 避免多个 range 重叠时在同一行叠加多条注释。
       */
      if (lineMarks.has(lineNo)) {
        continue;
      }

      const block = getBlockByLine(blocks, lineNo);

      /**
       * 语法安全策略：
       * template 里处于多行属性值/多行插值/多行注释的行不追加标记。
       * script 里处于多行字符串/多行注释的行不追加 JS 注释。
       * style 里处于多行注释的行不追加 CSS 注释。
       */
      if (block.type === "template" && templateUnsafeLines.has(lineNo)) {
        continue;
      }

      if (block.type === "script" && scriptUnsafeLines.has(lineNo)) {
        continue;
      }

      if (block.type === "style" && styleUnsafeLines.has(lineNo)) {
        continue;
      }

      lineMarks.set(lineNo, [
        {
          block,
          payload
        }
      ]);
    }
  }

  /**
   * 从前往后改行即可，因为不新增/删除行，只改当前行内容。
   */
  for (const [lineNo, marks] of lineMarks.entries()) {
    const index = lineNo - 1;
    let line = lines[index];

    if (alreadyMarked(line)) {
      continue;
    }

    for (const mark of marks) {
      const block = mark.block;
      const payload = mark.payload;

      if (block.type === "template") {
        const templateState = getTemplateOpenTagState(lines, blocks, lineNo);

        if (templateState.insideOpenTag) {
          line = appendTemplateDataMark(line, payload);
        } else {
          line = appendCommentWithSpace(line, `<!--${payload}-->`);
        }
      } else if (block.type === "script") {
        line = appendCommentWithSpace(line, `//${payload}`);
      } else if (block.type === "style") {
        line = appendCommentWithSpace(line, `/*${payload}*/`);
      } else {
        /**
         * Vue 顶层未知区域，默认使用 HTML 注释。
         */
        line = appendCommentWithSpace(line, `<!--${payload}-->`);
      }
    }

    lines[index] = line;
  }

  fs.writeFileSync(filePath, lines.join(newline), "utf8");
  console.log(`[完成] ${filePath}`);
}

function parseRange(item) {
  if (Array.isArray(item) && item.length >= 2) {
    return [Number(item[0]), Number(item[1])];
  }

  if (item && typeof item === "object") {
    const start = item.start ?? item.begin ?? item.from;
    const end = item.end ?? item.to;
    return [Number(start), Number(end)];
  }

  if (typeof item === "string") {
    /**
     * 兼容：
     * (23,49)
     * （23，49）
     * [23,49]
     * 【23，49】
     * 23,49
     */
    const normalized = item
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/，/g, ",")
      .replace(/【/g, "[")
      .replace(/】/g, "]");

    const match = normalized.match(/[\[(]?\s*(\d+)\s*,\s*(\d+)\s*[\])]?/);

    if (match) {
      return [Number(match[1]), Number(match[2])];
    }
  }

  console.warn(`[警告] 无法解析 range: ${JSON.stringify(item)}`);
  return null;
}

/**
 * 只把“行首顶格”的 template/script/style 当作 SFC 根块边界。
 * 嵌套的 <template v-if> / <template #slot> 都有缩进，不会被误判为根块。
 */
function detectVueBlocks(lines) {
  const blocks = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    const openMatch = line.match(/^<\s*(template|script|style)\b[^>]*>/i);
    const closeMatch = line.match(/^<\s*\/\s*(template|script|style)\s*>/i);

    if (openMatch && !current) {
      current = {
        type: openMatch[1].toLowerCase(),
        openLine: lineNo,
        startLine: lineNo + 1,
        endLine: lines.length,
        closeLine: null
      };
    } else if (
      closeMatch &&
      current &&
      closeMatch[1].toLowerCase() === current.type
    ) {
      current.endLine = lineNo - 1;
      current.closeLine = lineNo;
      blocks.push(current);
      current = null;
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

function getBlockByLine(blocks, lineNo) {
  const block = blocks.find(b => lineNo >= b.startLine && lineNo <= b.endLine);

  if (block) {
    return block;
  }

  return {
    type: "unknown",
    startLine: 1,
    endLine: Number.MAX_SAFE_INTEGER
  };
}

function shouldSkipEmptyLine(line) {
  return line.trim() === "";
}

/**
 * 只跳过顶格 SFC 根块标签：
 *
 * <template>
 * </template>
 * <script setup>
 * </script>
 * <style scoped>
 * </style>
 *
 * 不使用 trim，避免跳过缩进的嵌套 <template v-if>。
 */
function isVueRootBlockTagLine(line) {
  return /^<\s*\/?\s*(template|script|style)\b[^>]*>\s*$/i.test(line);
}

function alreadyMarked(line) {
  /**
   * 防止重复运行脚本后重复追加。
   * 兼容旧格式：
   * Home.vue range:23-49 random:12345678
   *
   * 和新格式：
   * Home.vue|range:23-49|random:12345678
   */
  return /range:\d+-\d+(?:\s+|\|)random:\d+/.test(line) || /data-mark-r\d+=/.test(line);
}

/**
 * 判断某行是否处于 template 的多行开始标签内部。
 */
function getTemplateOpenTagState(lines, blocks, lineNo) {
  const block = getBlockByLine(blocks, lineNo);

  if (block.type !== "template") {
    return {
      insideOpenTag: false
    };
  }

  let insideOpenTag = false;
  let inQuote = null;
  let inMustache = false;

  for (let i = block.startLine; i <= lineNo; i++) {
    const rawLine = lines[i - 1];
    const line = stripHtmlComment(rawLine);

    const result = scanTemplateLine(line, {
      inQuote,
      inMustache
    });

    inQuote = result.inQuote;
    inMustache = result.inMustache;

    for (const token of result.tokens) {
      if (token.type === "openTagStart") {
        insideOpenTag = true;
      }

      if (token.type === "tagEnd") {
        insideOpenTag = false;
      }
    }
  }

  const currentLine = stripHtmlComment(lines[lineNo - 1]);

  /**
   * 单行完整标签：
   * <div class="box"></div>
   *
   * 这种不算多行开始标签内部，可以直接行尾加 HTML 注释。
   */
  if (isSingleLineCompleteTemplateTag(currentLine)) {
    return {
      insideOpenTag: false
    };
  }

  return {
    insideOpenTag
  };
}

/**
 * template 扫描：
 * - 只把 <字母 或 <大写字母 当成标签开始
 * - 忽略 HTML 注释
 * - 忽略引号中的 < 和 >
 * - 粗略忽略 {{ }} mustache 里的内容，避免 {{ a < b }} 误判
 */
function scanTemplateLine(line, state = {}) {
  const tokens = [];

  let inQuote = state.inQuote || null;
  let inMustache = Boolean(state.inMustache);

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (!inQuote && ch === "{" && next === "{") {
      inMustache = true;
      i++;
      continue;
    }

    if (inMustache) {
      if (ch === "}" && next === "}") {
        inMustache = false;
        i++;
      }
      continue;
    }

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (ch === "<") {
      if (next && /[a-zA-Z]/.test(next)) {
        tokens.push({
          type: "openTagStart"
        });
      }
    }

    if (ch === ">") {
      tokens.push({
        type: "tagEnd"
      });
    }
  }

  return {
    tokens,
    inQuote,
    inMustache
  };
}

function isSingleLineCompleteTemplateTag(line) {
  const trimmed = line.trim();

  if (!trimmed.includes("<") || !trimmed.includes(">")) {
    return false;
  }

  /**
   * 单行开始并闭合：
   * <div></div>
   * <input />
   * <Comp :a="b" />
   */
  if (/^<[^!/\s][^>]*>.*<\/[^>]+>\s*$/.test(trimmed)) {
    return true;
  }

  if (/^<[^!/\s][^>]*\/>\s*$/.test(trimmed)) {
    return true;
  }

  /**
   * 单行普通开始标签：
   * <div class="box">
   *
   * 行尾加 HTML 注释是语法安全的。
   */
  if (/^<[^!/\s][^>]*>\s*$/.test(trimmed)) {
    return true;
  }

  return false;
}

function appendTemplateDataMark(line, payload) {
  const attrName = `data-mark-r${randomNumber8()}`;
  const attrValue = escapeHtmlAttr(payload);
  const attr = `${attrName}="${attrValue}"`;

  /**
   * 保留行尾空白。
   */
  const trailingWhitespaceMatch = line.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
  const body = trailingWhitespace ? line.slice(0, -trailingWhitespace.length) : line;

  const trimmed = body.trim();

  /**
   * 情况 1：
   *
   * >
   *
   * 变成：
   *
   * data-mark-r123="xxx">
   */
  if (trimmed === ">") {
    const indent = body.match(/^\s*/)[0];
    return `${indent}${attr}>${trailingWhitespace}`;
  }

  /**
   * 情况 2：
   *
   * />
   *
   * 变成：
   *
   * data-mark-r123="xxx"/>
   */
  if (trimmed === "/>") {
    const indent = body.match(/^\s*/)[0];
    return `${indent}${attr}/>${trailingWhitespace}`;
  }

  /**
   * 情况 3：
   *
   * :title="name">
   *
   * 变成：
   *
   * :title="name" data-mark-r123="xxx">
   *
   * 注意：属性之间必须有一个空格。
   *
   * 修复点：这里必须判断“行尾是否为标签闭合符号 > 或 />”，
   * 而不是“行内任意位置是否含 >”。
   * 否则像下面这种含 > 但行尾是引号的行：
   *   @click="() => n++"
   *   :title="n > 0 ? 'a' : 'b'"
   * 会因替换正则 /…>\s*$/ 匹配不到行尾的 >，
   * 导致 replace 原样返回、标记被静默丢弃。
   */
  if (/\/?>\s*$/.test(body)) {
    return body.replace(/\s*(\/?)>\s*$/, ` ${attr}$1>`) + trailingWhitespace;
  }

  /**
   * 情况 4：
   *
   * <div
   * class="box"
   * @click="() => n++"
   * :title="n > 0 ? 'a' : 'b'"
   *
   * 行尾不是标签闭合符号（含上面这些含 > 但以引号结尾的属性行），
   * 直接在行尾追加属性，前面必须带一个空格。
   * 对仍处于打开状态的多行标签来说，这同样是合法的。
   */
  return `${body} ${attr}${trailingWhitespace}`;
}

function appendCommentWithSpace(line, comment) {
  const trailingWhitespaceMatch = line.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
  const body = trailingWhitespace ? line.slice(0, -trailingWhitespace.length) : line;

  if (body.trim() === "") {
    return line;
  }

  /**
   * 这里保留 body 和 comment 之间的一个空格。
   * payload 自身没有空格。
   *
   * 这样比 const a = 1//xxx 更稳：
   * const a = 1 //xxx
   */
  return `${body} ${comment}${trailingWhitespace}`;
}

function stripHtmlComment(line) {
  return line.replace(/<!--[\s\S]*?-->/g, "");
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 收集 template 中不适合追加标记的行。
 *
 * 目标是语法安全，避免把 data 属性或注释插进：
 * - 多行属性值内部（如多行 :class="{...}" / :style）
 * - 多行 {{ }} 插值内部
 * - 多行 <!-- --> HTML 注释内部
 *
 * 判定标准：该行“行首仍处于上述状态”或“行尾仍处于上述状态”，
 * 即它是某个跨行结构的中间/边界行，则标记为 unsafe 跳过。
 */
function collectTemplateUnsafeLines(lines, blocks) {
  const unsafe = new Set();

  for (const block of blocks.filter(b => b.type === "template")) {
    let inQuote = null;       // 标签内属性值引号: " 或 '
    let inMustache = false;   // {{ }}
    let inHtmlComment = false; // <!-- -->
    let inTag = false;        // 是否处于 < ... > 标签内部，用于判断引号是不是属性值

    for (let lineNo = block.startLine; lineNo <= block.endLine; lineNo++) {
      const line = lines[lineNo - 1];
      const startsUnsafe = Boolean(inQuote || inMustache || inHtmlComment);

      let i = 0;

      while (i < line.length) {
        const ch = line[i];
        const next = line[i + 1];

        if (inHtmlComment) {
          if (ch === "-" && next === "-" && line[i + 2] === ">") {
            inHtmlComment = false;
            i += 3;
            continue;
          }
          i++;
          continue;
        }

        if (inQuote) {
          if (ch === inQuote) {
            inQuote = null;
          }
          i++;
          continue;
        }

        if (inMustache) {
          if (ch === "}" && next === "}") {
            inMustache = false;
            i += 2;
            continue;
          }
          i++;
          continue;
        }

        // 普通状态
        if (
          ch === "<" &&
          next === "!" &&
          line[i + 2] === "-" &&
          line[i + 3] === "-"
        ) {
          inHtmlComment = true;
          i += 4;
          continue;
        }

        if (ch === "{" && next === "{") {
          inMustache = true;
          i += 2;
          continue;
        }

        if (ch === "<" && next && /[a-zA-Z/]/.test(next)) {
          inTag = true;
          i++;
          continue;
        }

        if (ch === ">") {
          inTag = false;
          i++;
          continue;
        }

        if (inTag && (ch === '"' || ch === "'")) {
          inQuote = ch;
          i++;
          continue;
        }

        i++;
      }

      const endsUnsafe = Boolean(inQuote || inMustache || inHtmlComment);

      if (startsUnsafe || endsUnsafe) {
        unsafe.add(lineNo);
      }
    }
  }

  return unsafe;
}

/**
 * 收集 script 中不适合追加 // 注释的行。
 *
 * 目标不是完整 JS parser，只做语法安全保守处理：
 * - 跳过多行块注释内部
 * - 跳过模板字符串内部
 * - 跳过单/双引号跨行状态
 *
 * 这样可以避免把 //xxx 加进字符串内容导致语法或语义问题。
 */
function collectScriptUnsafeLines(lines, blocks) {
  const unsafe = new Set();

  for (const block of blocks.filter(b => b.type === "script")) {
    let inBlockComment = false;
    let inString = null;
    let escapeNext = false;

    for (let lineNo = block.startLine; lineNo <= block.endLine; lineNo++) {
      const line = lines[lineNo - 1];

      const startsUnsafe = inBlockComment || inString;

      let i = 0;

      while (i < line.length) {
        const ch = line[i];
        const next = line[i + 1];

        if (escapeNext) {
          escapeNext = false;
          i++;
          continue;
        }

        if (inString) {
          if (ch === "\\") {
            escapeNext = true;
            i++;
            continue;
          }

          if (ch === inString) {
            inString = null;
          }

          i++;
          continue;
        }

        if (inBlockComment) {
          if (ch === "*" && next === "/") {
            inBlockComment = false;
            i += 2;
            continue;
          }

          i++;
          continue;
        }

        if (ch === "/" && next === "/") {
          break;
        }

        if (ch === "/" && next === "*") {
          inBlockComment = true;
          i += 2;
          continue;
        }

        if (ch === '"' || ch === "'" || ch === "`") {
          inString = ch;
          i++;
          continue;
        }

        i++;
      }

      /**
       * 只把结束后仍处于危险状态、或开始时已处于危险状态的行标为 unsafe。
       * 行内已闭合的普通字符串不影响行尾追加 // 注释。
       */
      if (startsUnsafe || inBlockComment || inString) {
        unsafe.add(lineNo);
      }
    }
  }

  return unsafe;
}

/**
 * 收集 style 中不适合追加 CSS 块注释的行。
 *
 * 主要避开已有多行注释内部，避免 /* 嵌套导致 CSS 解析问题。
 */
function collectStyleUnsafeLines(lines, blocks) {
  const unsafe = new Set();

  for (const block of blocks.filter(b => b.type === "style")) {
    let inBlockComment = false;

    for (let lineNo = block.startLine; lineNo <= block.endLine; lineNo++) {
      const line = lines[lineNo - 1];
      const startsUnsafe = inBlockComment;

      let i = 0;

      while (i < line.length) {
        const ch = line[i];
        const next = line[i + 1];

        if (inBlockComment) {
          if (ch === "*" && next === "/") {
            inBlockComment = false;
            i += 2;
            continue;
          }

          i++;
          continue;
        }

        if (ch === "/" && next === "*") {
          inBlockComment = true;
          i += 2;
          continue;
        }

        i++;
      }

      if (startsUnsafe || inBlockComment) {
        unsafe.add(lineNo);
      }
    }
  }

  return unsafe;
}

function randomNumber8() {
  return crypto.randomInt(10000000, 99999999);
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}
