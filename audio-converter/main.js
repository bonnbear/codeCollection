const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 600,
        minHeight: 500,
        backgroundColor: '#1a1a2e',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 检查 Sox 是否安装
ipcMain.handle('check-sox', async () => {
    return new Promise((resolve) => {
        const sox = spawn('sox', ['--version']);
        sox.on('close', (code) => {
            resolve(code === 0);
        });
        sox.on('error', () => {
            resolve(false);
        });
    });
});

// 选择文件对话框
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'aiff', 'wma', 'm4a'] }
        ]
    });
    return result.filePaths;
});

// 选择输出目录
ipcMain.handle('select-output-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    return result.filePaths[0];
});

// 获取文件信息
ipcMain.handle('get-file-info', async (event, filePath) => {
    return new Promise((resolve, reject) => {
        const sox = spawn('sox', ['--i', filePath]);
        let output = '';

        sox.stdout.on('data', (data) => {
            output += data.toString();
        });

        sox.on('close', (code) => {
            if (code === 0) {
                const info = {};
                const lines = output.split('\n');
                lines.forEach(line => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length) {
                        info[key.trim().toLowerCase()] = valueParts.join(':').trim();
                    }
                });
                resolve(info);
            } else {
                reject(new Error('无法读取文件信息'));
            }
        });

        sox.on('error', reject);
    });
});

// 转换音频
ipcMain.handle('convert-audio', async (event, options) => {
    const { inputPath, outputDir, outputFormat, sampleRate, channels, bitrate } = options;

    const inputName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${inputName}.${outputFormat}`);

    return new Promise((resolve, reject) => {
        const args = [inputPath];

        // 添加转换参数
        if (sampleRate) {
            args.push('-r', sampleRate.toString());
        }
        if (channels) {
            args.push('-c', channels.toString());
        }

        // MP3 特殊处理
        if (outputFormat === 'mp3' && bitrate) {
            args.push('-C', bitrate.toString());
        }

        args.push(outputPath);

        const sox = spawn('sox', args);

        let errorOutput = '';

        sox.stderr.on('data', (data) => {
            errorOutput += data.toString();
            // 尝试解析进度（Sox 可能输出进度信息）
            const progressMatch = data.toString().match(/In:(\d+\.?\d*)%/);
            if (progressMatch) {
                mainWindow.webContents.send('conversion-progress', {
                    file: inputPath,
                    progress: parseFloat(progressMatch[1])
                });
            }
        });

        sox.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, outputPath });
            } else {
                reject(new Error(errorOutput || '转换失败'));
            }
        });

        sox.on('error', reject);
    });
});

// 批量转换
ipcMain.handle('convert-batch', async (event, options) => {
    const { files, outputDir, outputFormat, sampleRate, channels, bitrate } = options;
    const results = [];

    for (let i = 0; i < files.length; i++) {
        try {
            const result = await new Promise((resolve, reject) => {
                const inputPath = files[i];
                const inputName = path.basename(inputPath, path.extname(inputPath));
                const outputPath = path.join(outputDir, `${inputName}.${outputFormat}`);

                const args = [inputPath];

                if (sampleRate) args.push('-r', sampleRate.toString());
                if (channels) args.push('-c', channels.toString());
                if (outputFormat === 'mp3' && bitrate) args.push('-C', bitrate.toString());

                args.push(outputPath);

                const sox = spawn('sox', args);

                sox.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, file: inputPath, outputPath });
                    } else {
                        resolve({ success: false, file: inputPath, error: '转换失败' });
                    }
                });

                sox.on('error', (err) => {
                    resolve({ success: false, file: inputPath, error: err.message });
                });
            });

            results.push(result);

            // 发送进度
            mainWindow.webContents.send('batch-progress', {
                current: i + 1,
                total: files.length,
                file: files[i],
                result
            });

        } catch (err) {
            results.push({ success: false, file: files[i], error: err.message });
        }
    }

    return results;
});
