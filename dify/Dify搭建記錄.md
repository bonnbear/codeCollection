# Dify 專案本地搭建流程與問題排查記錄

本文檔記錄了從零開始搭建 Dify 開源專案的完整流程，詳細描述了過程中遇到的主要障礙以及對應的解決方案。

## 一、 總體構建流程

標準的、理想的構建流程如下：

1.  **克隆專案原始碼**
    ```bash
    git clone https://github.com/langgenius/dify.git .
    ```

2.  **準備環境設定檔**
    進入 `docker` 目錄，並從範本檔案複製一份環境設定檔。
    ```bash
    cd docker
    cp .env.example .env
    ```

3.  **啟動 Docker 容器**
    使用 Docker Compose 在背景啟動所有服務。
    ```bash
    docker-compose up -d
    ```

4.  **訪問應用**
    在瀏覽器中開啟 `http://localhost`。

然而，在實際操作中，我們在第 3 步遇到了重大阻礙。

## 二、 遇到的主要問題與解決方案

我們在搭建過程中主要遇到了兩大類問題：**網路問題**和**本地建置路徑問題**。

### 問題一：網路問題導致 Docker 映像檔下載失敗

-   **現象**：
    首次執行 `docker-compose up -d` 時，終端顯示大量映像檔（如 `langgenius/dify-api`, `langgenius/dify-web`, `ubuntu/squid` 等）下載失敗。錯誤訊息主要為 `EOF` (End of File) 或 `error from registry: unavailable`。多次重試後問題依舊。

-   **分析**：
    此現象強烈表示本機的網路環境無法穩定地連接到 Docker Hub 官方倉庫。這在特定網路環境下（如防火牆限制、ISP 限制等）是常見問題。

-   **解決方案與嘗試**：

    1.  **初步嘗試：本地建置 (失敗)**
        *   **思路**：既然無法從網路上下載，嘗試從本地原始碼直接建置映像檔。
        *   **操作**：修改 `docker/docker-compose-template.yaml`，將 `api` 和 `web` 等服務的 `image` 屬性改為 `build` 屬性，指向對應的 `Dockerfile`。
        *   **結果**：失敗。這引出了我們的第二個問題（本地建置流程有缺陷），詳見後述。

    2.  **最終方案：設定 Docker 映像檔加速器**
        *   **思路**：將 Docker 的下載來源從官方的 Docker Hub 切換到國內的鏡像站（Mirror），以獲得更穩定、高速的連線。
        *   **操作**：
            1.  引導使用者打開 Docker Desktop 的 `Settings > Docker Engine` 設定。
            2.  在 JSON 設定中加入 `"registry-mirrors"` 陣列。
            3.  **第一組加速器 (`hub-mirror.c.163.com`)**：嘗試後發現該鏡像站本身也不穩定，依然出現 `EOF` 錯誤。
            4.  **第二組加速器 (`docker.m.daocloud.io`, `docker.nju.edu.cn`, `docker.ustc.edu.cn`)**：更換後，大部分映像檔（如 `weaviate`, `plugin_daemon`）成功下載，證明此方向正確。
        *   **結果**：透過更換為一組穩定有效的加速器，最終成功解決了所有映像檔的下載問題。

### 問題二：本地建置流程失敗 - 找不到啟動腳本

-   **現象**：
    在嘗試本地建置方案時，即使解決了基礎映像檔的下載問題，建置過程依然失敗。錯誤訊息為 `failed to compute cache key: ... "/docker/startupscripts/web-entrypoint.sh": not found`。

-   **分析**：
    1.  `api/Dockerfile` 和 `web/Dockerfile` 中的 `COPY` 指令試圖複製一個名為 `entrypoint.sh` 的啟動腳本。
    2.  最初的幾次路徑修正（例如 `COPY ../docker/...`）均告失敗，證明問題不僅僅是路徑寫法錯誤。
    3.  最終透過 `list_files` 指令檢查 `docker/startupscripts/` 目錄，**確認了該目錄下根本不存在 `api-entrypoint.sh` 或 `web-entrypoint.sh` 這兩個檔案**。
    4.  **結論**：專案原始碼中的本地建置流程本身是不完整的或有缺陷的。這也解釋了為什麼官方預設推薦直接使用他們預先建置好的 `image`。

-   **解決方案**：
    *   **放棄本地建置**：在確認此路不通後，果斷放棄了從原始碼建置的想法。
    *   **還原所有設定**：將所有對 `docker-compose-template.yaml` 和 `Dockerfile` 的修改全部還原，回到最初使用官方 `image` 的策略。

## 三、 最終成功啟動

結合以上兩點的經驗，最終的成功路徑是：

1.  **還原所有設定**，確保使用官方預建置的 `image`。
2.  **配置一組有效的 Docker 加速器**，解決網路下載問題。
3.  再次執行 `docker-compose up -d`。

在此策略下，所有服務的映像檔都成功下載，並且容器 (`[+] Running 13/13`) 全部順利啟動。專案成功搭建。