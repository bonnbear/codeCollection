#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub DNS Fixer Ultimate (多源自动切换版)
功能：自动尝试多个高速源获取 GitHub Hosts，解决单一源失效问题。
"""

import os
import sys
import platform
import shutil
import subprocess
import ctypes
import time
from datetime import datetime

# 尝试导入 requests
try:
    import requests
except ImportError:
    print("❌ 缺少依赖库: requests")
    print("   请运行: pip install requests")
    sys.exit(1)

# ================= 配置区域 =================

# 定义多个源，脚本会自动轮询，直到找到可用的那个
# 感谢 GitHub520 项目提供的维护
HOSTS_SOURCES = [
    # 源1: jsDelivr CDN (国内访问通常较快且稳)
    "https://cdn.jsdelivr.net/gh/521xueweihan/GitHub520@main/hosts",
    # 源2: 官方源 (如果能直连的话)
    "https://raw.githubusercontent.com/521xueweihan/GitHub520/main/hosts",
    # 源3: 备用镜像 (HelloGitHub)
    "https://raw.hellogithub.com/hosts",
    # 源4: 备用镜像 (FastGit - 有时不稳定但可作为备选)
    "https://raw.fastgit.org/521xueweihan/GitHub520/main/hosts"
]

START_MARKER = "# ===== GitHub Fix Start (Auto Generated) ====="
END_MARKER = "# ===== GitHub Fix End ====="

# ===========================================

def is_admin():
    """检查管理员权限"""
    try:
        if platform.system() == "Windows":
            return ctypes.windll.shell32.IsUserAnAdmin()
        else:
            return os.geteuid() == 0
    except:
        return False

def get_hosts_path():
    """获取系统 hosts 文件路径"""
    system = platform.system().lower()
    if system == "windows":
        return r"C:\Windows\System32\drivers\etc\hosts"
    else:
        return "/etc/hosts"

def backup_hosts(path):
    """备份 hosts 文件"""
    if not os.path.exists(path):
        return
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{path}.bak_{timestamp}"
    try:
        shutil.copy2(path, backup_path)
        print(f"🧾 已备份原文件至: {backup_path}")
    except Exception as e:
        print(f"❌ 备份失败: {e}")
        sys.exit(1)

def fetch_best_hosts():
    """尝试从多个源获取 Hosts"""
    print(f"🔍 准备获取最新 Hosts 配置，共 {len(HOSTS_SOURCES)} 个源待测试...")
    
    for index, url in enumerate(HOSTS_SOURCES):
        print(f"\n👉 [尝试 {index+1}/{len(HOSTS_SOURCES)}] 正在连接: {url} ...")
        try:
            # 设置 5 秒超时，防止卡住
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            content = response.text
            
            # 简单验证内容有效性
            if "github.com" in content and "127.0.0.1" not in content[:50]: 
                print(f"✅ 成功！从该源获取到了数据 ({len(content)} 字节)")
                return content
            else:
                print("⚠️  内容似乎无效，尝试下一个...")
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            
    print("\n⛔️ 所有源都无法连接。请检查你的网络是否开启了某些代理软件（有时代理会拦截请求）。")
    return None

def update_hosts_file(new_content):
    """更新 hosts 文件"""
    path = get_hosts_path()
    backup_hosts(path)

    print("\n⚙️  正在写入 hosts 文件...")
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        
        final_lines = []
        in_block = False
        
        # 保留用户原本的配置，只删除脚本生成的块
        for line in lines:
            if START_MARKER in line:
                in_block = True
                continue
            if END_MARKER in line:
                in_block = False
                continue
            if not in_block:
                final_lines.append(line)

        if final_lines and not final_lines[-1].endswith('\n'):
            final_lines.append('\n')

        # 写入新配置块
        final_lines.append(f"{START_MARKER}\n")
        final_lines.append(f"# 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        final_lines.append(new_content)
        if not new_content.endswith('\n'):
            final_lines.append('\n')
        final_lines.append(f"{END_MARKER}\n")

        with open(path, "w", encoding="utf-8") as f:
            f.writelines(final_lines)
            
        return True
    except Exception as e:
        print(f"❌ 写入文件失败: {e}")
        print("💡 请尝试临时关闭杀毒软件/360/火绒等。")
        return False

def flush_dns():
    """刷新 DNS"""
    system = platform.system().lower()
    print("🔄 正在刷新系统 DNS 缓存...")
    try:
        if system == "windows":
            subprocess.run(["ipconfig", "/flushdns"], check=True, stdout=subprocess.DEVNULL)
        elif system == "darwin": # Mac
            subprocess.run(["sudo", "killall", "-HUP", "mDNSResponder"], check=True)
        elif system == "linux":
            # 尝试多种 Linux 刷新命令
            commands = [
                ["sudo", "resolvectl", "flush-caches"],
                ["sudo", "systemd-resolve", "--flush-caches"],
                ["sudo", "/etc/init.d/nscd", "restart"]
            ]
            for cmd in commands:
                try:
                    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                except:
                    continue
        print("✅ DNS 刷新完成！")
    except:
        print("⚠️  自动刷新 DNS 失败，建议手动重启浏览器或电脑。")

def main():
    print("=======================================")
    print("      GitHub Hosts 自动修复 (多源版)     ")
    print("=======================================")

    if not is_admin():
        print("\n⚠️  权限不足！")
        print("请右键脚本选择 [以管理员身份运行] (Windows)")
        print("或使用 sudo python3 运行 (Mac/Linux)")
        input("按回车退出...")
        sys.exit(1)

    # 1. 获取 Hosts
    content = fetch_best_hosts()
    if not content:
        sys.exit(1)
        
    # 2. 写入文件
    if update_hosts_file(content):
        # 3. 刷新 DNS
        flush_dns()
        print("\n🎉 修复完成！")
        print("👉 请打开 CMD/终端 测试: ping github.com")
        print("👉 如果浏览器依然打不开，请彻底关闭浏览器再重试。")
    
    print("\n此窗口将在 5 秒后关闭...")
    time.sleep(5)

if __name__ == "__main__":
    main()

