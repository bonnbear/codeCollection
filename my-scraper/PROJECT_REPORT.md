# 專案分析報告

這是一個使用 Playwright 的網路爬蟲專案，主要用於爬取影片網站（如 MissAV、JavBus）的磁力連結。

---

## 專案概覽

| 項目 | 說明 |
|------|------|
| 專案名稱 | playwright-scraper-project |
| 版本 | 1.0.0 |
| 主入口 | scraper-configurable.js |
| 技術棧 | Node.js + Playwright |

---

## 依賴套件

```json
{
  "playwright": "^1.40.1",
  "playwright-extra": "^4.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2"
}
```

---

## 核心爬蟲腳本

### 1. `scraper-configurable.js` - MissAV 爬蟲

**檔案位置**: [scraper-configurable.js](scraper-configurable.js)

**功能描述**：爬取 MissAV 網站的磁力連結

**主要特點**：
- 支援字幕檢測（`hasSubtitle` 標記）
- 並發控制器 `ConcurrencyController` 管理請求（預設詳情頁 5 並發、列表頁 5 並發）
- 實時保存到臨時 JSONL 檔案，防止資料遺失
- 支援分頁爬取（`START_PAGE` 到 `END_PAGE`）
- 自動重試機制（最多 3 次）

**配置項**：
```javascript
const CONFIG = {
  BASE_URL: 'https://missav.ws/dm333/genres/...',
  START_PAGE: 1,
  END_PAGE: 776,
  OUTPUT_FILE: 'missav_magnets.json',
  TEMP_FILE: 'missav_magnets_temp.jsonl',
  CONCURRENCY: {
    detailPages: 5,
    listPages: 5,
  }
};
```

**核心函數**：
- `scrapeDetailPage()` - 爬取詳情頁，提取磁力連結和字幕狀態
- `scrapeListPage()` - 爬取列表頁，獲取所有影片連結
- `ConcurrencyController` - 並發控制類
- `saveItemToTempFile()` - 實時保存資料
- `convertTempToFinal()` - 將臨時檔案轉換為最終 JSON

---

### 2. `javbus.js` - JavBus 爬蟲

**檔案位置**: [javbus.js](javbus.js)

**功能描述**：爬取 JavBus 網站的影片資訊和磁力連結

**主要特點**：
- 處理年齡驗證彈窗 `handleAgeVerification()`
- 提取磁力連結、檔案大小、日期、標籤（字幕/高清）
- 使用 stealth 插件繞過反爬蟲檢測
- 支援分頁爬取

**配置項**：
```javascript
const CONFIG = {
  BASE_URL: "https://www.javbus.com/star/2mx",
  START_PAGE: 1,
  END_PAGE: 6,
  OUTPUT_FILE: 'javbus_results.json',
  TEMP_FILE: 'javbus_results_temp.jsonl',
  TIMEOUT: 1200000,
  HEADLESS: false
};
```

**輸出資料結構**：
```javascript
{
  page: 1,
  url: "https://www.javbus.com/...",
  title: "影片標題",
  magnets: [
    {
      name: "ABC-123",
      magnet: "magnet:?xt=urn:btih:...",
      size: "2.5GB",
      date: "2024-01-01",
      tags: ["字幕", "高清"]
    }
  ]
}
```

---

## 資料處理腳本

### 3. `javbusProcess.js` - 磁力連結篩選

**檔案位置**: [javbusProcess.js](javbusProcess.js)

**功能描述**：從 JavBus 結果中選擇最佳磁力連結

**優先級規則**：
1. 字幕優先（優先級 1）
2. 高清次之（優先級 2）
3. 乾淨番號名稱（如 `ABC-123` 格式）
4. 檔案大小（越大越好）

**輸入/輸出**：
- 輸入：`javbus_results.json`
- 輸出：`javbus.txt`（每行一個磁力連結）

---

### 4. `processFailed.js` - 失敗連結替換

**檔案位置**: [processFailed.js](processFailed.js)

**功能描述**：讀取失敗的磁力連結，從原始資料中找出替代連結

**工作流程**：
1. 讀取 `failed.txt` 中的失敗磁力連結
2. 提取每個連結的 btih hash
3. 遍歷 `javbus_results.json`，找出包含失敗連結的影片
4. 從該影片的其他磁力連結中選擇最佳替代
5. 輸出到 `alternatives.txt`

