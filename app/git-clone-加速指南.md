# Git Clone 加速指南 (中國大陸用戶)

由於網絡環境原因，在中國大陸直接從 GitHub 克隆倉庫可能會非常緩慢。本指南提供幾種方法來加速 `git clone` 過程。

## 方法一：使用 `快速克隆.sh` 腳本

我們提供了一個自動化腳本，通過使用 GitHub 的鏡像站點來加速克隆。

### 如何使用

1.  確保您已下載 `快速克隆.sh` 腳本。
2.  在終端機中給予腳本執行權限：
    ```bash
    chmod +x 快速克隆.sh
    ```
3.  執行腳本：
    ```bash
    ./快速克隆.sh
    ```

該腳本會自動從鏡像站點克隆 `cherry-studio-app` 倉庫。

## 方法二：手動修改 `hosts` 文件

您可以將以下內容添加到系統的 `hosts` 文件中，以直接解析 GitHub 的 IP 地址。

1.  **打開 `hosts` 文件**:
    ```bash
    sudo nano /etc/hosts
    ```

2.  **添加以下內容**:
    ```
    # GitHub
    140.82.114.4 github.com
    199.232.69.194 github.global.ssl.fastly.net
    ```

3.  **保存並刷新 DNS 緩存**:
    ```bash
    # macOS
    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
    ```

之後，再嘗試 `git clone`，速度應該會有顯著提升。

## 方法三：使用代理

如果您有可用的代理服務，可以為 Git 設置代理。

```bash
# 設置 HTTP 和 HTTPS 代理
git config --global http.proxy http://127.0.0.1:1080
git config --global https.proxy https://127.0.0.1:1080

# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

請將 `127.0.0.1:1080` 替換為您的代理地址和端口。

---

推薦優先使用 **方法一**，因為它最簡單且無需修改系統配置。