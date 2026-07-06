# LAN Share Electron (SMB)

一个桌面应用，用 `SMB` 协议在局域网共享目录。

## 安装和运行

```bash
cd /Volumes/sk801/codecollection/lan-share-electron
npm install
npm run start
```

## 使用

1. 选择要共享的目录。
2. 输入共享名（可留空，默认用目录名）。
3. 点击“启动分享”。
4. macOS 会弹出管理员授权窗口，输入系统密码后生效。
5. 把界面中的 `smb://IP/共享名` 发给同网段设备。

## 其他设备怎么连

- macOS Finder: 菜单 `前往 -> 连接服务器`，输入 `smb://192.168.x.x/共享名`
- Windows 资源管理器地址栏: `\\192.168.x.x\共享名`
- 同网段设备都可访问（默认开启 guest 访问）

## 注意

- 仅支持 macOS（依赖 `/usr/sbin/sharing`）。
- 启动/停止共享都需要管理员授权。
- 如果连接失败，检查系统防火墙和路由器隔离设置。
