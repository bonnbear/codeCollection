const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const { execSync } = require('child_process');

// --- 获取 FFmpeg/FFprobe 路径 ---
const getBinaryPath = (binaryName) => {
    const commonPaths = [
        `/opt/homebrew/bin/${binaryName}`,
        `/usr/local/bin/${binaryName}`,
        `/usr/bin/${binaryName}`,
        `/bin/${binaryName}`
    ];
    for (const p of commonPaths) {
        try {
            if (fs.existsSync(p)) return p;
        } catch (_) {}
    }
    try {
        const systemPath = execSync(`which ${binaryName}`).toString().trim();
        if (systemPath) return systemPath;
    } catch (_) {}
    return binaryName;
};

const ffmpegPath = getBinaryPath('ffmpeg');
const ffprobePath = getBinaryPath('ffprobe');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// --- 生成空字幕文件（供占位用，字幕 concat 支持时使用） ---
const getEmptySubtitlePath = () => {
    const tempPath = path.join(os.tmpdir(), 'empty_subtitle.srt');
    if (!fs.existsSync(tempPath)) {
        const content = "1\n00:00:00,000 --> 00:00:01,000\n ";
        fs.writeFileSync(tempPath, content);
    }
    return tempPath;
};

// --- 探测视频信息 ---
function probeVideo(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            resolve({
                hasAudio,
                width: videoStream?.width || 1920,
                height: videoStream?.height || 1080,
                duration: metadata.format.duration || 0,
                filePath
            });
        });
    });
}

// --- 查找同名外挂字幕 (.srt 优先，其次 .ass) ---
function findSubtitle(videoPath) {
    const parsed = path.parse(videoPath);
    const exts = ['.srt', '.ass'];
    for (const ext of exts) {
        const subPath = path.join(parsed.dir, parsed.name + ext);
        if (fs.existsSync(subPath)) return subPath;
    }
    return null;
}

// --- 检测 concat 滤镜是否支持字幕输出 (s=) ---
let _concatSubtitleSupport = null;
function supportsConcatSubtitle() {
    if (_concatSubtitleSupport !== null) return _concatSubtitleSupport;
    try {
        const helpText = execSync(`"${ffmpegPath}" -hide_banner -h filter=concat`, { encoding: 'utf8' });
        _concatSubtitleSupport = /\s+s=/.test(helpText);
    } catch (_) {
        _concatSubtitleSupport = false;
    }
    return _concatSubtitleSupport;
}

// --- 选择编码器与参数（平台回退） ---
function selectEncoder() {
    const isMac = process.platform === 'darwin';
    if (isMac) {
        return {
            videoCodec: 'hevc_videotoolbox',
            videoTag: 'hvc1',
            videoOpts: ['-q:v', '35', '-allow_sw', '1', '-realtime', '0'],
            audioCodec: 'aac_at'
        };
    }
    return {
        videoCodec: 'libx264',
        videoTag: null,
        videoOpts: ['-crf', '21', '-preset', 'medium'],
        audioCodec: 'aac'
    };
}

