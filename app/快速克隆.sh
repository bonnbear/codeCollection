#!/bin/zsh

# 打印日誌函數
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "正在嘗試從 GitHub 鏡像站點克隆 cherry-studio-app..."

# 使用鏡像站點進行克隆
git clone https://github.com.cnpmjs.org/CherryHQ/cherry-studio-app.git

if [ $? -ne 0 ]; then
  log "從鏡像站點克隆失敗。請嘗試手動克隆或檢查您的網絡連接。"
  exit 1
fi

log "倉庫克隆成功！"
log "現在您可以進入 'cherry-studio-app' 目錄並開始您的開發。"