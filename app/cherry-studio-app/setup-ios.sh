#!/bin/zsh

# 打印日誌函數
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 檢查並安裝 Homebrew
if ! command -v brew &> /dev/null; then
  log "正在安裝 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [ $? -ne 0 ]; then
    log "Homebrew 安裝失敗。"
    exit 1
  fi
else
  log "Homebrew 已安裝。"
fi

# 檢查並安裝 Node.js
if ! command -v node &> /dev/null; then
  log "正在使用 Homebrew 安裝 Node.js..."
  brew install node
  if [ $? -ne 0 ]; then
    log "Node.js 安裝失敗。"
    exit 1
  fi
else
  log "Node.js 已安裝。"
fi

# 檢查並安裝 watchman
if ! command -v watchman &> /dev/null; then
  log "正在使用 Homebrew 安裝 watchman..."
  brew install watchman
  if [ $? -ne 0 ]; then
    log "watchman 安裝失敗。"
    exit 1
  fi
else
  log "watchman 已安裝。"
fi

# 檢查並安裝 yarn
if ! command -v yarn &> /dev/null; then
  log "正在使用 npm 安裝 yarn..."
  npm install -g yarn
  if [ $? -ne 0 ]; then
    log "yarn 安裝失敗。"
    exit 1
  fi
else
  log "yarn 已安裝。"
fi

# 檢查並安裝 Expo CLI
if ! command -v expo &> /dev/null; then
  log "正在使用 npm 安裝 Expo CLI..."
  npm install -g expo-cli
  if [ $? -ne 0 ]; then
    log "Expo CLI 安裝失敗。"
    exit 1
  fi
else
  log "Expo CLI 已安裝。"
fi

# 檢查並安裝 Xcode
if ! xcode-select -p &> /dev/null; then
  log "請從 App Store 安裝 Xcode。"
  exit 1
else
  log "Xcode 已安裝。"
fi

# 檢查並安裝 CocoaPods
if ! command -v pod &> /dev/null; then
  log "正在安裝 CocoaPods..."
  sudo gem install cocoapods
  if [ $? -ne 0 ]; then
    log "CocoaPods 安裝失敗。"
    exit 1
  fi
else
  log "CocoaPods 已安裝。"
fi

# 安裝依賴
log "正在安裝項目依賴..."
yarn install
if [ $? -ne 0 ]; then
  log "依賴安裝失敗。"
  exit 1
fi

# 生成數據庫
log "正在生成數據庫..."
npx drizzle-kit generate
if [ $? -ne 0 ]; then
  log "數據庫生成失敗。"
  exit 1
fi

# 預構建 iOS 項目
log "正在預構建 iOS 項目..."
npx expo prebuild -p ios
if [ $? -ne 0 ]; then
  log "iOS 項目預構建失敗。"
  exit 1
fi

log "iOS 項目設定完成！"
log "請進入 'ios' 目錄添加自簽名證書，然後運行 'npx expo run:ios -d'。"