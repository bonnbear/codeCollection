const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { parentPort, workerData } = require('node:worker_threads');

const tar = require('tar-stream');
const lz4js = require('lz4js');

let canceled = false;
const activeStreams = new Set();

function makeCanceledError() {
  const err = new Error('__JOB_CANCELED__');
  err.code = 'JOB_CANCELED';
  return err;
}

function isCanceledError(err) {
  return canceled || err?.code === 'JOB_CANCELED' || err?.message === '__JOB_CANCELED__';
}

function throwIfCanceled() {
  if (canceled) {
    throw makeCanceledError();
  }
}

function track(stream) {
  activeStreams.add(stream);
  const cleanup = () => activeStreams.delete(stream);
  stream.once('close', cleanup);
  stream.once('end', cleanup);
  stream.once('error', cleanup);
  return stream;
}

function safeDestroy(stream, err) {
  if (stream && typeof stream.destroy === 'function' && !stream.destroyed) {
    stream.destroy(err);
  }
}

async function safeRemoveFile(filePath) {
  try {
    await fsp.rm(filePath, { force: true });
  } catch {
    // ignore
  }
}

parentPort.on('message', (msg) => {
  if (msg && msg.type === 'cancel') {
    canceled = true;
    const err = makeCanceledError();
    for (const stream of Array.from(activeStreams)) {
      safeDestroy(stream, err);
    }
  }
});

// ---------------------------------------------------------------------------
// LZ4 Frame Transform Streams (using lz4js pure JS)
// ---------------------------------------------------------------------------

/**
 * Buffering LZ4 encoder Transform: collects all input, then compresses
 * as standard LZ4 frame on flush. This works well for tar archives
 * where we need the full tar stream before compressing.
 */
class LZ4EncodeTransform extends Transform {
  constructor(options) {
    super(options);
    this._chunks = [];
    this._totalLen = 0;
  }

  _transform(chunk, _encoding, callback) {
    this._chunks.push(chunk);
    this._totalLen += chunk.length;
    callback();
  }

