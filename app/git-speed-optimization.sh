#!/bin/bash

echo "=== Git Clone 速度優化腳本 ==="
echo ""

# 1. 設置 Git 使用更快的協議
echo "1. 配置 Git 使用更快的傳輸協議..."
git config --global core.compression 0
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 2. 設置淺克隆深度(可選)
echo "2. 提示:使用淺克隆可以大幅提升速度"
echo "   使用方式: git clone --depth 1 <repository-url>"
echo ""

# 3. 配置 GitHub 鏡像(針對中國大陸用戶)
echo "3. 是否配置 GitHub 鏡像加速? (y/n)"
read -r use_mirror

if [ "$use_mirror" = "y" ]; then
    echo "選擇鏡像源:"
    echo "  1) ghproxy.com (推薦)"
    echo "  2) gitclone.com"
    echo "  3) fastgit.org"
    read -r mirror_choice
    
    case $mirror_choice in
        1)
            echo "使用 ghproxy.com 鏡像"
            echo "克隆時使用: git clone https://ghproxy.com/https://github.com/用戶名/倉庫名.git"
            ;;
        2)
            echo "使用 gitclone.com 鏡像"
            echo "克隆時使用: git clone https://gitclone.com/github.com/用戶名/倉庫名.git"
            ;;
        3)
            echo "使用 fastgit.org 鏡像"
            echo "克隆時使用: git clone https://hub.fastgit.xyz/用戶名/倉庫名.git"
            ;;
    esac
fi

echo ""
echo "4. 配置 SSH 連接優化..."
mkdir -p ~/.ssh
if [ ! -f ~/.ssh/config ]; then
    touch ~/.ssh/config
fi

# 檢查是否已有 GitHub 配置
if ! grep -q "Host github.com" ~/.ssh/config; then
    cat >> ~/.ssh/config << 'EOF'

# GitHub SSH 優化配置
Host github.com
    HostName github.com
    User git
    Compression yes
    TCPKeepAlive yes
    ServerAliveInterval 60
    ServerAliveCountMax 5
EOF
    echo "SSH 配置已添加到 ~/.ssh/config"
else
    echo "SSH 配置已存在,跳過"
fi

echo ""
echo "=== 優化完成! ==="
echo ""
echo "已應用的優化:"
echo "✓ 關閉壓縮以提升速度"
echo "✓ 增加 HTTP 緩衝區大小"
echo "✓ 移除低速限制"
echo "✓ SSH 連接優化"
echo ""
echo "其他建議:"
echo "• 使用淺克隆: git clone --depth 1 <url>"
echo "• 使用 SSH 而非 HTTPS: git clone git@github.com:用戶名/倉庫名.git"
echo "• 單分支克隆: git clone --single-branch <url>"
echo "• 如在中國大陸,考慮使用鏡像站點"
echo ""
echo "查看當前配置: git config --global --list"