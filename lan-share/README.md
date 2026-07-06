# 局域网目录分享

用 Python 内置 HTTP 服务在局域网共享目录（只读浏览/下载）。

## 启动

```bash
cd /Volumes/sk801/codecollection/lan-share
python3 lan_share.py --dir /你要分享的目录 --port 8000
```

示例：

```bash
python3 lan_share.py --dir /Volumes/sk801/codecollection --port 9000
```

启动后会显示：
- 本机地址：`http://127.0.0.1:端口`
- 局域网地址：`http://你的局域网IP:端口`

其他设备在同一局域网下打开局域网地址即可访问。

## 说明

- 默认目录：当前目录
- 默认端口：`8000`
- 停止服务：`Ctrl + C`