  _flush(callback) {
    try {
      const input = Buffer.concat(this._chunks, this._totalLen);
      this._chunks = [];
      const compressed = lz4js.compress(input);
      this.push(Buffer.from(compressed));
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

/**
 * Buffering LZ4 decoder Transform: collects all compressed input,
 * then decompresses the LZ4 frame on flush.
 */
class LZ4DecodeTransform extends Transform {
  constructor(options) {
    super(options);
    this._chunks = [];
    this._totalLen = 0;
  }

  _transform(chunk, _encoding, callback) {
    this._chunks.push(chunk);
    this._totalLen += chunk.length;
    callback();
  }

  _flush(callback) {
    try {
      const input = Buffer.concat(this._chunks, this._totalLen);
      this._chunks = [];
      const decompressed = lz4js.decompress(input);
      this.push(Buffer.from(decompressed));
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

// ---------------------------------------------------------------------------
// Progress Reporter
// ---------------------------------------------------------------------------

function createReporter(operation) {
  let totalBytes = 0;
  let processedBytes = 0;
  let currentFile = '';
  let lastTs = Date.now();
  let lastBytes = 0;
  let speedBps = 0;

  function emitProgress(force = false) {
    const now = Date.now();
    if (!force && now - lastTs < 120) return;

    const dt = Math.max((now - lastTs) / 1000, 0.001);
    const db = processedBytes - lastBytes;
    const instant = db / dt;
    speedBps = speedBps === 0 ? instant : speedBps * 0.75 + instant * 0.25;

    lastTs = now;
    lastBytes = processedBytes;

    const percent =
      totalBytes > 0
        ? Math.min(100, (processedBytes / totalBytes) * 100)
        : force
          ? 100
          : 0;

    const etaSec =
      speedBps > 1 && totalBytes > processedBytes
        ? (totalBytes - processedBytes) / speedBps
        : null;

    parentPort.postMessage({
      type: 'progress',
      operation,
      processedBytes,
      totalBytes,
      percent,
      speedBps,
      etaSec,
      currentFile
    });
  }

  return {
    setTotalBytes(bytes) {
      totalBytes = Math.max(0, Number(bytes) || 0);
      emitProgress(true);
    },
    addBytes(bytes) {
      processedBytes += Number(bytes) || 0;
      emitProgress(false);
    },
    setCurrentFile(file) {
      currentFile = file || '';
      emitProgress(false);
    },
    state(state, message, extra = {}) {
      parentPort.postMessage({
        type: 'state',
        operation,
        state,
        message,
        ...extra
      });
    },
    done(extra = {}) {
      processedBytes = totalBytes;
      emitProgress(true);
      parentPort.postMessage({
        type: 'done',
        operation,
        ...extra
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Tar Helpers
// ---------------------------------------------------------------------------

function normalizeTarPath(input) {
  return input.replace(/\\/g, '/');
}

function ensureDirTarPath(input) {
  const normalized = normalizeTarPath(input).replace(/\/+$/g, '');
  return `${normalized}/`;
}

function uniqueName(name, used) {
  const base = (name && name.trim()) || 'item';
  let candidate = base;
  let i = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

async function walkDirectory(absDir, relDir, entries, counters, excludeAbs) {
  throwIfCanceled();
  const list = await fsp.readdir(absDir, { withFileTypes: true });

  for (const item of list) {
    throwIfCanceled();

    const childAbs = path.join(absDir, item.name);
    if (excludeAbs && path.resolve(childAbs) === excludeAbs) continue;

    const stat = await fsp.lstat(childAbs);
    if (stat.isSymbolicLink()) continue;

    const childRel = path.posix.join(normalizeTarPath(relDir), item.name);

    if (stat.isDirectory()) {
      entries.push({
        type: 'directory',
        absPath: childAbs,
        relPath: ensureDirTarPath(childRel),
        mode: stat.mode,
        mtime: stat.mtime
      });
      counters.dirCount += 1;
      await walkDirectory(childAbs, childRel, entries, counters, excludeAbs);
    } else if (stat.isFile()) {
      entries.push({
        type: 'file',
        absPath: childAbs,
        relPath: normalizeTarPath(childRel),
        size: stat.size,
        mode: stat.mode,
        mtime: stat.mtime
      });
      counters.fileCount += 1;
      counters.totalBytes += stat.size;
    }
  }
}

async function buildEntries(sources, outputPath) {
  const entries = [];
  const counters = {
    totalBytes: 0,
    fileCount: 0,
    dirCount: 0
  };

  const usedRootNames = new Set();
  const excludeAbs = outputPath ? path.resolve(outputPath) : null;

  for (const source of sources) {
    throwIfCanceled();

    const abs = path.resolve(source);
    if (excludeAbs && abs === excludeAbs) continue;

    const stat = await fsp.lstat(abs);
    if (stat.isSymbolicLink()) continue;

    const rootName = uniqueName(path.basename(abs), usedRootNames);

    if (stat.isFile()) {
      entries.push({
        type: 'file',
        absPath: abs,
        relPath: normalizeTarPath(rootName),
        size: stat.size,
        mode: stat.mode,
        mtime: stat.mtime
      });
      counters.fileCount += 1;
      counters.totalBytes += stat.size;
    } else if (stat.isDirectory()) {
      entries.push({
        type: 'directory',
        absPath: abs,
        relPath: ensureDirTarPath(rootName),
        mode: stat.mode,
        mtime: stat.mtime
      });
      counters.dirCount += 1;
      await walkDirectory(abs, rootName, entries, counters, excludeAbs);
    }
  }

  return { entries, ...counters };
}

function writeDirectoryEntry(pack, entry) {
  return new Promise((resolve, reject) => {
    pack.entry(
      {
        name: entry.relPath,
        type: 'directory',
        mode: entry.mode,
        mtime: entry.mtime
      },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function writeFileEntry(pack, entry, reporter) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };

    let tarEntry;
    try {
      tarEntry = track(
        pack.entry(
          {
            name: entry.relPath,
            type: 'file',
            size: entry.size,
            mode: entry.mode,
            mtime: entry.mtime
          },
          (err) => finish(err)
        )
      );
    } catch (err) {
      finish(err);
      return;
    }

    const rs = track(
      fs.createReadStream(entry.absPath, {
        highWaterMark: 1024 * 1024
      })
    );

    rs.on('data', (chunk) => {
      reporter.addBytes(chunk.length);
      if (canceled) {
        const err = makeCanceledError();
        safeDestroy(rs, err);
        safeDestroy(tarEntry, err);
      }
    });

    rs.on('error', finish);
    tarEntry.on('error', finish);
    rs.pipe(tarEntry);
  });
}

// ---------------------------------------------------------------------------
// Compress
// ---------------------------------------------------------------------------

async function compressArchive({ sources, outputPath, preset = 'max' }) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('没有可压缩的输入文件或目录');
  }
  if (!outputPath) {
    throw new Error('未指定输出文件路径');
  }

  const reporter = createReporter('compress');
  reporter.state('scanning', '正在扫描输入文件...');

  const { entries, totalBytes, fileCount, dirCount } = await buildEntries(sources, outputPath);

  reporter.setTotalBytes(totalBytes);
  reporter.state('running', `开始压缩：${fileCount} 个文件，${dirCount} 个目录`, {
    fileCount,
    dirCount,
    totalBytes
  });

  const pack = track(tar.pack());
  const encoder = track(new LZ4EncodeTransform());
  const out = track(fs.createWriteStream(outputPath));

  const pipePromise = pipeline(pack, encoder, out);

  try {
    for (const entry of entries) {
      throwIfCanceled();
      if (entry.type === 'directory') {
        await writeDirectoryEntry(pack, entry);
      } else {
        reporter.setCurrentFile(entry.relPath);
        await writeFileEntry(pack, entry, reporter);
      }
    }

    pack.finalize();
    await pipePromise;

    reporter.done({
      message: '压缩完成',
      outputPath,
      fileCount,
      dirCount,
      totalBytes
    });
  } catch (err) {
    safeDestroy(pack, err);
    safeDestroy(encoder, err);
    safeDestroy(out, err);

    if (isCanceledError(err)) {
      await safeRemoveFile(outputPath);
      throw makeCanceledError();
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Decompress
// ---------------------------------------------------------------------------

function sanitizeArchiveEntryPath(input) {
  const noBackslash = String(input || '').replace(/\\/g, '/').replace(/^\/+/g, '');
  const normalized = path.posix.normalize(noBackslash);

  if (!normalized || normalized === '.') {
    return '';
  }

  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new Error(`归档中存在不安全路径：${input}`);
  }

  return normalized;
}

function safeJoin(baseDir, relPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, relPath);

  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error(`归档路径越界：${relPath}`);
  }

  return target;
}

async function decompressArchive({ inputPath, outputDir }) {
  if (!inputPath) {
    throw new Error('未指定压缩文件');
  }
  if (!outputDir) {
    throw new Error('未指定解压目录');
  }

  const stat = await fsp.stat(inputPath);
  const reporter = createReporter('decompress');
  reporter.setTotalBytes(stat.size);
  reporter.state('running', '开始解压...');

  await fsp.mkdir(outputDir, { recursive: true });

  const inStream = track(
    fs.createReadStream(inputPath, {
      highWaterMark: 1024 * 1024
    })
  );
  const decoder = track(new LZ4DecodeTransform());
  const extract = track(tar.extract());

  inStream.on('data', (chunk) => {
    reporter.addBytes(chunk.length);
    if (canceled) {
      const err = makeCanceledError();
      safeDestroy(inStream, err);
      safeDestroy(decoder, err);
      safeDestroy(extract, err);
    }
  });

  extract.on('entry', (header, stream, next) => {
    (async () => {
      try {
        throwIfCanceled();

        const relPath = sanitizeArchiveEntryPath(header.name || '');
        if (!relPath) {
          stream.once('end', next);
          stream.once('error', (err) => extract.destroy(err));
          stream.resume();
          return;
        }

        reporter.setCurrentFile(relPath);
        const targetPath = safeJoin(outputDir, relPath);

        if (header.type === 'directory') {
          await fsp.mkdir(targetPath, { recursive: true });
          stream.once('end', next);
          stream.once('error', (err) => extract.destroy(err));
          stream.resume();
          return;
        }

        if (header.type === 'file') {
          await fsp.mkdir(path.dirname(targetPath), { recursive: true });

          const ws = track(
            fs.createWriteStream(targetPath, {
              mode: typeof header.mode === 'number' ? header.mode : 0o644
            })
          );

          stream.once('error', (err) => extract.destroy(err));
          ws.once('error', (err) => extract.destroy(err));

          ws.once('finish', async () => {
            try {
              if (header.mtime) {
                const mtime = header.mtime instanceof Date ? header.mtime : new Date(header.mtime);
                await fsp.utimes(targetPath, new Date(), mtime);
              }
              next();
            } catch (err) {
              extract.destroy(err);
            }
          });

          stream.pipe(ws);
          return;
        }

        // 跳过 symlink/hardlink 等类型
        stream.once('end', next);
        stream.once('error', (err) => extract.destroy(err));
        stream.resume();
      } catch (err) {
        extract.destroy(err);
      }
    })();
  });

  try {
    await pipeline(inStream, decoder, extract);
    reporter.done({
      message: '解压完成',
      outputDir
    });
  } catch (err) {
    if (isCanceledError(err)) {
      throw makeCanceledError();
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

(async () => {
  try {
    if (workerData.operation === 'compress') {
      await compressArchive(workerData);
    } else if (workerData.operation === 'decompress') {
      await decompressArchive(workerData);
    } else {
      throw new Error(`未知任务类型：${workerData.operation}`);
    }

    process.exit(0);
  } catch (err) {
    if (isCanceledError(err)) {
      parentPort.postMessage({
        type: 'canceled',
        operation: workerData.operation,
        message: '任务已取消'
      });
      process.exit(0);
      return;
    }

    parentPort.postMessage({
      type: 'error',
      operation: workerData.operation,
      message: err?.message || String(err)
    });
    process.exit(1);
  }
})();