// --- SRT 工具：时间解析/格式化与合并 ---
function parseSrtTimeToMs(t) {
    const m = t.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!m) return null;
    return (
        parseInt(m[1], 10) * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4], 10)
    );
}
function formatMsToSrtTime(ms) {
    ms = Math.max(0, Math.round(ms));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msR = ms % 1000;
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msR, 3)}`;
}

// 将多个 SRT 按视频时长偏移合并为一个 SRT，返回 { path, count }
function mergeSrtFiles(subtitlePaths, videoInfos) {
    let offsetMs = 0;
    let index = 1;
    let mergedLines = [];
    let cueCount = 0;

    for (let i = 0; i < subtitlePaths.length; i++) {
        const subPath = subtitlePaths[i];
        const dur = videoInfos[i].duration;
        if (!dur || dur <= 0) {
            throw new Error(`第 ${i + 1} 段视频时长获取失败，无法对字幕对齐。`);
        }
        if (!subPath) {
            offsetMs += dur * 1000;
            continue;
        }
        const raw = fs.readFileSync(subPath, 'utf8');
        const blocks = raw.split(/\r?\n\r?\n/);
        for (const blk of blocks) {
            const lines = blk.split(/\r?\n/).filter(l => l.trim() !== '');
            if (lines.length < 2) continue;
            const timeLine = lines[1];
            const tm = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/);
            if (!tm) continue;
            const t1 = parseSrtTimeToMs(tm[1]);
            const t2 = parseSrtTimeToMs(tm[2]);
            if (t1 === null || t2 === null) continue;
            const n1 = formatMsToSrtTime(t1 + offsetMs);
            const n2 = formatMsToSrtTime(t2 + offsetMs);
            mergedLines.push(String(index++));
            mergedLines.push(`${n1} --> ${n2}`);
            for (let k = 2; k < lines.length; k++) mergedLines.push(lines[k]);
            mergedLines.push(''); // blank
            cueCount++;
        }
        offsetMs += dur * 1000;
    }

    // 若没有任何有效字幕，生成一个最小的空白字幕，以避免 ffmpeg 读入空文件报错
    if (cueCount === 0) {
        mergedLines = ['1', '00:00:00,000 --> 00:00:00,500', ' ', ''];
        cueCount = 1;
    }

    const mergedSrt = mergedLines.join('\n');
    const tempPath = path.join(os.tmpdir(), `merged_${Date.now()}.srt`);
    fs.writeFileSync(tempPath, mergedSrt, 'utf8');
    return { path: tempPath, count: cueCount };
}

// --- 创建窗口 ---
function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 750,
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}

// --- App 生命周期 ---
app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        const iconPath = path.join(__dirname, 'assets/icon.png');
        if (fs.existsSync(iconPath)) app.dock.setIcon(iconPath);
    }
    createWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC 逻辑 ---
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'avi', 'flv', 'webm'] }]
    });
    return result.filePaths;
});

ipcMain.handle('select-save-path', async () => {
    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: '保存视频',
        defaultPath: `merged_${Date.now()}.mp4`,
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
    });
    return filePath;
});

ipcMain.handle('get-video-info', async (_event, filePath) => {
    try {
        return await probeVideo(filePath);
    } catch (_) {
        return { hasAudio: true, width: 1920, height: 1080 };
    }
});

// --- 合并处理 ---
ipcMain.handle('merge-videos', async (event, { inputFiles, outputPath, resolution }) => {
    return new Promise(async (resolve, reject) => {
        if (!inputFiles || inputFiles.length < 2) return reject('请至少选择两个视频文件。');
        const sender = event.sender;

        // 目标分辨率
        let targetWidth = 1920, targetHeight = 1080;
        if (resolution === '4k') { targetWidth = 3840; targetHeight = 2160; }
        else if (resolution === '720p') { targetWidth = 1280; targetHeight = 720; }

        try {
            // 1) 探测所有视频
            const videoInfos = await Promise.all(inputFiles.map(f => probeVideo(f)));

            // 2) 准备字幕列表
            const subtitlePaths = inputFiles.map(f => findSubtitle(f));
            const hasAnySubtitle = subtitlePaths.some(p => p !== null);

            // 3) 总时长估算
            const rawDuration = videoInfos.reduce((acc, info) => acc + (info.duration || 0), 0);
            const totalDuration = rawDuration > 0 ? rawDuration * 1.01 : null;

            // 4) 选择编码器
            const { videoCodec, videoTag, videoOpts, audioCodec } = selectEncoder();

            // 5) 检测字幕 concat 支持
            const subtitleConcatSupported = supportsConcatSubtitle();

            // 6) 如果不支持字幕 concat，且存在字幕，则尝试 SRT 合并回退
            let useSubtitleConcat = hasAnySubtitle && subtitleConcatSupported;
            let mergedSubtitleInfo = null;
            let hasAssInFallback = false;

            if (hasAnySubtitle && !useSubtitleConcat) {
                if (subtitlePaths.some(p => p && p.toLowerCase().endsWith('.ass'))) {
                    hasAssInFallback = true;
                }
                if (!hasAssInFallback) {
                    mergedSubtitleInfo = mergeSrtFiles(subtitlePaths, videoInfos); // { path, count }
                }
            }

            let command = ffmpeg();

            // 输入顺序：
            // 0..N-1: 视频
            // （可选）字幕逐段输入：N..2N-1 （仅 useSubtitleConcat 时）
            // （可选）静音音源：next
            // （可选）整体合并好的 SRT：最后（仅回退时且 mergedSubtitleInfo 存在）
            inputFiles.forEach(file => {
                command.input(file).inputOption('-hwaccel', 'videotoolbox');
            });

            const videoCount = inputFiles.length;
            let subtitleStartIndex = videoCount;
            let silentAudioIndex = videoCount; // 后面依据是否加字幕调整
            let mergedSubtitleIndex = null;

            if (useSubtitleConcat) {
                const emptySubtitlePath = getEmptySubtitlePath();
                subtitlePaths.forEach(subPath => {
                    command.input(subPath ? subPath : emptySubtitlePath);
                });
                silentAudioIndex = videoCount * 2;
            } else {
                silentAudioIndex = videoCount;
            }

            const allHaveAudio = videoInfos.every(info => info.hasAudio);
            if (!allHaveAudio) {
                command.input('anullsrc=channel_layout=stereo:sample_rate=44100')
                       .inputOptions(['-f', 'lavfi']);
            }

            if (!useSubtitleConcat && mergedSubtitleInfo && mergedSubtitleInfo.count > 0) {
                mergedSubtitleIndex = command._inputs.length; // 当前已添加的输入数量
                command.input(mergedSubtitleInfo.path).inputOptions(['-f', 'srt']);
            }

            // 构建 filter_complex
            let filterComplex = '';
            let concatInput = '';

            videoInfos.forEach((info, i) => {
                // 视频分支
                const needScale = !(info.width === targetWidth && info.height === targetHeight);
                if (needScale) {
                    filterComplex += `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,` +
                                     `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,` +
                                     `setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}];`;
                } else {
                    filterComplex += `[${i}:v]setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}];`;
                }

                // 音频分支
                if (info.hasAudio) {
                    filterComplex += `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,` +
                                     `asetpts=PTS-STARTPTS[a${i}];`;
                } else {
                    const duration = info.duration && info.duration > 0 ? info.duration : 10;
                    filterComplex += `[${silentAudioIndex}:a]atrim=duration=${duration},` +
                                     `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,` +
                                     `asetpts=PTS-STARTPTS[a${i}];`;
                }

                // concat 输入拼接
                if (useSubtitleConcat) {
                    const subIndex = subtitleStartIndex + i;
                    concatInput += `[v${i}][a${i}][${subIndex}:s]`;
                } else {
                    concatInput += `[v${i}][a${i}]`;
                }
            });

            const concatStr = useSubtitleConcat
                ? `concat=n=${videoCount}:v=1:a=1:s=1[outv][outa][outs]`
                : `concat=n=${videoCount}:v=1:a=1[outv][outa]`;

            filterComplex += `${concatInput}${concatStr}`;

            // 输出选项
            const outputOptions = [
                '-threads', '0',
                '-c:v', videoCodec,
                ...(videoTag ? ['-tag:v', videoTag] : []),
                ...videoOpts,
                '-movflags', '+faststart',
                '-c:a', audioCodec,
                '-b:a', '192k'
            ];

            // Map 设置
            if (useSubtitleConcat) {
                command.outputOptions([
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-map', '[outs]',
                    '-c:s', 'mov_text'
                ]);
            } else if (mergedSubtitleIndex !== null) {
                command.outputOptions([
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-map', `${mergedSubtitleIndex}:s`,
                    '-c:s', 'mov_text'
                ]);
            } else {
                command.outputOptions([
                    '-map', '[outv]',
                    '-map', '[outa]'
                ]);
            }

            command
                .complexFilter(filterComplex)
                .outputOptions(outputOptions)
                .on('start', (cmd) => {
                    console.log('FFmpeg Cmd:', cmd);
                })
                .on('progress', (progress) => {
                    if (progress.timemark && totalDuration) {
                        const parts = progress.timemark.split(':');
                        let currentSeconds = 0;
                        if (parts.length === 3) {
                            currentSeconds =
                                parseInt(parts[0], 10) * 3600 +
                                parseInt(parts[1], 10) * 60 +
                                parseFloat(parts[2]);
                        }
                        let percent = (currentSeconds / totalDuration) * 100;
                        sender.send('merge-progress', Math.min(99.9, percent).toFixed(1));
                    } else {
                        sender.send('merge-progress', null);
                    }
                })
                .on('error', (err, _stdout, stderr) => {
                    console.error('Error:', err.message);
                    console.error('Stderr:', stderr);
                    reject(err.message);
                })
                .on('end', () => {
                    sender.send('merge-progress', '100.0');
                    resolve('success');
                })
                .save(outputPath);

        } catch (err) {
            reject('处理失败: ' + err.message);
        }
    });
});