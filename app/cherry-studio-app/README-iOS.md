# Cherry Studio App - iOS

歡迎來到 Cherry Studio App 的 iOS 開發部分！

本項目使用 React Native 和 Expo 構建，為 iOS 平台提供無縫的 LLM 互動體驗。

## 開發入門

為了開始 iOS 開發，請遵循我們的設置指南。我們提供了兩種版本的指南：

- **詳細指南**: [iOS-設置指南.md](./iOS-設置指南.md)
- **快速參考**: [iOS-快速參考.md](./iOS-快速參考.md)

## 主要步驟

1.  **環境配置**: 確保您的 macOS 已安裝 Xcode, Node.js, Yarn, Expo CLI 等必要工具。
2.  **克隆倉庫**: `git clone https://github.com/CherryHQ/cherry-studio-app.git`
3.  **自動化設置**: 運行 `./setup-ios.sh` 腳本來處理大部分依賴和配置。
4.  **Xcode 設置**: 手動在 Xcode 中配置您的開發者簽名。
5.  **運行應用**: `npx expo run:ios -d`

## 目錄結構

- `ios/`: 包含由 `expo prebuild` 生成的原生 iOS 項目。
- `src/`: 包含主要的 React Native 源代碼。
- `setup-ios.sh`: 自動化設置腳本。
- `iOS-設置指南.md`: 詳細的設置文檔。

如果您在設置過程中遇到任何問題，請參考詳細指南或在項目的 Issues 中尋求幫助。