# Cherry Studio App iOS 開發環境設置指南

本文檔將指導您如何在 macOS 上設置 Cherry Studio App 的 iOS 開發環境。

## 1. 環境準備

在開始之前，請確保您的系統已安裝以下軟體：

- **macOS**: 建議使用最新版本。
- **Xcode**: 可從 Mac App Store 安裝。請確保安裝 Xcode Command Line Tools。
- **Homebrew**: macOS 的套件管理器。如果尚未安裝，請在終端機中執行以下指令：
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

## 2. 安裝依賴

### 2.1 Node.js, Watchman, Yarn, Expo CLI

打開終端機，執行以下指令安裝必要的開發工具：

```bash
# 安裝 Node.js
brew install node

# 安裝 Watchman
brew install watchman

# 安裝 Yarn
npm install -g yarn

# 安裝 Expo CLI
npm install -g expo-cli
```

### 2.2 CocoaPods

如果您的系統尚未安裝 CocoaPods，請執行以下指令：

```bash
sudo gem install cocoapods
```

## 3. 項目設置

### 3.1 克隆倉庫

如果您位於中國大陸，可能會遇到 `git clone` 速度緩慢的問題。您可以使用我們提供的 `快速克隆.sh` 腳本來加速克隆過程。

```bash
# 對於海外用戶
git clone https://github.com/CherryHQ/cherry-studio-app.git

# 對於中國大陸用戶
./快速克隆.sh
```

### 3.2 運行自動化腳本

我們提供了一個 `setup-ios.sh` 腳本來自動化大部分設定過程。在終端機中，導航到項目根目錄並執行：

```bash
cd cherry-studio-app
chmod +x setup-ios.sh
./setup-ios.sh
```

此腳本將會：
1. 檢查並安裝所有必要的依賴。
2. 安裝項目依賴 (`yarn install`)。
3. 生成數據庫 (`npx drizzle-kit generate`)。
4. 預構建 iOS 項目 (`npx expo prebuild -p ios`)。

## 4. 手動步驟

### 4.1 添加自簽名證書

`expo prebuild` 完成後，您需要手動設定 Xcode 項目以使用您自己的開發者簽名。

1. 在 `cherry-studio-app/ios` 目錄下，用 Xcode 打開 `.xcworkspace` 文件。
2. 在 Xcode 中，選擇項目導航器中的頂級項目。
3. 進入 "Signing & Capabilities" 標籤頁。
4. 選擇您的開發團隊並設定 Bundle Identifier。

### 4.2 添加 `local.properties` (如果需要)

如果項目需要本地配置 (例如 Android SDK 路徑)，請確保 `android/local.properties` 文件已正確配置。對於純 iOS 開發，此步驟可選。

## 5. 運行應用

一切準備就緒後，您可以在終端機中運行以下指令來啟動應用：

```bash
cd cherry-studio-app
npx expo run:ios -d
```

`-d` 參數將會讓您選擇一個已連接的實體設備或模擬器來運行應用。

## 6. 疑難解答

- **`pod install` 失敗**: 嘗試更新 CocoaPods (`sudo gem install cocoapods`) 或在 `ios` 目錄下運行 `pod repo update` 和 `pod install`。
- **構建失敗**: 檢查 Xcode 中的錯誤日誌，確保所有證書和配置都正確無誤。

---

希望本指南能幫助您順利完成設定！如果您遇到任何問題，請隨時在項目的 [Issues](https://github.com/CherryHQ/cherry-studio-app/issues) 中提出。