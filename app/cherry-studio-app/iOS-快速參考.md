# iOS 快速參考指南

本指南為熟悉 React Native 和 Expo 開發的開發者提供快速設置步驟。

## 1. 環境要求

- macOS, Xcode, Homebrew
- Node.js, Yarn, Watchman, Expo CLI, CocoaPods

## 2. 快速指令

```bash
# 1. 克隆倉庫
git clone https://github.com/CherryHQ/cherry-studio-app.git
cd cherry-studio-app

# 2. 執行自動化設置腳本
chmod +x setup-ios.sh
./setup-ios.sh

# 3. 手動設置 Xcode 簽名
#    - 打開 ios/*.xcworkspace
#    - 設置 Signing & Capabilities

# 4. 運行應用
npx expo run:ios -d
```

## 3. 中國大陸用戶

如果您在克隆時遇到困難，請使用 `快速克隆.sh` 腳本。

```bash
./快速克隆.sh