**輸入/輸出**：
- 輸入：`failed.txt` + `javbus_results.json`
- 輸出：`alternatives.txt`

---

### 5. `retry.js` - 失效連結補救

**檔案位置**: [retry.js](retry.js)

**功能描述**：批量處理失效連結，導出所有可用的備用連結

**與 processFailed.js 的區別**：
- `processFailed.js`：選擇「最佳」替代連結
- `retry.js`：導出「所有」可用的備用連結

**輸入/輸出**：
- 輸入：`dead_magnets.txt` + `javbus_results.json`
- 輸出：`javbus_all_backups.txt`

---

### 6. `extract_magnets.js` - 磁力連結提取

**檔案位置**: [extract_magnets.js](extract_magnets.js)

**功能描述**：從 JSON 結果中提取磁力連結

**主要特點**：
- 每個影片最多取 2 條連結
- 排序規則：字幕優先 > 檔案大小優先

**輸入/輸出**：
- 輸入：`javbus_results.json`
- 輸出：`javbus_results.txt`

---

### 7. `deduplicate.js` - 檔案去重

**檔案位置**: [deduplicate.js](deduplicate.js)

**功能描述**：根據番號編碼去除重複檔案

**工作流程**：
1. 掃描指定目錄中的所有檔案
2. 從檔名中提取番號編碼（如 `ABC-123`）
3. 將相同編碼的檔案分組
4. 保留檔案大小最大的，其餘移至 `_TO_DELETE` 資料夾

**支援的編碼格式**：
- `ABC-123`
- `ABCD-123`
- `ABC123`
- `123-ABC`

---

## 目錄結構

```
my-scraper/
├── package.json                 # 專案配置
├── scraper-configurable.js      # MissAV 爬蟲（主入口）
├── javbus.js                    # JavBus 爬蟲
├── javbusProcess.js             # 磁力連結篩選
├── processFailed.js             # 失敗連結替換
├── retry.js                     # 失效連結補救
├── extract_magnets.js           # 磁力連結提取
├── deduplicate.js               # 檔案去重
├── workflow_explanation.md      # 工作流程說明
│
├── javbus_results.json          # JavBus 爬取結果
├── javbus_results_temp.jsonl    # 臨時資料檔案
├── failed.txt                   # 失敗連結列表
├── alternatives.txt             # 替代連結輸出
├── magnet_links.txt             # 磁力連結輸出
│
├── back/                        # 備份腳本
│   └── scraper-configurable copy*.js
│
└── [各種子目錄]/                 # 按分類存放的結果
    ├── 6/
    ├── abp/
    ├── ip社/
    ├── s1/
    └── ...
```

---

## 工作流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                        爬蟲階段                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  配置 CONFIG  │ -> │  列表頁爬取   │ -> │  詳情頁爬取   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                    │        │
│                                                    v        │
│                                          ┌──────────────┐  │
│                                          │ 實時保存 JSONL │  │
│                                          └──────────────┘  │
│                                                    │        │
│                                                    v        │
│                                          ┌──────────────┐  │
│                                          │ 轉換為 JSON   │  │
│                                          └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────┐
│                       資料處理階段                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ javbusProcess │    │ processFailed │    │    retry     │  │
│  │  篩選最佳連結  │    │  替換失敗連結  │    │  批量補救    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │extract_magnets│    │  deduplicate  │                      │
│  │  提取磁力連結  │    │   檔案去重    │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用說明

### 安裝依賴
```bash
npm install
npx playwright install
```

### 執行爬蟲
```bash
# MissAV 爬蟲
node scraper-configurable.js

# JavBus 爬蟲
node javbus.js
```

### 處理資料
```bash
# 篩選最佳磁力連結
node javbusProcess.js

# 處理失敗連結
node processFailed.js

# 提取磁力連結
node extract_magnets.js

# 檔案去重
node deduplicate.js
```

---

## 注意事項

1. **反爬蟲機制**：使用 `puppeteer-extra-plugin-stealth` 繞過檢測
2. **並發控制**：建議詳情頁並發數 3-5，太高容易被 Cloudflare 攔截
3. **資料安全**：使用臨時 JSONL 檔案實時保存，防止程式中斷導致資料遺失
4. **年齡驗證**：JavBus 爬蟲會自動處理年齡驗證彈窗

---

*報告生成時間：2026-01-03*